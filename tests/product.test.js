const fs = require('fs')
const path = require('path')
const {
  app,
  request,
  sequelize,
  resetDatabase,
  authHeader,
  PNG_BASE64,
} = require('./helpers')
const { PUBLIC_DIR, deleteProductFolder } = require('../src/services/imageStorage')

const productPayload = (overrides = {}) => ({
  enabled: true,
  name: 'Tênis K-Swiss V8',
  slug: 'tenis-k-swiss-v8',
  stock: 10,
  description: 'Tênis masculino',
  price: 200,
  price_with_discount: 100,
  category_ids: [1],
  images: [
    { type: 'image/png', content: PNG_BASE64 },
    { type: 'image/png', content: `data:image/png;base64,${PNG_BASE64}` },
  ],
  options: [
    { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', value: ['39', '40', '41'] },
    { title: 'Cor', shape: 'circle', type: 'color', values: ['#000', '#333'] },
  ],
  ...overrides,
})

describe('Produtos', () => {
  let auth
  const createdIds = []

  beforeAll(async () => {
    await resetDatabase()
    auth = await authHeader()
    await request(app).post('/v1/category').set(auth).send({ name: 'Tênis', slug: 'tenis' })
    await request(app).post('/v1/category').set(auth).send({ name: 'Bonés', slug: 'bones' })
  })

  afterAll(async () => {
    await Promise.all(createdIds.map(deleteProductFolder))
    await sequelize.close()
  })

  describe('POST /v1/product', () => {
    it('retorna 401 sem token', async () => {
      expect((await request(app).post('/v1/product').send(productPayload())).status).toBe(401)
    })

    it('cadastra o produto com imagens, opções e categorias', async () => {
      const res = await request(app).post('/v1/product').set(auth).send(productPayload())
      expect(res.status).toBe(201)
      createdIds.push(res.body.id)

      expect(res.body).toMatchObject({
        enabled: true,
        name: 'Tênis K-Swiss V8',
        price: 200,
        price_with_discount: 100,
        category_ids: [1],
      })
      expect(res.body.images).toHaveLength(2)
      expect(res.body.options).toEqual([
        { id: 1, title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: ['39', '40', '41'] },
        { id: 2, title: 'Cor', shape: 'circle', radius: 0, type: 'color', values: ['#000', '#333'] },
      ])

      // A imagem foi salva no servidor e é acessível pela URL retornada
      const url = new URL(res.body.images[0].content)
      expect(fs.existsSync(path.join(PUBLIC_DIR, url.pathname))).toBe(true)
      expect((await request(app).get(url.pathname)).status).toBe(200)
    })

    it('cadastra um segundo produto sem imagens', async () => {
      const res = await request(app)
        .post('/v1/product')
        .set(auth)
        .send(
          productPayload({
            name: 'Boné Nike',
            slug: 'bone-nike',
            description: 'Boné casual',
            price: 50,
            price_with_discount: 40,
            category_ids: [2],
            images: [],
            options: [{ title: 'Tamanho', values: ['P', 'M'] }],
          }),
        )
      expect(res.status).toBe(201)
      createdIds.push(res.body.id)
    })

    it('retorna 400 com dados incorretos', async () => {
      const invalid = [
        { name: '' },
        { price: 'caro' },
        { category_ids: [999] },
        { images: [{ type: 'image/png', content: '%%%' }] },
        { options: [{ title: 'Sem valores' }] },
        { options: [{ title: 'Formato', shape: 'triangle', values: ['a'] }] },
      ]
      for (const overrides of invalid) {
        const res = await request(app).post('/v1/product').set(auth).send(productPayload(overrides))
        expect(res.status).toBe(400)
      }
    })
  })

  describe('GET /v1/product/:id', () => {
    it('retorna 200 com o produto', async () => {
      const res = await request(app).get('/v1/product/1')
      expect(res.status).toBe(200)
      expect(res.body.slug).toBe('tenis-k-swiss-v8')
    })

    it('retorna 404 quando não existe', async () => {
      expect((await request(app).get('/v1/product/999')).status).toBe(404)
    })
  })

  describe('GET /v1/product/search', () => {
    it('retorna a lista paginada', async () => {
      const res = await request(app).get('/v1/product/search')
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ total: 2, limit: 12, page: 1 })
    })

    it('aplica limit, page e fields', async () => {
      const res = await request(app).get('/v1/product/search?limit=1&page=2&fields=name,price')
      expect(res.body.data).toEqual([{ name: 'Boné Nike', price: 50 }])
    })

    it('filtra por match no nome ou descrição', async () => {
      const byName = await request(app).get(`/v1/product/search?match=${encodeURIComponent('Tênis')}`)
      expect(byName.body.data.map((product) => product.id)).toEqual([1])
      const byDescription = await request(app).get('/v1/product/search?match=casual')
      expect(byDescription.body.data.map((product) => product.id)).toEqual([2])
    })

    it('filtra por category_ids', async () => {
      const res = await request(app).get('/v1/product/search?category_ids=2')
      expect(res.body.data.map((product) => product.id)).toEqual([2])
    })

    it('filtra por price-range', async () => {
      const res = await request(app).get('/v1/product/search?price-range=100-200')
      expect(res.body.data.map((product) => product.id)).toEqual([1])
    })

    it('filtra pelos valores de uma opção', async () => {
      const found = await request(app).get('/v1/product/search?option[1]=40,42')
      expect(found.body.data.map((product) => product.id)).toEqual([1])
      const notFound = await request(app).get('/v1/product/search?option[1]=GG')
      expect(notFound.body.total).toBe(0)
    })

    it('retorna 400 com parâmetros inválidos', async () => {
      expect((await request(app).get('/v1/product/search?price-range=abc')).status).toBe(400)
      expect((await request(app).get('/v1/product/search?category_ids=x')).status).toBe(400)
    })
  })

  describe('PUT /v1/product/:id', () => {
    it('retorna 401 sem token', async () => {
      expect((await request(app).put('/v1/product/1').send({ stock: 1 })).status).toBe(401)
    })

    it('atualiza dados, imagens e opções e retorna 204', async () => {
      const before = (await request(app).get('/v1/product/1')).body

      const res = await request(app)
        .put('/v1/product/1')
        .set(auth)
        .send({
          name: 'Tênis K-Swiss V8 atualizado',
          stock: 20,
          price: 49.9,
          price_with_discount: 0,
          category_ids: [1, 2],
          images: [
            { type: 'image/png', content: PNG_BASE64 },
            { id: before.images[1].id, deleted: true },
            { id: before.images[0].id, content: before.images[0].content },
          ],
          options: [
            { id: 2, deleted: true },
            { id: 1, radius: '10px', value: ['42/43', '44/45'] },
            { title: 'Tipo', shape: 'square', type: 'text', values: ['100% algodão'] },
          ],
        })
      expect(res.status).toBe(204)

      const after = (await request(app).get('/v1/product/1')).body
      expect(after).toMatchObject({
        name: 'Tênis K-Swiss V8 atualizado',
        stock: 20,
        price: 49.9,
        price_with_discount: 0,
        category_ids: [1, 2],
      })
      expect(after.images).toHaveLength(2)
      expect(after.images[0]).toEqual(before.images[0])
      expect(after.options).toEqual([
        { id: 1, title: 'Tamanho', shape: 'square', radius: 10, type: 'text', values: ['42/43', '44/45'] },
        { id: expect.any(Number), title: 'Tipo', shape: 'square', radius: 0, type: 'text', values: ['100% algodão'] },
      ])

      // O arquivo da imagem removida foi apagado do servidor
      const removed = new URL(before.images[1].content).pathname
      expect(fs.existsSync(path.join(PUBLIC_DIR, removed))).toBe(false)
    })

    it('retorna 400 com dados incorretos e não altera o produto', async () => {
      const res = await request(app)
        .put('/v1/product/1')
        .set(auth)
        .send({ stock: 5, options: [{ id: 999, deleted: true }] })
      expect(res.status).toBe(400)
      expect((await request(app).get('/v1/product/1')).body.stock).toBe(20)
    })

    it('retorna 404 quando não existe', async () => {
      expect((await request(app).put('/v1/product/999').set(auth).send({ stock: 1 })).status).toBe(404)
    })
  })

  describe('DELETE /v1/product/:id', () => {
    it('retorna 401 sem token', async () => {
      expect((await request(app).delete('/v1/product/1')).status).toBe(401)
    })

    it('retorna 204 e remove o produto e suas imagens', async () => {
      expect((await request(app).delete('/v1/product/1').set(auth)).status).toBe(204)
      expect((await request(app).get('/v1/product/1')).status).toBe(404)
      expect(fs.existsSync(path.join(PUBLIC_DIR, 'media', 'product-1'))).toBe(false)
    })

    it('retorna 404 quando não existe', async () => {
      expect((await request(app).delete('/v1/product/1').set(auth)).status).toBe(404)
    })
  })

  describe('Rotas e corpo inválidos', () => {
    it('retorna 404 para rota inexistente', async () => {
      expect((await request(app).get('/v1/nada')).status).toBe(404)
    })

    it('retorna 400 para JSON malformado', async () => {
      const res = await request(app)
        .post('/v1/user')
        .set('Content-Type', 'application/json')
        .send('{"email":')
      expect(res.status).toBe(400)
    })
  })
})
