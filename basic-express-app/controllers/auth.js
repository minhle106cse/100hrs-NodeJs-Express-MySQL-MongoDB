const argon2 = require('argon2')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const { validationResult } = require('express-validator')

const User = require('../models/user')

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL,
		pass: process.env.EMAIL_PASSWORD
	}
})

exports.getLogin = (req, res, next) => {
	let message = req.flash('error')
	if (message.length > 0) {
		message = message[0]
	} else {
		message = null
	}

	res.render('auth/login', {
		path: '/login',
		pageTitle: 'Login',
		errorMessage: message,
		oldInput: { email: null, password: null },
		validationErrors: []
	})
}

exports.getSignup = (req, res, next) => {
	let message = req.flash('error')
	if (message.length > 0) {
		message = message[0]
	} else {
		message = null
	}

	res.render('auth/signup', {
		path: '/signup',
		pageTitle: 'Signup',
		errorMessage: message,
		oldInput: { email: null, password: null, confirmPassword: null },
		validationErrors: []
	})
}

exports.postLogin = (req, res, next) => {
	const { email, password } = req.body

	const errors = validationResult(req)

	if (!errors.isEmpty()) {
		return res.status(422).render('auth/login', {
			path: '/login',
			pageTitle: 'Login',
			errorMessage: errors.array()[0].msg,
			oldInput: { email, password },
			validationErrors: errors.array()
		})
	}

	let fetchedUser

	User.findOne({ email: email })
		.then((user) => {
			if (!user) {
				return res.status(422).render('auth/login', {
					path: '/login',
					pageTitle: 'Login',
					errorMessage: 'Invalid email or password.',
					oldInput: { email, password },
					validationErrors: []
				})
			}

			fetchedUser = user

			return argon2.verify(user.password, password)
		})
		.then((result) => {
			if (result) {
				req.session.isLoggedIn = true
				req.session.user = fetchedUser
				return req.session.save((err) => {
					if (err) {
						err.status = 500
						return next(err)
					}
					res.redirect('/')
				})
			} else {
				return res.status(422).render('auth/login', {
					path: '/login',
					pageTitle: 'Login',
					errorMessage: 'Invalid email or password.',
					oldInput: { email, password },
					validationErrors: []
				})
			}
		})
		.catch((err) => {
			err.status = 500
			return next(err)
		})
}

exports.postSignup = (req, res, next) => {
	const { email, password, confirmPassword } = req.body
	const errors = validationResult(req)

	if (!errors.isEmpty()) {
		return res.status(422).render('auth/signup', {
			path: '/signup',
			pageTitle: 'Signup',
			errorMessage: errors.array()[0].msg,
			oldInput: { email, password, confirmPassword },
			validationErrors: errors.array()
		})
	}

	argon2
		.hash(password)
		.then((hash) => {
			return User.create({
				email: email,
				password: hash,
				cart: { items: [] }
			})
		})
		.then(() => {
			res.redirect('/login')
			return transporter.sendMail({
				to: email,
				from: process.env.EMAIL,
				subject: 'Signup succeeded!',
				html: '<h1>You successfully signed up!</h1>'
			})
		})
		.catch((err) => {
			err.status = 500
			return next(err)
		})
}

exports.postLogout = (req, res, next) => {
	req.session.destroy((err) => {
		if (err) {
			err.status = 500
			return next(err)
		}
		res.redirect('/')
	})
}

exports.getReset = (req, res, next) => {
	let message = req.flash('error')
	if (message.length > 0) {
		message = message[0]
	} else {
		message = null
	}

	res.render('auth/reset', {
		path: '/reset',
		pageTitle: 'Reset Password',
		errorMessage: message
	})
}

exports.postReset = (req, res, next) => {
	const { email } = req.body
	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			err.status = 500
			return next(err)
		}

		const token = buffer.toString('hex')

		User.findOne({ email: email })
			.then((user) => {
				if (!user) {
					req.flash('error', 'No account with that email found.')
					return res.redirect('/reset')
				}

				user.resetToken = token
				user.resetTokenExpiration = Date.now() + 3600000
				return user.save()
			})
			.then(() => {
				res.redirect('/')
				transporter.sendMail({
					to: email,
					from: process.env.EMAIL,
					subject: 'Password reset',
					html: `
						<p>You requested a password reset</p>
						<p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
					`
				})
			})
			.catch((err) => {
				err.status = 500
				return next(err)
			})
	})
}

exports.getNewPassword = (req, res, next) => {
	const { token } = req.params

	User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
		.then((user) => {
			let message = req.flash('error')
			if (message.length > 0) {
				message = message[0]
			} else {
				message = null
			}

			res.render('auth/new-password', {
				path: '/new-password',
				pageTitle: 'New Password',
				errorMessage: message,
				userId: user._id.toString(),
				passwordToken: token
			})
		})
		.catch((err) => {
			err.status = 500
			return next(err)
		})
}

exports.postNewPassword = (req, res, next) => {
	const { password, userId, passwordToken } = req.body
	let resetUser

	User.findOne({
		_id: userId,
		resetToken: passwordToken,
		resetTokenExpiration: { $gt: Date.now() }
	})
		.then((user) => {
			resetUser = user
			return argon2.hash(password)
		})
		.then((hash) => {
			resetUser.password = hash
			resetUser.resetToken = null
			resetUser.resetTokenExpiration = null
			return resetUser.save()
		})
		.then(() => {
			res.redirect('/login')
		})
		.catch((err) => {
			err.status = 500
			return next(err)
		})
}
