const express = require('express')
const router = express.Router()

const shopController = require('../controllers/shop')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/', shopController.getIndex)

router.get('/products', shopController.getProducts)

router.get('/products/:productId', shopController.getProduct)

router.get('/cart', authMiddleware, shopController.getCart)

router.get('/checkout', authMiddleware, shopController.getCheckout)

router.get(
	'/checkout/success',
	authMiddleware,
	shopController.getCheckoutSuccess
)
router.get('/checkout/cancel', authMiddleware, shopController.getCheckout)

router.post('/cart', authMiddleware, shopController.postCart)

router.post(
	'/cart-delete-item',
	authMiddleware,
	shopController.postCartDeleteProduct
)

router.get('/orders', authMiddleware, shopController.getOrders)

router.get('/orders/:orderId', authMiddleware, shopController.getInvoice)

module.exports = router
