const { app, request, sequelize, resetDatabase, authHeader } = require('./helpers')

describe('Categorias', () => {
  let auth

  beforeAll(async () => {
    await resetDatabase()
    auth = await authHeader()
  })

  afterAll(() => sequelize.close())

  describe('POST /v1/category', () => {
    it('retorna 401 sem token', async () => {
      const res = await request(app).post('/v1/category').send({ name: 'Shoes', slug: 'shoes' })
      expect(res.status).toBe(401)
    })

    it('cadastra categorias e retorna 201', async () => {
      const categories = [
        { name: 'Shoes', slug: 'shoes', use_in_menu: true },
        { name: 'Offers', slug: 'offers', use_in_menu: true },
        { name: 'Black Friday', slug: 'black-friday', use_in_menu: false },
      ]
      for (const category of categories) {
        const res = await request(app).post('/v1/category').set(auth).send(category)
        expect(res.status).toBe(201)
        expect(res.body).toMatchObject(category)
      }
    })

    it('retorna 400 quando faltam campos obrigatórios', async () => {
      const res = await request(app).post('/v1/category').set(auth).send({ name: 'Sem slug' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /v1/category/search', () => {
    it('retorna a lista paginada com padrão limit 12 e page 1', async () => {
      const res = await request(app).get('/v1/category/search')
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ total: 3, limit: 12, page: 1 })
      expect(res.body.data).toHaveLength(3)
    })

    it('aplica limit e page', async () => {
      const res = await request(app).get('/v1/category/search?limit=2&page=2')
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].slug).toBe('black-friday')
      expect(res.body.total).toBe(3)
    })

    it('retorna todos os itens com limit=-1', async () => {
      const res = await request(app).get('/v1/category/search?limit=-1')
      expect(res.body).toMatchObject({ limit: -1, total: 3 })
      expect(res.body.data).toHaveLength(3)
    })

    it('limita os campos com fields', async () => {
      const res = await request(app).get('/v1/category/search?fields=name,slug')
      expect(Object.keys(res.body.data[0])).toEqual(['name', 'slug'])
    })

    it('filtra por use_in_menu', async () => {
      const res = await request(app).get('/v1/category/search?use_in_menu=true')
      expect(res.body.total).toBe(2)
      expect(res.body.data.every((category) => category.use_in_menu)).toBe(true)
    })

    it('retorna 400 com parâmetros inválidos', async () => {
      expect((await request(app).get('/v1/category/search?limit=abc')).status).toBe(400)
      expect((await request(app).get('/v1/category/search?fields=senha')).status).toBe(400)
    })
  })

  describe('GET /v1/category/:id', () => {
    it('retorna 200 com a categoria', async () => {
      const res = await request(app).get('/v1/category/1')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ id: 1, name: 'Shoes', slug: 'shoes', use_in_menu: true })
    })

    it('retorna 404 quando não existe', async () => {
      expect((await request(app).get('/v1/category/999')).status).toBe(404)
    })
  })

  describe('PUT /v1/category/:id', () => {
    const data = { name: 'Tênis', slug: 'tenis', use_in_menu: true }

    it('retorna 401 sem token', async () => {
      expect((await request(app).put('/v1/category/1').send(data)).status).toBe(401)
    })

    it('retorna 204 e atualiza a categoria', async () => {
      const res = await request(app).put('/v1/category/1').set(auth).send(data)
      expect(res.status).toBe(204)
      expect((await request(app).get('/v1/category/1')).body.slug).toBe('tenis')
    })

    it('retorna 400 com dados incorretos', async () => {
      const res = await request(app).put('/v1/category/1').set(auth).send({ name: '' })
      expect(res.status).toBe(400)
    })

    it('retorna 404 quando não existe', async () => {
      expect((await request(app).put('/v1/category/999').set(auth).send(data)).status).toBe(404)
    })
  })

  describe('DELETE /v1/category/:id', () => {
    it('retorna 401 sem token', async () => {
      expect((await request(app).delete('/v1/category/3')).status).toBe(401)
    })

    it('retorna 204 e remove a categoria', async () => {
      expect((await request(app).delete('/v1/category/3').set(auth)).status).toBe(204)
      expect((await request(app).get('/v1/category/3')).status).toBe(404)
    })

    it('retorna 404 quando não existe', async () => {
      expect((await request(app).delete('/v1/category/3').set(auth)).status).toBe(404)
    })
  })
})
