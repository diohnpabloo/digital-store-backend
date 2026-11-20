# Digital Store - Backend

API REST da Digital Store, desenvolvida com **Node.js**, **Express**, **MySQL** e **Sequelize**. A API oferece o CRUD de usuários, categorias e produtos, e usa autenticação via **JWT**.

## Tecnologias

- **Node.js** e **Express**: servidor e rotas da API
- **MySQL** e **Sequelize**: banco de dados, models e migrations
- **JWT** (jsonwebtoken) e **bcrypt**: autenticação e hash de senhas
- **Dotenv**: variáveis de ambiente
- **Nodemon**: reinício automático em desenvolvimento
- **Jest** e **Supertest**: testes automatizados
- **Swagger** (swagger-ui-express): documentação da API
- **Docker**: banco MySQL para desenvolvimento

## Estrutura de diretórios

```
digital-store-backend/
├── src/
│   ├── config/         # Conexão com o banco e documentação Swagger
│   ├── controllers/    # Recebem a requisição e devolvem a resposta HTTP
│   ├── middleware/     # Autenticação JWT e tratamento de erros
│   ├── migrations/     # Criação das tabelas
│   ├── models/         # Models do Sequelize e relacionamentos
│   ├── routes/         # Definição das rotas /v1
│   ├── seeders/        # Dados de exemplo
│   ├── services/       # Regras de negócio e validações
│   ├── app.js          # Configuração do Express
│   └── server.js       # Inicialização do servidor
├── tests/              # Testes de integração (Jest + Supertest)
├── public/media/       # Imagens dos produtos enviadas pela API
├── docker-compose.yml
└── package.json
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [Docker](https://www.docker.com/) com Docker Compose (ou um MySQL 8 instalado localmente)

## Como rodar o projeto

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

3. Suba o banco de dados MySQL com Docker:

   ```bash
   docker compose up -d
   ```

   O container cria os bancos `digital_store` (desenvolvimento) e `digital_store_test` (testes). Se usar um MySQL local, crie esses dois bancos e ajuste as variáveis `DB_*` no `.env`.

4. Execute as migrations:

   ```bash
   npm run db:migrate
   ```

5. (Opcional) Popule o banco com dados de exemplo:

   ```bash
   npm run db:seed
   ```

   Cria as categorias, os produtos exibidos nas telas da Digital Store (com imagens copiadas para `public/media`) e o usuário `admin@digitalstore.com`, senha `123@123`. Para remover os dados de exemplo, use `npm run db:seed:undo`.

6. Inicie o servidor:

   ```bash
   npm run dev
   ```

A API fica disponível em `http://localhost:3000/v1` e a documentação em **`http://localhost:3000/docs`**.

## Scripts

| Script                    | Descrição                                          |
| ------------------------- | -------------------------------------------------- |
| `npm run dev`             | Inicia o servidor com nodemon                      |
| `npm start`               | Inicia o servidor                                  |
| `npm run db:migrate`      | Executa as migrations                              |
| `npm run db:migrate:undo` | Desfaz todas as migrations                         |
| `npm run db:seed`         | Insere os dados de exemplo                         |
| `npm run db:seed:undo`    | Remove os dados de exemplo                         |
| `npm test`                | Executa os testes no banco `digital_store_test`    |

## Variáveis de ambiente

| Variável         | Descrição                                       | Exemplo                 |
| ---------------- | ----------------------------------------------- | ----------------------- |
| `PORT`           | Porta do servidor                               | `3000`                  |
| `APP_URL`        | URL pública usada nos links das imagens         | `http://localhost:3000` |
| `DB_HOST`        | Host do MySQL                                   | `localhost`             |
| `DB_PORT`        | Porta do MySQL                                  | `3306`                  |
| `DB_USER`        | Usuário do MySQL                                | `root`                  |
| `DB_PASSWORD`    | Senha do MySQL                                  | `root`                  |
| `DB_NAME`        | Banco de desenvolvimento                        | `digital_store`         |
| `DB_NAME_TEST`   | Banco usado pelos testes                        | `digital_store_test`    |
| `JWT_SECRET`     | Segredo para assinar os tokens                  | `troque-este-segredo`   |
| `JWT_EXPIRES_IN` | Validade do token                               | `1d`                    |

