const User = require('../models/user')

const userSessionMiddleware = (req, res, next) => {
	if (!req.session.user) {
		return next()
	}
	User.findById(req.session.user._id)
		.then((user) => {
			if (!user) {
				return next()
			}
			req.user = user
			next()
		})
		.catch((err) => {
			err.status = 500
			return next(err)
		})
}

module.exports = userSessionMiddleware
