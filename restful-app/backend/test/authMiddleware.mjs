import { expect } from 'chai'
import authMiddleware from '../middleware/auth.js'
import jwt from 'jsonwebtoken'
import sinon from 'sinon'

describe('Auth Middleware', () => {
	it('should throw an error if no authorization header is present', () => {
		const req = {
			get: () => null
		}
		expect(authMiddleware.bind(this, req, {}, () => {})).to.throw(
			'Not authenticated.'
		)
	})

	it('should throw an error if the authorization header is only one string', () => {
		const req = {
			get: (headerName) => 'xyz'
		}
		expect(authMiddleware.bind(this, req, {}, () => {})).to.throw()
	})

	it('should throw an error if the token cannot be verified', () => {
		const req = {
			get: (headerName) => 'Bearer xyz'
		}
		expect(authMiddleware.bind(this, req, {}, () => {})).to.throw()
	})

	it('should yield a userId after decoding the token', () => {
		const req = {
			get: (headerName) => 'Bearer xyz'
		}

		sinon.stub(jwt, 'verify')
		jwt.verify.returns({ userId: 'abc' })
		authMiddleware(req, {}, () => {})
		expect(jwt.verify.called).to.be.true
		expect(req).to.have.property('userId', 'abc')
		jwt.verify.restore()
	})
})
