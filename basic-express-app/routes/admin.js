const express = require('express')
const { body } = require('express-validator')

const router = express.Router()

const adminController = require('../controllers/admin')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/add-product', authMiddleware, adminController.getAddProduct)
router.get('/products', authMiddleware, adminController.getProducts)
router.get(
	'/edit-product/:productId',
	authMiddleware,
	adminController.getEditProduct
)

// /admin/add-product => POST
router.post(
	'/add-product',
	authMiddleware,
	[
		body('title').isString().isLength({ min: 3 }).trim(),
		body('price').isFloat(),
		body('description').isString().isLength({ min: 5, max: 400 }).trim()
	],
	adminController.postAddProduct
)
router.post(
	'/edit-product',
	authMiddleware,
	[
		body('title').isString().isLength({ min: 3 }).trim(),
		body('price').isFloat(),
		body('description').isString().isLength({ min: 5, max: 400 }).trim()
	],
	adminController.postEditProduct
)

/* router.post(
	'/delete-product',
	authMiddleware,
	adminController.postDeleteProduct
) */

router.delete(
	'/product/:productId',
	authMiddleware,
	adminController.deleteProduct
)

module.exports = router
