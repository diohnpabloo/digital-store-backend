const app = require('./app')
const { sequelize } = require('./models')

const PORT = process.env.PORT || 3000

async function start() {
  try {
    await sequelize.authenticate()
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`)
      console.log(`Documentação disponível em http://localhost:${PORT}/docs`)
    })
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error.message)
    process.exit(1)
  }
}

start()
