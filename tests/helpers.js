const request = require('supertest')
const app = require('../src/app')
const { sequelize } = require('../src/models')

// Imagem PNG 1x1 em base64 usada nos testes de upload
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/** Limpa todas as tabelas do banco de testes */
async function resetDatabase() {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of [
    'product_categories',
    'product_options',
    'product_images',
    'products',
    'categories',
    'users',
  ]) {
    await sequelize.query(`TRUNCATE TABLE ${table}`)
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
}

/** Cria um usuário e retorna o cabeçalho de autorização com o JWT */
async function authHeader(email = 'admin@mail.com') {
  await request(app).post('/v1/user').send({
    firstname: 'Admin',
    surname: 'Teste',
    email,
    password: '123@123',
    confirmPassword: '123@123',
  })
  const { body } = await request(app)
    .post('/v1/user/token')
    .send({ email, password: '123@123' })
  return { Authorization: `Bearer ${body.token}` }
}

module.exports = { app, request, sequelize, resetDatabase, authHeader, PNG_BASE64 }
