const { HttpError } = require('../middleware/errorHandler')

/**
 * Lê os parâmetros "limit", "page" e "fields" da query string.
 * - limit: padrão 12, use -1 para retornar todos os itens
 * - page: padrão 1 (ignorado quando limit = -1)
 * - fields: lista de campos separados por vírgula
 */
function parsePagination(query, allowedFields) {
  const errors = []

  const limit = query.limit === undefined ? 12 : Number(query.limit)
  if (!Number.isInteger(limit) || (limit < 1 && limit !== -1)) {
    errors.push('limit deve ser um número inteiro maior que 0 ou -1')
  }

  const page = query.page === undefined ? 1 : Number(query.page)
  if (!Number.isInteger(page) || page < 1) {
    errors.push('page deve ser um número inteiro maior que 0')
  }

  let fields = null
  if (query.fields !== undefined) {
    fields = String(query.fields)
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean)
    const invalid = fields.filter((field) => !allowedFields.includes(field))
    if (fields.length === 0 || invalid.length > 0) {
      errors.push(`fields aceita apenas: ${allowedFields.join(', ')}`)
    }
  }

  if (errors.length > 0) {
    throw new HttpError(400, 'Parâmetros de busca inválidos', errors)
  }

  const paging = limit === -1 ? {} : { limit, offset: (page - 1) * limit }
  return { limit, page, fields, paging }
}

/** Converte "true"/"1"/"false"/"0" em boolean ou retorna undefined */
function parseBooleanQuery(value) {
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return undefined
}

module.exports = { parsePagination, parseBooleanQuery }
