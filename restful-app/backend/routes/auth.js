const express = require('express')
const { body } = require('express-validator')

const authController = require('../controllers/auth')

const router = express.Router()

router.put(
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

module.exports = router
