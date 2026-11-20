const { Op } = require('sequelize')
const {
  sequelize,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
  Category,
} = require('../models')
const { HttpError } = require('../middleware/errorHandler')
const { parsePagination } = require('./pagination')
const { isNonEmptyString, isBoolean, isNumber } = require('./validation')
const storage = require('./imageStorage')

const FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'stock',
  'description',
  'price',
  'price_with_discount',
  'category_ids',
  'images',
  'options',
]

const INCLUDE = [
  { model: ProductImage, as: 'images' },
  { model: ProductOption, as: 'options' },
  { model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } },
]

/* ------------------------------------------------------------------ */
/* Formatação da resposta                                              */
/* ------------------------------------------------------------------ */

function serializeOption(option) {
  return {
    id: option.id,
    title: option.title,
    shape: option.shape,
    radius: option.radius,
    type: option.type,
    values: option.values.split(','),
  }
}

/** Converte o model no formato de resposta definido na documentação */
function serialize(product, fields) {
  const data = {
    id: product.id,
    enabled: Boolean(product.enabled),
    name: product.name,
    slug: product.slug,
    stock: product.stock,
    description: product.description,
    price: product.price,
    price_with_discount: product.price_with_discount,
    category_ids: (product.categories || []).map((category) => category.id),
    images: (product.images || [])
      .sort((a, b) => a.id - b.id)
      .map((image) => ({ id: image.id, content: storage.toPublicUrl(image.path) })),
    options: (product.options || []).sort((a, b) => a.id - b.id).map(serializeOption),
  }

  if (!fields) return data
  return Object.fromEntries(fields.map((field) => [field, data[field]]))
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

/** Converte radius "4px" ou 4 em número inteiro */
function parseRadius(radius) {
  if (radius === undefined) return undefined
  const value = typeof radius === 'number' ? radius : parseInt(String(radius), 10)
  return Number.isInteger(value) && value >= 0 ? value : NaN
}

/** A documentação usa tanto "value" quanto "values" para a lista de opções */
function getOptionValues(option) {
  const values = option.values ?? option.value
  if (values === undefined) return undefined
  if (!Array.isArray(values) || values.length === 0) return null
  if (!values.every((value) => isNonEmptyString(String(value)))) return null
  return values.map((value) => String(value).trim()).join(',')
}

/**
 * Valida os campos do produto.
 * Na criação os campos obrigatórios precisam existir; na atualização
 * apenas os campos enviados são validados.
 */
function validateProduct(data, { partial }) {
  const errors = []
  const has = (field) => data[field] !== undefined

  if (!partial || has('name')) {
    if (!isNonEmptyString(data.name)) errors.push('name é obrigatório')
  }
  if (!partial || has('slug')) {
    if (!isNonEmptyString(data.slug)) errors.push('slug é obrigatório')
  }
  if (!partial || has('price')) {
    if (!isNumber(data.price) || data.price < 0) errors.push('price deve ser um número')
  }
  if (!partial || has('price_with_discount')) {
    if (!isNumber(data.price_with_discount) || data.price_with_discount < 0) {
      errors.push('price_with_discount deve ser um número')
    }
  }
  if (has('enabled') && !isBoolean(data.enabled)) errors.push('enabled deve ser boolean')
  if (has('stock') && (!Number.isInteger(data.stock) || data.stock < 0)) {
    errors.push('stock deve ser um número inteiro')
  }
  if (has('description') && data.description !== null && typeof data.description !== 'string') {
    errors.push('description deve ser texto')
  }
  if (has('category_ids')) {
    const ids = data.category_ids
    if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id) && id > 0)) {
      errors.push('category_ids deve ser uma lista de ids')
    }
  }
  if (has('images') && !Array.isArray(data.images)) errors.push('images deve ser uma lista')
  if (has('options') && !Array.isArray(data.options)) errors.push('options deve ser uma lista')

  return errors
}

/** Valida uma nova opção (sem id) */
function validateNewOption(option, index) {
  const errors = []
  const prefix = `options[${index}]`
  if (!isNonEmptyString(option.title)) errors.push(`${prefix}.title é obrigatório`)
  if (option.shape !== undefined && !['square', 'circle'].includes(option.shape)) {
    errors.push(`${prefix}.shape deve ser square ou circle`)
  }
  if (option.type !== undefined && !['text', 'color'].includes(option.type)) {
    errors.push(`${prefix}.type deve ser text ou color`)
  }
  if (Number.isNaN(parseRadius(option.radius))) errors.push(`${prefix}.radius inválido`)
  if (!getOptionValues(option)) errors.push(`${prefix}.values deve ser uma lista não vazia`)
  return errors
}

