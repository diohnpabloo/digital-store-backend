const { app, request, sequelize, resetDatabase, authHeader } = require('./helpers')

const newUser = {
  firstname: 'Maria',
  surname: 'Silva',
  email: 'maria@mail.com',
  password: '123@123',
  confirmPassword: '123@123',
}

describe('Usuários', () => {
  let auth

  beforeAll(async () => {
    await resetDatabase()
    auth = await authHeader()
  })

  afterAll(() => sequelize.close())

  describe('POST /v1/user', () => {
    it('cadastra o usuário e retorna 201 sem a senha', async () => {
      const res = await request(app).post('/v1/user').send(newUser)
      expect(res.status).toBe(201)
      expect(res.body).toEqual({
        id: expect.any(Number),
        firstname: 'Maria',
        surname: 'Silva',
        email: 'maria@mail.com',
      })
    })

    it('retorna 400 quando o email já existe', async () => {
      const res = await request(app).post('/v1/user').send(newUser)
      expect(res.status).toBe(400)
    })

    it('retorna 400 quando as senhas não conferem', async () => {
      const res = await request(app)
        .post('/v1/user')
        .send({ ...newUser, email: 'outro@mail.com', confirmPassword: 'diferente' })
      expect(res.status).toBe(400)
    })

    it('retorna 400 quando faltam campos obrigatórios', async () => {
      const res = await request(app).post('/v1/user').send({ email: 'x@mail.com' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /v1/user/token', () => {
    it('retorna 200 com o token JWT', async () => {
      const res = await request(app)
        .post('/v1/user/token')
        .send({ email: newUser.email, password: newUser.password })
      expect(res.status).toBe(200)
      expect(res.body.token).toEqual(expect.any(String))
    })

    it('retorna 400 com senha incorreta', async () => {
      const res = await request(app)
        .post('/v1/user/token')
        .send({ email: newUser.email, password: 'errada' })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /v1/user/:id', () => {
    it('retorna 200 com os dados do usuário', async () => {
      const res = await request(app).get('/v1/user/2')
      expect(res.status).toBe(200)
      expect(res.body.email).toBe('maria@mail.com')
      expect(res.body.password).toBeUndefined()
    })

    it('retorna 404 quando o usuário não existe', async () => {
      const res = await request(app).get('/v1/user/999')
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /v1/user/:id', () => {
    const data = { firstname: 'Maria', surname: 'Souza', email: 'maria@mail.com' }

    it('retorna 401 sem token', async () => {
      const res = await request(app).put('/v1/user/2').send(data)
      expect(res.status).toBe(401)
    })

    it('retorna 401 com token inválido', async () => {
      const res = await request(app)
        .put('/v1/user/2')
        .set('Authorization', 'Bearer token-invalido')
        .send(data)
      expect(res.status).toBe(401)
    })

    it('retorna 204 e atualiza o usuário', async () => {
      const res = await request(app).put('/v1/user/2').set(auth).send(data)
      expect(res.status).toBe(204)
      expect(res.body).toEqual({})
      const updated = await request(app).get('/v1/user/2')
      expect(updated.body.surname).toBe('Souza')
    })

    it('retorna 400 com dados incorretos', async () => {
      const res = await request(app)
        .put('/v1/user/2')
        .set(auth)
        .send({ ...data, email: 'invalido' })
      expect(res.status).toBe(400)
    })

    it('retorna 404 quando o usuário não existe', async () => {
      const res = await request(app).put('/v1/user/999').set(auth).send(data)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /v1/user/:id', () => {
    it('retorna 401 sem token', async () => {
      const res = await request(app).delete('/v1/user/2')
      expect(res.status).toBe(401)
    })

    it('retorna 204 e remove o usuário', async () => {
      const res = await request(app).delete('/v1/user/2').set(auth)
      expect(res.status).toBe(204)
      expect((await request(app).get('/v1/user/2')).status).toBe(404)
    })

    it('retorna 404 quando o usuário não existe', async () => {
      const res = await request(app).delete('/v1/user/2').set(auth)
      expect(res.status).toBe(404)
    })
  })
})
