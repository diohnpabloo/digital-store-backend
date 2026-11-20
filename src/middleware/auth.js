const jwt = require('jsonwebtoken')

/**
 * Valida o cabeçalho "Authorization: Bearer <jwt>".
 * Responde 401 quando o token não é enviado ou é inválido.
 */
function auth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token de autorização não informado' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    return next()
  } catch {
    return res.status(401).json({ message: 'Token de autorização inválido' })
  }
}

module.exports = auth
