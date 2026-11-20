const { Category } = require('../models')
const { HttpError } = require('../middleware/errorHandler')
const { parsePagination, parseBooleanQuery } = require('./pagination')
const { isNonEmptyString, isBoolean } = require('./validation')

const FIELDS = ['id', 'name', 'slug', 'use_in_menu']

function validate({ name, slug, use_in_menu }) {
  const errors = []
  if (!isNonEmptyString(name)) errors.push('name é obrigatório')
  if (!isNonEmptyString(slug)) errors.push('slug é obrigatório')
  if (use_in_menu !== undefined && !isBoolean(use_in_menu)) {
    errors.push('use_in_menu deve ser boolean')
  }
  if (errors.length > 0) throw new HttpError(400, 'Dados inválidos', errors)
}

async function search(query) {
  const { limit, page, fields, paging } = parsePagination(query, FIELDS)

  const where = {}
  if (query.use_in_menu !== undefined) {
    const useInMenu = parseBooleanQuery(query.use_in_menu)
    if (useInMenu === undefined) {
      throw new HttpError(400, 'Parâmetros de busca inválidos', [
        'use_in_menu deve ser true ou false',
      ])
    }
    where.use_in_menu = useInMenu
  }

  const [data, total] = await Promise.all([
    Category.findAll({ where, attributes: fields || FIELDS, order: [['id', 'ASC']], ...paging }),
    Category.count({ where }),
  ])

  return { data, total, limit, page }
}

async function findById(id) {
  const category = await Category.findByPk(id, { attributes: FIELDS })
  if (!category) throw new HttpError(404, 'Categoria não encontrada')
  return category
}

async function create(data) {
  validate(data)
  const category = await Category.create({
    name: data.name,
    slug: data.slug,
    use_in_menu: Boolean(data.use_in_menu),
  })
  return findById(category.id)
}

async function update(id, data) {
  validate(data)
  const category = await Category.findByPk(id)
  if (!category) throw new HttpError(404, 'Categoria não encontrada')

  await category.update({
    name: data.name,
    slug: data.slug,
    use_in_menu: data.use_in_menu === undefined ? category.use_in_menu : Boolean(data.use_in_menu),
  })
}

async function remove(id) {
  const deleted = await Category.destroy({ where: { id } })
  if (!deleted) throw new HttpError(404, 'Categoria não encontrada')
}

module.exports = { search, findById, create, update, remove }
