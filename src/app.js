require('dotenv').config({ quiet: true })

const path = require('path')
const express = require('express')
const cors = require('cors')
const swaggerUi = require('swagger-ui-express')
const routes = require('./routes')
const swaggerDocument = require('./config/swagger')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

app.use(cors())
// Limite maior para permitir o envio de imagens em base64
app.use(express.json({ limit: '20mb' }))

// Imagens dos produtos
app.use('/media', express.static(path.resolve(__dirname, '..', 'public', 'media')))

// Documentação da API
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

app.use('/v1', routes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
