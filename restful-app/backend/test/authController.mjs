import { expect } from 'chai'
import sinon from 'sinon'
import request from 'supertest'

import { app, startServer } from '../app.js'
import authController from '../controllers/auth.js'
import User from '../models/user.js'
import mongoose from 'mongoose'

describe('Auth Controller', () => {
	describe('Unit tests for user authentication', () => {
		it('should throw an error with code 500 if accessing the database fails', (done) => {
			sinon.stub(User, 'findOne')
			User.findOne.rejects()

			const req = {
				body: {
					email: 'test@example.com',
					password: '123456'
				}
			}

			const next = (err) => {
				expect(err).to.be.an('error')
				done()
			}

			authController.login(req, {}, next)
			User.findOne.restore()
		})

		it('should send a response with a valid status if the user exists', async () => {
			const userStub = {
				status: 'active',
				_id: '123456'
			}

			sinon.stub(User, 'findById').resolves(userStub)

			const req = { userId: '123456' }
			const res = {
				status: 500,
				json: sinon.spy(),
				status: function (code) {
					this.status = code
					return this
				}
			}
			const next = sinon.spy()

			await authController.getUserStatus(req, res, next)

			expect(res.status).to.equal(200)
			expect(res.json.calledWith({ status: 'active' })).to.be.true
			expect(next.called).to.be.false

			User.findById.restore()
		})
	})

	describe('Integration tests for user authentication', function () {
		this.timeout(5000)

		let server

		before(async () => {
			server = await startServer()
		})

		after(async () => {
			await User.deleteOne({ email: 'test@example.com' })
			server.close(async () => {
				await mongoose.disconnect()
			})
		})

		describe('User Signup', () => {
			it('should create a new user and return status 201', async () => {
				const response = await request(app).post('/auth/signup').send({
					email: 'test@example.com',
					name: 'Test',
					password: 'test123'
				})

				expect(response.status).to.equal(201)
			})
		})

		describe('User Login', () => {
			it('should login user and return status 200', async () => {
				const response = await request(app).post('/auth/login').send({
					email: 'test@example.com',
					password: 'test123'
				})

				expect(response.status).to.equal(200)
				expect(response.body).to.have.property('token')
			})
		})

		describe('Get User Status', () => {
			let token

			before(async () => {
				const loginResponse = await request(app).post('/auth/login').send({
					email: 'test@example.com',
					password: 'test123'
				})

				token = loginResponse.body.token
			})

			it('should return user status when /auth/status is called', async () => {
				const statusResponse = await request(app)
					.get('/auth/status')
					.set('Authorization', `Bearer ${token}`)

				expect(statusResponse.status).to.equal(200)
			})
		})
	})
})
