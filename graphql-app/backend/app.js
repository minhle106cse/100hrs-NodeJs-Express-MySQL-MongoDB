const express = require('express')
const dotenv = require('dotenv')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')
const multer = require('multer')
const { v4 } = require('uuid')
const { createHandler } = require('graphql-http/lib/use/express')
const { ruruHTML } = require('ruru/server')
const fs = require('fs')

const schema = require('./graphql/schema')
const resolvers = require('./graphql/resolvers')
const authMiddleware = require('./middleware/auth')

dotenv.config({
	path: `.env.${process.env.NODE_ENV}`
})

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images')
	},
	filename: (req, file, cb) => {
		cb(null, v4() + '-' + file.originalname)
	}
})

const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		cb(null, true)
	} else {
		cb(null, false)
	}
}

const app = express()

app.use(bodyParser.json())
app.use(multer({ storage, fileFilter }).single('image'))
app.use('/images', express.static(path.join(__dirname, 'images')))

app.use((req, res, next) => {
	const origin = req.headers.origin
	if (origin && origin.startsWith('http://localhost')) {
		res.setHeader('Access-Control-Allow-Origin', '*')
	}
	res.setHeader(
		'Access-Control-Allow-Methods',
		'OPTIONS, GET, POST, PUT, PATCH, DELETE'
	)
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	res.header('Access-Control-Allow-Credentials', 'true')

	if (req.method === 'OPTIONS') {
		return res.sendStatus(200)
	}

	next()
})

app.use(authMiddleware)

app.put('/post-image', (req, res, next) => {
	if (!req.isAuth) {
		const error = new Error('Not authenticated!')
		error.status = 401
		throw error
	}

	if (!req.file) {
		return res.status(200).json({ message: 'No file provided!' })
	}

	return res.status(201).json({
		message: 'File stored.',
		filePath: req.file.path.replace('\\', '/')
	})
})

app.use(
	'/graphql',
	createHandler({
		schema: schema,
		rootValue: resolvers,
		context: (req) => ({
			isAuth: req.raw.isAuth,
			userId: req.raw.userId
		}),
		formatError: (error) => {
			if (error.originalError) {
				return {
					message: error.message,
					status: error.originalError.status,
					data: error.originalError.data
				}
			}

			return error
		}
	})
)

app.get('/', (req, res) => {
	res.type('html')
	res.end(ruruHTML({ endpoint: '/graphql' }))
})

app.use((error, req, res, next) => {
	res.status(error.status || 500).json({
		message: error.message,
		status: error.status || 500,
		data: error.data
	})
})

const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bjri2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`

mongoose
	.connect(MONGODB_URI)
	.then(() => {
		app.listen(process.env.PORT)
	})
	.catch((err) => {
		console.log(err)
	})

const clearImage = (filePath) => {
	if (!filePath) return

	filePath = path.join(__dirname, '..', filePath)
	fs.unlink(filePath, (err) => {
		console.log(err)
	})
}
