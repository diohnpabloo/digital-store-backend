const { ValidationError, UniqueConstraintError } = require('sequelize')

/**
 * Erro com status HTTP. Lançado pelos services e convertido em resposta
 * pelo middleware errorHandler.
 */
class HttpError extends Error {
  constructor(status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

/** Responde 404 para rotas que não existem */
function notFound(req, res) {
  res.status(404).json({ message: 'Recurso não encontrado' })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { message: err.message }
    if (err.errors) body.errors = err.errors
    return res.status(err.status).json(body)
  }

  // JSON malformado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido' })
  }

  if (err instanceof UniqueConstraintError || err instanceof ValidationError) {
    return res.status(400).json({
      message: 'Dados inválidos',
      errors: err.errors.map((error) => error.message),
    })
  }

  console.error(err)
  return res.status(500).json({ message: 'Erro interno do servidor' })
}

module.exports = { HttpError, notFound, errorHandler }
