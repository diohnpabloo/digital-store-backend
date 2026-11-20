const categoryService = require('../services/categoryService')
const { HttpError } = require('../middleware/errorHandler')
const { parseId } = require('../services/validation')

function getId(req) {
  const id = parseId(req.params.id)
  if (!id) throw new HttpError(404, 'Categoria não encontrada')
  return id
}

async function search(req, res) {
  res.status(200).json(await categoryService.search(req.query))
}

async function show(req, res) {
  res.status(200).json(await categoryService.findById(getId(req)))
}

async function store(req, res) {
  res.status(201).json(await categoryService.create(req.body || {}))
}

async function update(req, res) {
  await categoryService.update(getId(req), req.body || {})
  res.status(204).end()
}

async function destroy(req, res) {
  await categoryService.remove(getId(req))
  res.status(204).end()
}

module.exports = { search, show, store, update, destroy }
