const { validationResult } = require('express-validator')
const fs = require('fs')
const path = require('path')

const io = require('../socket')
const Post = require('../models/post')
const User = require('../models/user')

const clearImage = (filePath) => {
	if (!filePath) return

	filePath = path.join(__dirname, '..', filePath)
	fs.unlink(filePath, (err) => {
		console.log(err)
	})
}

const getPosts = async (req, res, next) => {
	const { page = 1 } = req.query
	const size = 2

	try {
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
				$unwind: {
					path: '$creator',
					preserveNullAndEmptyArrays: false
				}
			},
			{
				$facet: {
					totalItems: [{ $count: 'totalItems' }],
					posts: [{ $skip: (page - 1) * size }, { $limit: size }]
				}
			}
		])

		res.status(200).json({
			posts: result[0].posts,
			totalItems: result[0].totalItems?.[0]?.totalItems || 0
		})
	} catch (err) {
		next(err)
	}
}

const getPost = async (req, res, next) => {
	const { postId } = req.params

	try {
		const post = await Post.findById(postId)

		if (!post) {
			const error = new Error('Could not find post.')
			error.status = 404
			throw error
		}

		res.status(200).json({
			post
		})
	} catch (err) {
		next(err)
	}
}

const createPost = async (req, res, next) => {
	const errors = validationResult(req)

	if (!errors.isEmpty()) {
		const error = new Error('Validation failed, entered data is incorrect.')
		error.status = 422
		error.data = errors.array()
		throw error
	}

	if (!req.file) {
		const error = new Error('No image provided.')
		error.status = 422
		error.data = errors.array()
		throw error
	}

	const { title, content } = req.body
	const image = req.file
	const imageUrl = image.path.replace('\\', '/')

	try {
		const user = await User.findById(req.userId)

		if (!user) {
			const error = new Error('Unauthorized user.')
			error.status = 403
			throw error
		}

		const post = await Post.create({ title, content, imageUrl, creator: user })

		user.posts.push(post)
		await user.save()

		io.getIO().emit('posts', { action: 'create', post })

		res.status(201).json({
			message: 'Post created successfully!',
			post,
			creator: { _id: user._id, name: user.name }
		})
	} catch (err) {
		next(err)
	}
}

const updatePost = async (req, res, next) => {
	const errors = validationResult(req)

	if (!errors.isEmpty()) {
		const error = new Error('Validation failed, entered data is incorrect.')
		error.status = 422
		error.data = errors.array()
		throw error
	}

	const { postId } = req.params
	const { title, content } = req.body

	let imageUrl
	if (req.file) {
		imageUrl = req.file.path.replace('\\', '/')
	}

	try {
		const post = await Post.findById(postId)

		if (!post) {
			const error = new Error('Could not find post.')
			error.status = 404
			throw error
		}

		if (post.creator.toString() !== req.userId) {
			const error = new Error('Not authorized!')
			error.status = 403
			throw error
		}

		if (imageUrl) {
			clearImage(post.imageUrl)
			post.imageUrl = imageUrl
		}

		post.title = title
		post.content = content

		const savedPost = await post.save()

		res.status(200).json({
			message: 'Post updated successfully!',
			post: savedPost
		})
	} catch (err) {
		next(err)
	}
}

const deletePost = async (req, res, next) => {
	const { postId } = req.params

	try {
		const [post, user] = await Promise.all([
			Post.findById(postId),
			User.findById(req.userId)
		])

		if (!post) {
			const error = new Error('Could not find post.')
			error.status = 404
			throw error
		}

		/* if (!user) {
			const error = new Error('Unauthorized user.')
			error.status = 403
			throw error
		} */

		if (post.creator.toString() !== req.userId) {
			const error = new Error('Not authorized!')
			error.status = 403
			throw error
		}

		/* 	user.posts.pull(postId) */
		/* 	await user.save() */

		await Promise.all([
			post.deleteOne(),
			user.updateOne({
				$pull: { posts: postId }
			})
		])

		clearImage(post.imageUrl)

		res.status(200).json({
			message: 'Post deleted successfully!',
			post
		})
	} catch (err) {
		next(err)
	}
}

module.exports = {
	getPosts,
	getPost,
	createPost,
	updatePost,
	deletePost
}
