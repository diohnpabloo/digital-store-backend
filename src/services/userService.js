const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
const { User } = require('../models')
const { HttpError } = require('../middleware/errorHandler')
const { isNonEmptyString, isEmail } = require('./validation')

const PUBLIC_FIELDS = ['id', 'firstname', 'surname', 'email']

/** Valida firstname, surname e email (usados no cadastro e na atualização) */
function validateProfile({ firstname, surname, email }) {
  const errors = []
  if (!isNonEmptyString(firstname)) errors.push('firstname é obrigatório')
  if (!isNonEmptyString(surname)) errors.push('surname é obrigatório')
  if (!isEmail(email)) errors.push('email inválido')
  return errors
}

async function ensureEmailIsFree(email, ignoreId) {
  const where = { email }
  if (ignoreId) where.id = { [Op.ne]: ignoreId }
  if (await User.findOne({ where })) {
    throw new HttpError(400, 'Dados inválidos', ['email já cadastrado'])
  }
}

async function findById(id) {
  const user = await User.findByPk(id, { attributes: PUBLIC_FIELDS })
  if (!user) throw new HttpError(404, 'Usuário não encontrado')
  return user
}

async function create(data) {
  const errors = validateProfile(data)
  if (!isNonEmptyString(data.password)) errors.push('password é obrigatório')
  if (data.password !== data.confirmPassword) {
    errors.push('password e confirmPassword devem ser iguais')
  }
  if (errors.length > 0) throw new HttpError(400, 'Dados inválidos', errors)

  await ensureEmailIsFree(data.email)

  const user = await User.create({
    firstname: data.firstname,
    surname: data.surname,
    email: data.email,
    password: await bcrypt.hash(data.password, 10),
  })

  return findById(user.id)
}

async function update(id, data) {
  const errors = validateProfile(data)
  if (errors.length > 0) throw new HttpError(400, 'Dados inválidos', errors)

  const user = await User.findByPk(id)
  if (!user) throw new HttpError(404, 'Usuário não encontrado')

  await ensureEmailIsFree(data.email, id)
  await user.update({
    firstname: data.firstname,
    surname: data.surname,
    email: data.email,
  })
}

async function remove(id) {
  const deleted = await User.destroy({ where: { id } })
  if (!deleted) throw new HttpError(404, 'Usuário não encontrado')
}

/** Gera o token JWT a partir do email e senha */
async function generateToken({ email, password }) {
  if (!isEmail(email) || !isNonEmptyString(password)) {
    throw new HttpError(400, 'Email e senha são obrigatórios')
  }

  const user = await User.findOne({ where: { email } })
  const validPassword = user && (await bcrypt.compare(password, user.password))
  if (!validPassword) throw new HttpError(400, 'Email ou senha inválidos')

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  })
  return { token }
}

module.exports = { findById, create, update, remove, generateToken }