/** Monta os atributos de uma opção a partir do payload */
function optionAttributes(option) {
  const attributes = {}
  if (option.title !== undefined) attributes.title = option.title
  if (option.shape !== undefined) attributes.shape = option.shape
  if (option.type !== undefined) attributes.type = option.type
  const radius = parseRadius(option.radius)
  if (radius !== undefined) attributes.radius = radius
  const values = getOptionValues(option)
  if (values) attributes.values = values
  return attributes
}

function productAttributes(data) {
  const fields = [
    'enabled',
    'name',
    'slug',
    'stock',
    'description',
    'price',
    'price_with_discount',
  ]
  return Object.fromEntries(
    fields.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]),
  )
}

async function ensureCategoriesExist(ids, transaction) {
  const count = await Category.count({ where: { id: ids }, transaction })
  if (count !== new Set(ids).size) {
    throw new HttpError(400, 'Dados inválidos', ['category_ids contém categorias inexistentes'])
  }
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

/** Intersecção entre o filtro atual de ids e um novo conjunto de ids */
function intersect(current, ids) {
  const set = new Set(ids)
  return current === null ? [...set] : current.filter((id) => set.has(id))
}

async function search(query) {
  const { limit, page, fields, paging } = parsePagination(query, FIELDS)
  const errors = []
  const where = {}
  let productIds = null

  // match: termo que combine com o nome ou a descrição
  if (query.match !== undefined) {
    const term = `%${String(query.match)}%`
    where[Op.or] = [{ name: { [Op.like]: term } }, { description: { [Op.like]: term } }]
  }

  // category_ids=15,24
  if (query.category_ids !== undefined) {
    const ids = String(query.category_ids).split(',').map(Number)
    if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
      errors.push('category_ids deve ser uma lista de ids separados por vírgula')
    } else {
      const links = await ProductCategory.findAll({ where: { category_id: ids } })
      productIds = intersect(productIds, links.map((link) => link.product_id))
    }
  }

  // price-range=100-200
  if (query['price-range'] !== undefined) {
    const match = String(query['price-range']).match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/)
    if (!match || Number(match[1]) > Number(match[2])) {
      errors.push('price-range deve seguir o formato min-max. Ex.: 100-200')
    } else {
      where.price = { [Op.between]: [Number(match[1]), Number(match[2])] }
    }
  }

  // option[45]=GG,PP: produtos cuja opção 45 possua algum dos valores
  for (const [key, value] of Object.entries(query)) {
    const optionKey = key.match(/^option\[(\d+)\]$/)
    if (!optionKey) continue

    const wanted = String(value).split(',').map((item) => item.trim())
    const option = await ProductOption.findByPk(Number(optionKey[1]))
    const matches = option && option.values.split(',').some((item) => wanted.includes(item))
    productIds = intersect(productIds, matches ? [option.product_id] : [])
  }

  if (errors.length > 0) throw new HttpError(400, 'Parâmetros de busca inválidos', errors)
  if (productIds !== null) where.id = productIds

  const [products, total] = await Promise.all([
    Product.findAll({ where, include: INCLUDE, order: [['id', 'ASC']], ...paging }),
    Product.count({ where }),
  ])

  return {
    data: products.map((product) => serialize(product, fields)),
    total,
    limit,
    page,
  }
}

async function findById(id) {
  const product = await Product.findByPk(id, { include: INCLUDE })
  if (!product) throw new HttpError(404, 'Produto não encontrado')
  return serialize(product)
}

/* ------------------------------------------------------------------ */
/* Criação, atualização e remoção                                      */
/* ------------------------------------------------------------------ */

async function create(data) {
  const errors = validateProduct(data, { partial: false })
  const images = data.images || []
  const options = data.options || []

  if (Array.isArray(images)) {
    images.forEach((image, index) => {
      if (!storage.parseBase64Image(image?.type, image?.content)) {
        errors.push(`images[${index}] deve conter type e content em base64`)
      }
    })
  }
  if (Array.isArray(options)) {
    options.forEach((option, index) => errors.push(...validateNewOption(option || {}, index)))
  }
  if (errors.length > 0) throw new HttpError(400, 'Dados inválidos', errors)

  const savedFiles = []
  try {
    const productId = await sequelize.transaction(async (transaction) => {
      const product = await Product.create(productAttributes(data), { transaction })

      if (data.category_ids?.length) {
        await ensureCategoriesExist(data.category_ids, transaction)
        await product.setCategories(data.category_ids, { transaction })
      }

      for (const image of images) {
        const filePath = await storage.saveImage(
          product.id,
          storage.parseBase64Image(image.type, image.content),
        )
        savedFiles.push(filePath)
        await ProductImage.create(
          { product_id: product.id, enabled: true, path: filePath },
          { transaction },
        )
      }

      for (const option of options) {
        await ProductOption.create(
          { product_id: product.id, ...optionAttributes(option) },
          { transaction },
        )
      }

      return product.id
    })

    return findById(productId)
  } catch (error) {
    // Remove os arquivos gravados caso a transação falhe
    await Promise.all(savedFiles.map(storage.deleteImage))
    throw error
  }
}

