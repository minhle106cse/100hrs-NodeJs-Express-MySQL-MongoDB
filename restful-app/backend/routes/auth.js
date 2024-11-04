const express = require('express')
const { body } = require('express-validator')

const authController = require('../controllers/auth')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.post(
	'/signup',
	[
		body('email', 'Please enter a valid email').isEmail().normalizeEmail(),
		body('password', 'Please enter a password at least 5 characters')
			.isLength({ min: 5 })
			.trim(),
		body('name').trim().not().isEmpty()
	],
	authController.signup
)

router.post('/login', authController.login)

router.get('/status', authMiddleware, authController.getUserStatus)

module.exports = router
