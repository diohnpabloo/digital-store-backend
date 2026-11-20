const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')

// Pasta pública onde as imagens ficam salvas (servida em /media)
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public')

const EXTENSIONS = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/**
 * Lê o tipo e o conteúdo de uma imagem em base64.
 * Aceita base64 puro ou no formato data URI ("data:image/png;base64,...").
 * Retorna null quando os dados são inválidos.
 */
function parseBase64Image(type, content) {
  if (typeof content !== 'string') return null

  let mimeType = type
  let data = content
  const dataUri = content.match(/^data:([\w/+.-]+);base64,(.*)$/s)
  if (dataUri) {
    mimeType = mimeType || dataUri[1]
    data = dataUri[2]
  }

  const extension = EXTENSIONS[mimeType]
  if (!extension || !/^[A-Za-z0-9+/=\s]+$/.test(data)) return null

  const buffer = Buffer.from(data, 'base64')
  return buffer.length > 0 ? { buffer, extension } : null
}

/** Salva a imagem e retorna o caminho relativo (ex.: media/product-1/abc.png) */
async function saveImage(productId, { buffer, extension }) {
  const relativePath = path.posix.join(
    'media',
    `product-${productId}`,
    `${crypto.randomUUID()}.${extension}`,
  )
  const absolutePath = path.join(PUBLIC_DIR, relativePath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, buffer)
  return relativePath
}

async function deleteImage(relativePath) {
  await fs.rm(path.join(PUBLIC_DIR, relativePath), { force: true })
}

async function deleteProductFolder(productId) {
  await fs.rm(path.join(PUBLIC_DIR, 'media', `product-${productId}`), {
    recursive: true,
    force: true,
  })
}

/** Monta a URL pública de uma imagem a partir do caminho salvo no banco */
function toPublicUrl(relativePath) {
  const baseUrl = (process.env.APP_URL || '').replace(/\/$/, '')
  return `${baseUrl}/${relativePath}`
}

module.exports = {
  PUBLIC_DIR,
  parseBase64Image,
  saveImage,
  deleteImage,
  deleteProductFolder,
  toPublicUrl,
}
