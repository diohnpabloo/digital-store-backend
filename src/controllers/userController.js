const userService = require('../services/userService')
const { HttpError } = require('../middleware/errorHandler')
const { parseId } = require('../services/validation')

/** Lê o :id da rota; ids inválidos são tratados como recurso inexistente */
function getId(req) {
  const id = parseId(req.params.id)
  if (!id) throw new HttpError(404, 'Usuário não encontrado')
  return id
}

async function show(req, res) {
  res.status(200).json(await userService.findById(getId(req)))
}

async function store(req, res) {
  res.status(201).json(await userService.create(req.body || {}))
}

async function update(req, res) {
  await userService.update(getId(req), req.body || {})
  res.status(204).end()
}

async function destroy(req, res) {
  await userService.remove(getId(req))
  res.status(204).end()
}

async function token(req, res) {
  res.status(200).json(await userService.generateToken(req.body || {}))
}

module.exports = { show, store, update, destroy, token }
