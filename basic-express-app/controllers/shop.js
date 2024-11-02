const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const PDFDocument = require('pdfkit')

const Product = require('../models/product')
const Order = require('../models/order')

exports.getProducts = (req, res, next) => {
	const page = +req.query.page || 1
	const size = 2
	let totalItems

	Product.find()
		.countDocuments()
		.then((numProducts) => {
			totalItems = numProducts
			return Product.find()
				.skip((page - 1) * size)
				.limit(size)
		})
		.then((products) => {
			res.render('shop/product-list', {
				prods: products,
				pageTitle: 'All Products',
				path: '/products',
				totalProducts: totalItems,
				hasNextPage: size * page < totalItems,
				hasPrevPage: page > 1,
				page: page,
				lastPage: Math.ceil(totalItems / size)
			})
		})
		.catch((err) => {
			console.log(err)
		})
}

exports.getProduct = (req, res, next) => {
	const prodId = req.params.productId
	Product.findById(prodId)
		.then((product) => {
			res.render('shop/product-detail', {
				product: product,
				pageTitle: product.title,
				path: '/products',
				isAuthenticated: req.session.isLoggedIn
			})
		})
		.catch((err) => console.log(err))
}

exports.getIndex = (req, res, next) => {
	const page = +req.query.page || 1
	const size = 2
	let totalItems

	Product.find()
		.countDocuments()
		.then((numProducts) => {
			totalItems = numProducts
			return Product.find()
				.skip((page - 1) * size)
				.limit(size)
		})
		.then((products) => {
			res.render('shop/index', {
				prods: products,
				pageTitle: 'Shop',
				path: '/',
				totalProducts: totalItems,
				hasNextPage: size * page < totalItems,
				hasPrevPage: page > 1,
				page,
				lastPage: Math.ceil(totalItems / size)
			})
		})
		.catch((err) => {
			console.log(err)
		})
}

exports.getCart = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.then((user) => {
			const products = user.cart.items
			res.render('shop/cart', {
				path: '/cart',
				pageTitle: 'Your Cart',
				products: products
			})
		})
		.catch((err) => console.log(err))
}

exports.getCheckout = (req, res, next) => {
	let products
	let totalSum = 0

	req.user
		.populate('cart.items.productId')
		.then((user) => {
			products = user.cart.items
			totalSum = products.reduce(
				(acc, prod) => acc + prod.quantity * prod.productId.price,
				0
			)

			return stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				line_items: products.map((p) => ({
					price_data: {
						currency: 'usd',
						product_data: {
							name: p.productId.title,
							description: p.productId.description
						},
						unit_amount: p.productId.price * 100
					},
					quantity: p.quantity
				})),
				mode: 'payment',
				success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
				cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`
			})
		})
		.then((session) => {
			res.render('shop/checkout', {
				path: '/checkout',
				pageTitle: 'Checkout',
				products: products,
				totalSum: totalSum,
				sessionId: session.id
			})
		})
		.catch((err) => console.log(err))
}

exports.postCart = (req, res, next) => {
	const prodId = req.body.productId
	Product.findById(prodId)
		.then((product) => {
			return req.user.addToCart(product)
		})
		.then((result) => {
			res.redirect('/cart')
		})
}

exports.postCartDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId
	req.user
		.removeFromCart(prodId)
		.then((result) => {
			res.redirect('/cart')
		})
		.catch((err) => console.log(err))
}

exports.getCheckoutSuccess = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.then((user) => {
			const products = user.cart.items.map((i) => {
				return { quantity: i.quantity, product: { ...i.productId._doc } }
			})
			const order = new Order({
				user: {
					email: req.user.email,
					userId: req.user
				},
				products: products
			})
			return order.save()
		})
		.then((result) => {
			return req.user.clearCart()
		})
		.then(() => {
			res.redirect('/orders')
		})
		.catch((err) => console.log(err))
}

exports.getOrders = (req, res, next) => {
	Order.find({ 'user.userId': req.user._id })
		.then((orders) => {
			res.render('shop/orders', {
				path: '/orders',
				pageTitle: 'Your Orders',
				orders: orders,
				isAuthenticated: req.session.isLoggedIn
			})
		})
		.catch((err) => console.log(err))
}

exports.getInvoice = (req, res, next) => {
	const { orderId } = req.params

	Order.findById(orderId)
		.then((order) => {
			if (!order) {
				const error = new Error('No order found.')
				error.status = 404
				throw error
			}

			if (order.user.userId.toString() !== req.user._id.toString()) {
				const error = new Error('Unauthorized')
				error.status = 403
				throw error
			}

			const invoiceName = `invoice-${orderId}.pdf`

			const pdfDoc = new PDFDocument()
			res.setHeader('Content-Type', 'application/pdf')
			res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`)
			pdfDoc.pipe(res)

			pdfDoc.fontSize(26).text('Invoice', {
				underline: true
			})

			pdfDoc.fontSize(14).text('------------------------------------------')
			let totalPrice = 0
			order.products.forEach((prod) => {
				totalPrice += prod.quantity * prod.product.price
				pdfDoc.text(
					`${prod.product.title} - ${prod.quantity} x $${prod.product.price}`
				)
			})
			pdfDoc.text(' ')
			pdfDoc.text(`Total Price: $${totalPrice}`)
			pdfDoc.end()
		})
		.catch((err) => {
			err.status = err.status || 500
			return next(err)
		})
}
