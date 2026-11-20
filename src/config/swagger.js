/**
 * Documentação da API no padrão OpenAPI 3, exibida em /docs
 */

const idParam = (name) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `ID ${name}`,
  schema: { type: 'integer' },
})

const ref = (name) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema) => ({ content: { 'application/json': { schema } } })

const responses = {
  204: { description: 'No Content - requisição bem sucedida, sem corpo de resposta' },
  400: { description: 'Bad Request - dados da requisição incorretos', ...json(ref('Error')) },
  401: {
    description: 'Unauthorized - token não enviado ou inválido',
    ...json(ref('Error')),
  },
  404: { description: 'Not Found - recurso não encontrado', ...json(ref('Error')) },
}

const paginationParams = [
  {
    name: 'limit',
    in: 'query',
    description: 'Itens por página. Use -1 para buscar todos. Padrão: 12',
    schema: { type: 'integer', example: 12 },
  },
  {
    name: 'page',
    in: 'query',
    description: 'Página dos resultados. Sem efeito quando limit = -1. Padrão: 1',
    schema: { type: 'integer', example: 1 },
  },
]

const security = [{ bearerAuth: [] }]

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Store API',
    version: '1.0.0',
    description:
      'API REST da Digital Store. Os endpoints POST, PUT e DELETE (exceto cadastro de usuário e geração de token) exigem o cabeçalho `Authorization: Bearer <jwt>`.',
  },
  servers: [{ url: '/v1' }],
  tags: [{ name: 'Usuários' }, { name: 'Categorias' }, { name: 'Produtos' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', example: 'user@mail.com' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
        properties: {
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', example: 'user@mail.com' },
          password: { type: 'string', example: '123@123' },
          confirmPassword: { type: 'string', example: '123@123' },
        },
      },
      UserUpdate: {
        type: 'object',
        required: ['firstname', 'surname', 'email'],
        properties: {
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', example: 'user@mail.com' },
        },
      },
      Credentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'user@mail.com' },
          password: { type: 'string', example: '123@123' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      ProductOption: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Tamanho' },
          shape: { type: 'string', enum: ['square', 'circle'] },
          radius: { type: 'integer', example: 4 },
          type: { type: 'string', enum: ['text', 'color'] },
          values: { type: 'array', items: { type: 'string' }, example: ['P', 'M', 'G'] },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                content: {
                  type: 'string',
                  example: 'http://localhost:3000/media/product-1/imagem.png',
                },
              },
            },
          },
          options: { type: 'array', items: ref('ProductOption') },
        },
      },
      ProductCreate: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1] },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'image/png' },
                content: { type: 'string', description: 'Imagem em base64' },
              },
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Tamanho' },
                shape: { type: 'string', enum: ['square', 'circle'] },
                radius: { type: 'string', example: '4px' },
                type: { type: 'string', enum: ['text', 'color'] },
                values: { type: 'array', items: { type: 'string' }, example: ['P', 'M'] },
              },
            },
          },
        },
      },
      ProductUpdate: {
        type: 'object',
        description:
          'Todos os campos são opcionais. Em images e options: itens sem id são criados, `{ "id": 1, "deleted": true }` remove e itens com id são atualizados. Em images, um content com URL mantém a imagem atual e um content em base64 substitui o arquivo.',
        properties: {
          enabled: { type: 'boolean' },
          name: { type: 'string' },
          slug: { type: 'string' },
          stock: { type: 'integer' },
          description: { type: 'string' },
          price: { type: 'number' },
          price_with_discount: { type: 'number' },
          category_ids: { type: 'array', items: { type: 'integer' } },
          images: { type: 'array', items: { type: 'object' } },
          options: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    '/user/{id}': {
      get: {
        tags: ['Usuários'],
        summary: 'Obter usuário pelo ID',
        parameters: [idParam('do usuário')],
        responses: { 200: { description: 'OK', ...json(ref('User')) }, 404: responses[404] },
      },
      put: {
        tags: ['Usuários'],
        summary: 'Atualizar usuário',
        security,
        parameters: [idParam('do usuário')],
        requestBody: { required: true, ...json(ref('UserUpdate')) },
        responses: {
          204: responses[204],
          400: responses[400],
          401: responses[401],
          404: responses[404],
        },
      },
      delete: {
        tags: ['Usuários'],
        summary: 'Deletar usuário',
        security,
        parameters: [idParam('do usuário')],
        responses: { 204: responses[204], 401: responses[401], 404: responses[404] },
      },
    },
    '/user': {
      post: {
        tags: ['Usuários'],
        summary: 'Cadastrar usuário',
        requestBody: { required: true, ...json(ref('UserCreate')) },
        responses: {
          201: { description: 'Created', ...json(ref('User')) },
          400: responses[400],
        },
      },
    },
    '/user/token': {
      post: {
        tags: ['Usuários'],
        summary: 'Gerar token JWT',
        requestBody: { required: true, ...json(ref('Credentials')) },
        responses: {
          200: {
            description: 'OK',
            ...json({ type: 'object', properties: { token: { type: 'string' } } }),
          },
          400: responses[400],
        },
      },
    },
    '/category/search': {
      get: {
        tags: ['Categorias'],
        summary: 'Listar categorias',
        parameters: [
          ...paginationParams,
          {
            name: 'fields',
            in: 'query',
            description: 'Campos retornados. Ex.: name,slug',
            schema: { type: 'string' },
          },
          {
            name: 'use_in_menu',
            in: 'query',
            description: 'Filtra categorias exibidas no menu',
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            ...json({
              type: 'object',
              properties: {
                data: { type: 'array', items: ref('Category') },
                total: { type: 'integer' },
                limit: { type: 'integer' },
                page: { type: 'integer' },
              },
            }),
          },
          400: responses[400],
        },
      },
    },
    '/category/{id}': {
      get: {
        tags: ['Categorias'],
        summary: 'Obter categoria pelo ID',
        parameters: [idParam('da categoria')],
        responses: {
          200: { description: 'OK', ...json(ref('Category')) },
          404: responses[404],
        },
      },
      put: {
        tags: ['Categorias'],
        summary: 'Atualizar categoria',
        security,
        parameters: [idParam('da categoria')],
        requestBody: { required: true, ...json(ref('CategoryInput')) },
        responses: {
          204: responses[204],
          400: responses[400],
          401: responses[401],
          404: responses[404],
        },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Deletar categoria',
        security,
        parameters: [idParam('da categoria')],
        responses: { 204: responses[204], 401: responses[401], 404: responses[404] },
      },
    },
    '/category': {
      post: {
        tags: ['Categorias'],
        summary: 'Cadastrar categoria',
        security,
        requestBody: { required: true, ...json(ref('CategoryInput')) },
        responses: {
          201: { description: 'Created', ...json(ref('Category')) },
          400: responses[400],
          401: responses[401],
        },
      },
    },
    '/product/search': {
      get: {
        tags: ['Produtos'],
        summary: 'Listar produtos',
        parameters: [
          ...paginationParams,
          {
            name: 'fields',
            in: 'query',
            description: 'Campos retornados. Ex.: name,images,price',
            schema: { type: 'string' },
          },
          {
            name: 'match',
            in: 'query',
            description: 'Termo buscado no nome ou na descrição',
            schema: { type: 'string', example: 'Tênis' },
          },
          {
            name: 'category_ids',
            in: 'query',
            description: 'IDs de categorias separados por vírgula',
            schema: { type: 'string', example: '1,2' },
          },
          {
            name: 'price-range',
            in: 'query',
            description: 'Faixa de preço no formato min-max',
            schema: { type: 'string', example: '100-200' },
          },
          {
            name: 'option[id]',
            in: 'query',
            description:
              'Filtra pelos valores de uma opção. Substitua "id" pelo ID da opção. Ex.: option[45]=GG,PP',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            ...json({
              type: 'object',
              properties: {
                data: { type: 'array', items: ref('Product') },
                total: { type: 'integer' },
                limit: { type: 'integer' },
                page: { type: 'integer' },
              },
            }),
          },
          400: responses[400],
        },
      },
    },
    '/product/{id}': {
      get: {
        tags: ['Produtos'],
        summary: 'Obter produto pelo ID',
        parameters: [idParam('do produto')],
        responses: {
          200: { description: 'OK', ...json(ref('Product')) },
          404: responses[404],
        },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualizar produto',
        security,
        parameters: [idParam('do produto')],
        requestBody: { required: true, ...json(ref('ProductUpdate')) },
        responses: {
          204: responses[204],
          400: responses[400],
          401: responses[401],
          404: responses[404],
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Deletar produto',
        security,
        parameters: [idParam('do produto')],
        responses: { 204: responses[204], 401: responses[401], 404: responses[404] },
      },
    },
    '/product': {
      post: {
        tags: ['Produtos'],
        summary: 'Cadastrar produto',
        security,
        requestBody: { required: true, ...json(ref('ProductCreate')) },
        responses: {
          201: { description: 'Created', ...json(ref('Product')) },
          400: responses[400],
          401: responses[401],
        },
      },
    },
  },
}
