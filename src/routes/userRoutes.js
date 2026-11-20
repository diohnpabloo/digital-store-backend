const { Router } = require('express')
const auth = require('../middleware/auth')
const controller = require('../controllers/userController')

const router = Router()

// Rotas públicas
router.post('/token', controller.token)
router.post('/', controller.store)
router.get('/:id', controller.show)

// Rotas protegidas por JWT
router.put('/:id', auth, controller.update)
router.delete('/:id', auth, controller.destroy)

module.exports = router
