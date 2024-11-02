const { validationResult } = require('express-validator')
const fs = require('fs')
const path = require('path')
const Product = require('../models/product')

exports.getAddProduct = (req, res, next) => {
	res.render('admin/edit-product', {
		pageTitle: 'Add Product',
		path: '/admin/add-product',
		editing: false,
		hasError: false,
		errorMessage: null,
		validationErrors: []
	})
}

exports.postAddProduct = (req, res, next) => {
	const { title, price, description } = req.body
	const image = req.file

	if (!image) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product',
			editing: false,
			hasError: true,
			product: { title, price, description },
			errorMessage: 'Attached file is not an image.',
			validationErrors: []
		})
	}

	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product',
			editing: false,
			hasError: true,
			product: { title, price, description },
			errorMessage: errors.array()[0].msg,
			validationErrors: errors.array()
		})
	}

	const imageUrl = '\\' + image.path

	const product = new Product({
		title,
		price,
		description,
		imageUrl,
		userId: req.user
	})

	product
		.save()
		.then(() => {
			res.redirect('/admin/products')
		})
		.catch(() => {
			err.status = 500
			return next(err)
		})
}

exports.getEditProduct = (req, res, next) => {
	const editMode = req.query.edit
	if (!editMode) {
		return res.redirect('/')
	}

	const prodId = req.params.productId

	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				const error = new Error('No product found.')
				error.status = 404
				throw error
			}

			res.render('admin/edit-product', {
				pageTitle: 'Edit Product',
				path: '/admin/edit-product',
				editing: editMode,
				product: product,
				hasError: false,
				errorMessage: null,
				validationErrors: []
			})
		})
		.catch((err) => {
			err.status = err.status || 500
			return next(err)
		})
}

exports.postEditProduct = (req, res, next) => {
	const prodId = req.body.productId
	const updatedTitle = req.body.title
	const updatedPrice = req.body.price
	const image = req.file
	const updatedDesc = req.body.description

	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Edit Product',
			path: '/admin/edit-product',
			editing: true,
			hasError: true,
			product: {
				title: updatedTitle,
				price: updatedPrice,
				description: updatedDesc,
				_id: prodId
			},
			errorMessage: errors.array()[0].msg,
			validationErrors: errors.array()
		})
	}

	let oldUrl

	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				const error = new Error('No product found.')
				error.status = 404
				throw error
			}

			if (product.userId.toString() !== req.user._id.toString()) {
				return res.redirect('/')
			}

			product.title = updatedTitle
			product.price = updatedPrice
			product.description = updatedDesc
			if (image) {
				oldUrl = product.imageUrl
				product.imageUrl = '\\' + image.path
			}
			return product.save()
		})
		.then(() => {
			if (oldUrl) {
				fs.unlink(oldUrl.slice(1), (err) => {
					if (err) {
						err.status = 500
						return next(err)
					}
					res.redirect('/admin/products')
				})
			} else {
				res.redirect('/admin/products')
			}
		})
		.catch((err) => {
			err.status = err.status || 500
			return next(err)
		})
}

exports.getProducts = (req, res, next) => {
	Product.find({ userId: req.user._id })
		.then((products) => {
			res.render('admin/products', {
				prods: products,
				pageTitle: 'Admin Products',
				path: '/admin/products'
			})
		})
		.catch((err) => {
			err.status = 500
			return next(err)
		})
}

exports.postDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId
	Product.findOneAndDelete({ _id: prodId, userId: req.user._id })
		.then((product) => {
			fs.unlink(product.imageUrl.slice(1), (err) => {
				if (err) {
					err.status = 500
					return next(err)
				}
			})
			res.redirect('/admin/products')
		})
		.catch((err) => {
			err.status = 500
			return next(err)
		})
}

exports.deleteProduct = (req, res, next) => {
	const prodId = req.params.productId
	Product.findOneAndDelete({ _id: prodId, userId: req.user._id })
		.then((product) => {
			fs.unlink(product.imageUrl.slice(1), (err) => {
				if (err) {
					err.status = 500
					return next(err)
				}
			})
			res.status(200).json({ message: 'Success!' })
		})
		.catch((err) => {
			res.status(500).json({ message: 'Deleting product failed.' })
		})
}