/** Aplica as alterações de imagens enviadas no PUT */
async function updateImages(product, images, transaction, files) {
  const current = await ProductImage.findAll({ where: { product_id: product.id }, transaction })
  const byId = new Map(current.map((image) => [image.id, image]))

  for (const [index, image] of images.entries()) {
    if (!image || typeof image !== 'object') {
      throw new HttpError(400, 'Dados inválidos', [`images[${index}] inválido`])
    }

    // Imagem nova
    if (image.id === undefined) {
      const parsed = storage.parseBase64Image(image.type, image.content)
      if (!parsed) {
        throw new HttpError(400, 'Dados inválidos', [
          `images[${index}] deve conter type e content em base64`,
        ])
      }
      const filePath = await storage.saveImage(product.id, parsed)
      files.created.push(filePath)
      await ProductImage.create(
        { product_id: product.id, enabled: true, path: filePath },
        { transaction },
      )
      continue
    }

    const existing = byId.get(image.id)
    if (!existing) {
      throw new HttpError(400, 'Dados inválidos', [
        `images[${index}] não pertence a este produto`,
      ])
    }

    // Remover imagem existente
    if (image.deleted === true) {
      files.removed.push(existing.path)
      await existing.destroy({ transaction })
      continue
    }

    // Quando o content é uma URL, a imagem permanece como está
    if (typeof image.content !== 'string' || /^https?:\/\//.test(image.content)) continue

    // Substituir o arquivo da imagem por um novo base64
    const extension = existing.path.split('.').pop()
    const type = image.type || (extension === 'jpg' ? 'image/jpeg' : `image/${extension}`)
    const parsed = storage.parseBase64Image(type, image.content)
    if (!parsed) {
      throw new HttpError(400, 'Dados inválidos', [`images[${index}].content inválido`])
    }
    const filePath = await storage.saveImage(product.id, parsed)
    files.created.push(filePath)
    files.removed.push(existing.path)
    await existing.update({ path: filePath }, { transaction })
  }
}

/** Aplica as alterações de opções enviadas no PUT */
async function updateOptions(product, options, transaction) {
  const current = await ProductOption.findAll({ where: { product_id: product.id }, transaction })
  const byId = new Map(current.map((option) => [option.id, option]))

  for (const [index, option] of options.entries()) {
    if (!option || typeof option !== 'object') {
      throw new HttpError(400, 'Dados inválidos', [`options[${index}] inválido`])
    }

    // Opção nova
    if (option.id === undefined) {
      const errors = validateNewOption(option, index)
      if (errors.length > 0) throw new HttpError(400, 'Dados inválidos', errors)
      await ProductOption.create(
        { product_id: product.id, ...optionAttributes(option) },
        { transaction },
      )
      continue
    }

    const existing = byId.get(option.id)
    if (!existing) {
      throw new HttpError(400, 'Dados inválidos', [
        `options[${index}] não pertence a este produto`,
      ])
    }

    if (option.deleted === true) {
      await existing.destroy({ transaction })
      continue
    }

    // Atualização parcial: valida apenas os campos enviados
    const errors = validateNewOption({ ...serializeOption(existing), ...option }, index)
    if (errors.length > 0) throw new HttpError(400, 'Dados inválidos', errors)
    await existing.update(optionAttributes(option), { transaction })
  }
}

async function update(id, data) {
  const errors = validateProduct(data, { partial: true })
  if (errors.length > 0) throw new HttpError(400, 'Dados inválidos', errors)

  const product = await Product.findByPk(id)
  if (!product) throw new HttpError(404, 'Produto não encontrado')

  const files = { created: [], removed: [] }
  try {
    await sequelize.transaction(async (transaction) => {
      await product.update(productAttributes(data), { transaction })

      if (data.category_ids !== undefined) {
        await ensureCategoriesExist(data.category_ids, transaction)
        await product.setCategories(data.category_ids, { transaction })
      }
      if (data.images !== undefined) {
        await updateImages(product, data.images, transaction, files)
      }
      if (data.options !== undefined) {
        await updateOptions(product, data.options, transaction)
      }
    })
  } catch (error) {
    await Promise.all(files.created.map(storage.deleteImage))
    throw error
  }

  // Arquivos substituídos ou removidos só são apagados depois do commit
  await Promise.all(files.removed.map(storage.deleteImage))
}

async function remove(id) {
  const deleted = await Product.destroy({ where: { id } })
  if (!deleted) throw new HttpError(404, 'Produto não encontrado')
  await storage.deleteProductFolder(id)
}

module.exports = { search, findById, create, update, remove }
