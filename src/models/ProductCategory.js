const { DataTypes } = require('sequelize')

module.exports = (sequelize) =>
  sequelize.define(
    'ProductCategory',
    {
      product_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      category_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    },
    { tableName: 'product_categories', timestamps: false },
  )
