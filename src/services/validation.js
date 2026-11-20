/** Funções auxiliares de validação usadas pelos services */

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== ''

const isBoolean = (value) => typeof value === 'boolean' || value === 0 || value === 1

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const isEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

/** Converte o :id da rota em inteiro positivo ou retorna null */
function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

module.exports = { isNonEmptyString, isBoolean, isNumber, isEmail, parseId }
