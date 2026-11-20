require('dotenv').config({ quiet: true })

// Configuração compartilhada entre a aplicação e o sequelize-cli (migrations e seeders)
const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
  define: {
    // Gera as colunas created_at e updated_at no padrão snake_case
    timestamps: true,
    underscored: true,
  },
}

module.exports = {
  development: { ...base, database: process.env.DB_NAME },
  test: { ...base, database: process.env.DB_NAME_TEST },
  production: { ...base, database: process.env.DB_NAME },
}
