const express = require('express')
const dotenv = require('dotenv')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const path = require('path')
const multer = require('multer')
const { v4 } = require('uuid')

const { init } = require('./socket')
const feedRoutes = require('./routes/feed')
const authRoutes = require('./routes/auth')
const { start } = require('repl')

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

app.use('/feed', feedRoutes)
app.use('/auth', authRoutes)

app.use((error, req, res, next) => {
	res.status(error.status || 500).json({
		message: error.message,
		status: error.status || 500,
		data: error.data
	})
})

const startServer = async () => {
	const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bjri2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`

	try {
		await mongoose.connect(MONGODB_URI)
		const server = app.listen(process.env.PORT)

		const io = init(server)
		io.on('connection', (socket) => {
			console.log('Client connected')
		})

		return server
	} catch (err) {
		console.log(err)
	}
}

module.exports = {
	app,
	startServer
}
