const argon = require('argon2')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')

const User = require('../models/user')
const Post = require('../models/post')

const clearImage = (filePath) => {
	if (!filePath) return

	filePath = path.join(__dirname, '..', filePath)
	fs.unlink(filePath, (err) => {
		console.log(err)
	})
}

module.exports = {
	login: async function ({ email, password }) {
		const errors = []
		if (!validator.isEmail(email)) {
			errors.push({ message: 'E-Mail is invalid.' })
		}
		if (
			validator.isEmpty(password) ||
			!validator.isLength(password, { min: 5 })
		) {
			errors.push({ message: 'Password too short!' })
		}

		if (errors.length > 0) {
			const error = new Error(errors[0].message)
			error.data = errors
			error.status = 422
			throw error
		}

		const user = await User.findOne({ email })

		if (!user) {
			const error = new Error('User not found.')
			error.status = 404
			throw error
		}

		const isValid = await argon.verify(user.password, password)

		if (!isValid) {
			const error = new Error('Password is incorrect.')
			error.status = 401
			throw error
		}

		const token = jwt.sign(
			{
				userId: user._id.toString(),
				email
			},
			'secret_key',
			{ expiresIn: '1h' }
		)

		return { userId: user._id.toString(), token }
	},
	user: async function (args, context) {
		if (!context.isAuth) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		const user = await User.findById(context.userId).populate('posts')

		if (!user) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		return {
			...user._doc,
			_id: user._id.toString
		}
	},
	updateStatus: async function ({ status }, context) {
		if (!context.isAuth) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		const user = await User.findByIdAndUpdate(context.userId, { status })

		if (!user) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		return { ...user._doc, _id: user._id.toString() }
	},
	createUser: async function ({ userInput }) {
		const { email, name, password } = userInput

		const errors = []
		if (!validator.isEmail(email)) {
			errors.push({ message: 'E-Mail is invalid.' })
		}
		if (
			validator.isEmpty(password) ||
			!validator.isLength(password, { min: 5 })
		) {
			errors.push({ message: 'Password too short!' })
		}

		if (errors.length > 0) {
			const error = new Error(errors[0].message)
			error.data = errors
			error.status = 422
			throw error
		}

		const user = await User.findOne({ email })

		if (user) {
			const error = new Error('User exists already!')
			error.status = 409
			throw error
		}

		const hashedPassword = await argon.hash(password)

		const newUser = await User.create({
			email,
			name,
			password: hashedPassword
		})

		return { ...newUser._doc, _id: newUser._id.toString() }
	},
	posts: async function ({ page = 1 }, context) {
		if (!context.isAuth) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		const result = await Post.aggregate([
			{
				$lookup: {
					from: 'users',
					localField: 'creator',
					foreignField: '_id',
					as: 'creator'
				}
			},
			{
				$unwind: '$creator'
			},
			{
				$facet: {
					posts: [
						{ $sort: { createAt: -1 } },
						{ $skip: (page - 1) * 2 },
						{ $limit: 2 }
					],
					totalPosts: [{ $count: 'count' }]
				}
			}
		])

		return {
			posts: result[0].posts.map((post) => ({
				...post,
				_id: post._id.toString(),
				createdAt: post.createdAt.toISOString(),
				updatedAt: post.updatedAt.toISOString()
			})),
			totalPosts: result[0].totalPosts[0]?.count || 0
		}
	},
	post: async function ({ id }, context) {
		if (!context.isAuth) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		const post = await Post.findById(id).populate('creator')

		if (!post) {
			const error = new Error('Post not found.')
			error.status = 404
			throw error
		}

		return {
			...post._doc,
			_id: post._id.toString(),
			createdAt: post.createdAt.toISOString(),
			updatedAt: post.updatedAt.toISOString()
		}
	},
	createPost: async function ({ postInput }, context) {
		if (!context.isAuth) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		const { title, content, imageUrl } = postInput

		const errors = []

		if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
			errors.push({ message: 'Title is invalid.' })
		}

		if (
			validator.isEmpty(content) ||
			!validator.isLength(content, { min: 5 })
		) {
			errors.push({ message: 'Content is invalid.' })
		}

		if (errors.length > 0) {
			const error = new Error(errors[0].message)
			error.status = 422
			error.data = errors
			throw error
		}

		const user = await User.findById(context.userId)

		if (!user) {
			const error = new Error('User not found.')
			error.status = 401
			throw error
		}

		const post = await Post.create({ title, content, imageUrl, creator: user })

		user.posts.push(post)
		await user.save()

		return {
			...post._doc,
			_id: post._id.toString(),
			createdAt: post.createdAt.toISOString(),
			updatedAt: post.updatedAt.toISOString()
		}
	},
	updatePost: async function ({ id, postInput }, context) {
		if (!context.isAuth) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		const { title, content, imageUrl } = postInput

		const errors = []

		if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
			errors.push({ message: 'Title is invalid.' })
		}

		if (
			validator.isEmpty(content) ||
			!validator.isLength(content, { min: 5 })
		) {
			errors.push({ message: 'Content is invalid.' })
		}

		if (errors.length > 0) {
			const error = new Error(errors[0].message)
			error.status = 422
			error.data = errors
			throw error
		}

		const post = await Post.findById(id)

		if (!post) {
			const error = new Error('Could not find post.')
			error.status = 404
			throw error
		}

		if (post.creator.toString() !== context.userId) {
			const error = new Error('Not authorized!')
			error.status = 403
			throw error
		}

		if (imageUrl && imageUrl !== 'undefined') {
			clearImage(post.imageUrl)
			post.imageUrl = imageUrl
		}

		post.title = title
		post.content = content

		const savedPost = await post.save()
		const postWithCreator = await savedPost.populate('creator')

		return {
			...postWithCreator._doc,
			_id: postWithCreator._id.toString(),
			createdAt: postWithCreator.createdAt.toISOString(),
			updatedAt: postWithCreator.updatedAt.toISOString()
		}
	},
	deletePost: async function ({ id }, context) {
		if (!context.isAuth) {
			const error = new Error('Not authenticated!')
			error.status = 401
			throw error
		}

		const post = await Post.findOneAndDelete({
			_id: id,
			creator: context.userId
		})

		if (!post) {
			const error = new Error('Could not find post.')
			error.status = 404
			throw error
		}

		clearImage(post.imageUrl)

		await User.updateOne({ _id: context.userId }, { $pull: { posts: id } })

		return true
	}
}
