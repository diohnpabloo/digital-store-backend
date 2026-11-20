'use strict'

const fs = require('fs/promises')
const path = require('path')
const bcrypt = require('bcrypt')
const { PUBLIC_DIR, deleteProductFolder } = require('../services/imageStorage')

const IMAGES_DIR = path.join(__dirname, 'images')

const CATEGORIES = ['Camisetas', 'Calças', 'Bonés', 'Headphones', 'Tênis']
const TENIS_CATEGORY_ID = 5

// 15 produtos da listagem (conforme o Figma) + o produto da página de detalhes
const PRODUCTS = [
  ...Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    name: 'K-Swiss V8 - Masculino',
    slug: `k-swiss-v8-masculino-${index + 1}`,
    description: 'Tênis K-Swiss V8 masculino.',
    price: 200,
    price_with_discount: 100,
    images: [`product-thumb-${(index % 5) + 1}.jpeg`],
  })),
  {
    id: 16,
    name: 'Tênis Nike Revolution 6 Next Nature Masculino',
    slug: 'tenis-nike-revolution-6-next-nature-masculino',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
    price: 219,
    price_with_discount: 219,
    images: [1, 2, 3, 4, 5].map((number) => `product-image-${number}.jpeg`),
  },
]

const toSlug = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Dados de exemplo baseados nas telas da Digital Store.
 * Usuário de acesso: admin@digitalstore.com / 123@123
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date()

    await queryInterface.bulkInsert('users', [
      {
        firstname: 'Admin',
        surname: 'Digital Store',
        email: 'admin@digitalstore.com',
        password: await bcrypt.hash('123@123', 10),
        created_at: now,
        updated_at: now,
      },
    ])

    await queryInterface.bulkInsert(
      'categories',
      CATEGORIES.map((name, index) => ({
        id: index + 1,
        name,
        slug: toSlug(name),
        use_in_menu: true,
        created_at: now,
        updated_at: now,
      })),
    )

    await queryInterface.bulkInsert(
      'products',
      PRODUCTS.map(({ images, ...product }) => ({
        ...product,
        enabled: true,
        use_in_menu: false,
        stock: 10,
        created_at: now,
        updated_at: now,
      })),
    )

    await queryInterface.bulkInsert(
      'product_categories',
      PRODUCTS.map((product) => ({ product_id: product.id, category_id: TENIS_CATEGORY_ID })),
    )

    await queryInterface.bulkInsert(
      'product_options',
      PRODUCTS.flatMap((product) => [
        {
          product_id: product.id,
          title: 'Tamanho',
          shape: 'square',
          radius: 4,
          type: 'text',
          values: '39,40,41,42,43',
        },
        {
          product_id: product.id,
          title: 'Cores',
          shape: 'circle',
          radius: 0,
          type: 'color',
          values: '#6FEEFF,#FF6969,#5E5E5E,#6D70B7',
        },
      ]),
    )

    // Copia as imagens de exemplo para a pasta pública, como faria o upload pela API
    const images = []
    for (const product of PRODUCTS) {
      const folder = path.join(PUBLIC_DIR, 'media', `product-${product.id}`)
      await fs.mkdir(folder, { recursive: true })
      for (const file of product.images) {
        await fs.copyFile(path.join(IMAGES_DIR, file), path.join(folder, file))
        images.push({
          product_id: product.id,
          enabled: true,
          path: path.posix.join('media', `product-${product.id}`, file),
        })
      }
    }
    await queryInterface.bulkInsert('product_images', images)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('product_categories', null, {})
    await queryInterface.bulkDelete('product_images', null, {})
    await queryInterface.bulkDelete('product_options', null, {})
    await queryInterface.bulkDelete('products', null, {})
    await queryInterface.bulkDelete('categories', null, {})
    await queryInterface.bulkDelete('users', { email: 'admin@digitalstore.com' }, {})
    await Promise.all(PRODUCTS.map((product) => deleteProductFolder(product.id)))
  },
}
