const path = require('path')
const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session)
const csrf = require('csurf')
const flash = require('connect-flash')
const dotenv = require('dotenv')
const multer = require('multer')
const helmet = require('helmet')
const compression = require('compression')
const https = require('https')

const env = process.env.NODE_ENV
dotenv.config({ path: `.env.${env}` })

const userSessionMiddleware = require('./middleware/userSessionMiddleware')
const adminRoutes = require('./routes/admin')
const shopRoutes = require('./routes/shop')
const authRoutes = require('./routes/auth')
const morgan = require('morgan')

const MONGODB_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bjri2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`
const PORT = process.env.PORT || 3000

const app = express()
const store = new MongoDBStore({
	uri: MONGODB_URI,
	collection: 'sessions'
})

const fileStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'images')
	},
	filename: function (req, file, cb) {
		cb(
			null,
			new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname
		)
	}
})

const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		cb(null, true)
	}

	cb(null, false)
}

app.use(bodyParser.urlencoded({ extended: false }))
app.use(multer({ storage: fileStorage, fileFilter }).single('image'))

app.set('view engine', 'ejs')
app.set('views', 'views')

app.use(express.static(path.join(__dirname, 'public')))
app.use('/images', express.static(path.join(__dirname, 'images')))
app.use(
	session({
		secret: 'my secret',
		resave: false,
		saveUninitialized: false,
		store: store
	})
)

const accessLogStream = fs.createWriteStream(
	path.join(__dirname, 'access.log'),
	{
		flags: 'a'
	}
)

app.use(helmet())
app.use(compression())
app.use(morgan('combined', { stream: accessLogStream }))
app.use(csrf())
app.use(flash())

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn
	res.locals.csrfToken = req.csrfToken()
	next()
})

app.use(userSessionMiddleware)

app.use('/admin', adminRoutes)
app.use(shopRoutes)
app.use(authRoutes)

app.use((req, res, next) => {
	res.status(404).render('404', {
		pageTitle: 'Page Not Found',
		path: '/404'
	})
})

app.use((error, req, res, next) => {
	res.status(error.status).render('error', {
		pageTitle: `${error.status}`,
		path: `/${error.status}`,
		message: error.message,
		status: error.status
	})
})

mongoose
	.connect(MONGODB_URI)
	.then(() => {
		if (process.env.USE_SSL === 'true') {
			const key = fs.readFileSync(process.env.SSL_KEY_PATH)
			const cert = fs.readFileSync(process.env.SSL_CERT_PATH)

			https.createServer({ key, cert }, app).listen(PORT, () => {
				console.log(`HTTPS Server running on https://localhost:${PORT}`)
			})
		} else {
			app.listen(PORT, () => {
				console.log(`HTTP Server running on http://localhost:${PORT}`)
			})
		}
	})
	.catch((err) => {
		console.log(err)
	})
