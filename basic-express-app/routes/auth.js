const express = require('express')
const { body } = require('express-validator')
const User = require('../models/user')

const router = express.Router()

const authController = require('../controllers/auth')

router.get('/login', authController.getLogin)

router.get('/signup', authController.getSignup)

router.get('/reset', authController.getReset)

router.get('/reset/:token', authController.getNewPassword)

router.post(
	'/login',
	[
		body('email', 'Please enter a valid email').isEmail().normalizeEmail(),
		body('password', 'Please enter a password at least 5 characters.')
			.isLength({ min: 5 })
			.trim()
	],
	authController.postLogin
)

router.post(
	'/signup',
	[
		body('email', 'Please enter a valid email')
			.isEmail()
			.custom((value) => {
				return User.findOne({ email: value }).then((user) => {
					if (user) {
						return Promise.reject('Email already exists!')
					}
				})
			})
			.normalizeEmail(),
		body('password', 'Please enter a password at least 5 characters.')
			.isLength({ min: 5 })
			.trim(),
		body('confirmPassword')
			.trim()
			.custom((value, { req }) => {
				if (value !== req.body.password) {
					throw new Error('Passwords have to match!')
				}
				return true
			})
	],
	authController.postSignup
)

router.post('/reset', authController.postReset)

router.post('/new-password', authController.postNewPassword)

router.post('/logout', authController.postLogout)

module.exports = router
