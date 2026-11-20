const { Router } = require('express')
const auth = require('../middleware/auth')
const controller = require('../controllers/productController')

const router = Router()

router.get('/search', controller.search)
router.get('/:id', controller.show)

// Rotas protegidas por JWT
router.post('/', auth, controller.store)
router.put('/:id', auth, controller.update)
router.delete('/:id', auth, controller.destroy)

module.exports = router
