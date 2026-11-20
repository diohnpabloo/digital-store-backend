const productService = require('../services/productService')
const { HttpError } = require('../middleware/errorHandler')
const { parseId } = require('../services/validation')

function getId(req) {
  const id = parseId(req.params.id)
  if (!id) throw new HttpError(404, 'Produto não encontrado')
  return id
}

async function search(req, res) {
  res.status(200).json(await productService.search(req.query))
}

async function show(req, res) {
  res.status(200).json(await productService.findById(getId(req)))
}

async function store(req, res) {
  res.status(201).json(await productService.create(req.body || {}))
}

async function update(req, res) {
  await productService.update(getId(req), req.body || {})
  res.status(204).end()
}

async function destroy(req, res) {
  await productService.remove(getId(req))
  res.status(204).end()
}

module.exports = { search, show, store, update, destroy }