## Autenticação

Gere um token em `POST /v1/user/token` e envie-o no cabeçalho das requisições protegidas:

```
Authorization: Bearer <token>
```

Todos os endpoints **POST**, **PUT** e **DELETE** exigem o token, exceto o cadastro de usuário (`POST /v1/user`) e a geração do token (`POST /v1/user/token`). Sem token, ou com um token inválido, a API responde **401 Unauthorized**.

## Endpoints

### Usuários

| Método | Rota              | Descrição                 | Auth | Status           |
| ------ | ----------------- | ------------------------- | ---- | ---------------- |
| GET    | `/v1/user/:id`    | Obter usuário pelo ID     | Não  | 200, 404         |
| POST   | `/v1/user`        | Cadastrar usuário         | Não  | 201, 400         |
| POST   | `/v1/user/token`  | Gerar token JWT           | Não  | 200, 400         |
| PUT    | `/v1/user/:id`    | Atualizar usuário         | Sim  | 204, 400, 401, 404 |
| DELETE | `/v1/user/:id`    | Deletar usuário           | Sim  | 204, 401, 404    |

### Categorias

| Método | Rota                   | Descrição                   | Auth | Status             |
| ------ | ---------------------- | --------------------------- | ---- | ------------------ |
| GET    | `/v1/category/search`  | Listar categorias           | Não  | 200, 400           |
| GET    | `/v1/category/:id`     | Obter categoria pelo ID     | Não  | 200, 404           |
| POST   | `/v1/category`         | Cadastrar categoria         | Sim  | 201, 400, 401      |
| PUT    | `/v1/category/:id`     | Atualizar categoria         | Sim  | 204, 400, 401, 404 |
| DELETE | `/v1/category/:id`     | Deletar categoria           | Sim  | 204, 401, 404      |

Parâmetros de `GET /v1/category/search`: `limit` (padrão 12, `-1` para todos), `page` (padrão 1), `fields` (ex.: `name,slug`) e `use_in_menu=true`.

### Produtos

| Método | Rota                  | Descrição                 | Auth | Status             |
| ------ | --------------------- | ------------------------- | ---- | ------------------ |
| GET    | `/v1/product/search`  | Listar produtos           | Não  | 200, 400           |
| GET    | `/v1/product/:id`     | Obter produto pelo ID     | Não  | 200, 404           |
| POST   | `/v1/product`         | Cadastrar produto         | Sim  | 201, 400, 401      |
| PUT    | `/v1/product/:id`     | Atualizar produto         | Sim  | 204, 400, 401, 404 |
| DELETE | `/v1/product/:id`     | Deletar produto           | Sim  | 204, 401, 404      |

Parâmetros de `GET /v1/product/search`:

- `limit`, `page` e `fields` (ex.: `name,images,price`)
- `match=Tênis`: busca no nome ou na descrição
- `category_ids=1,2`: filtra pelos IDs das categorias
- `price-range=100-200`: filtra por faixa de preço
- `option[45]=GG,PP`: filtra pelos valores de uma opção

As imagens são enviadas em **base64** (`{ "type": "image/png", "content": "<base64>" }`), salvas em `public/media/product-<id>/` e retornadas como URL. No `PUT`, cada item de `images` e `options` pode ser:

- **sem `id`**: cria um novo item;
- **com `id` e `"deleted": true`**: remove o item;
- **com `id` e outros campos**: atualiza o item.

Exemplos completos de payload estão na documentação Swagger em `/docs`.

## Testes

Com o MySQL rodando, execute:

```bash
npm test
```

Os testes aplicam as migrations no banco `digital_store_test` e cobrem todos os endpoints e status HTTP: sucesso, dados inválidos, falta de token e recurso inexistente.
