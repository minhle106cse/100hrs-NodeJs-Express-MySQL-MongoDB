const express = require('express')
const { body } = require('express-validator')

const router = express.Router()

const feedController = require('../controllers/feed')
const authMiddleware = require('../middleware/auth')

router.get('/posts', authMiddleware, feedController.getPosts)
router.get('/posts/:postId', authMiddleware, feedController.getPost)
router.post(
	'/posts',
	authMiddleware,
	[
		body('title').trim().isLength({ min: 5 }),
		body('content').trim().isLength({ min: 5 })
	],
	feedController.createPost
)
router.put(
	'/posts/:postId',
	authMiddleware,
	[
		body('title').trim().isLength({ min: 5 }),
		body('content').trim().isLength({ min: 5 })
	],
	feedController.updatePost
)
router.delete('/posts/:postId', authMiddleware, feedController.deletePost)

module.exports = router
