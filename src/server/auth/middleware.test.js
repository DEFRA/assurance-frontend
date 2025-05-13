// Mock the logger module before importing middleware
// Now import the middleware which will use our mocked logger
import * as middleware from './middleware.js'

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    error: jest.fn()
  })
}))

// Use a simplified approach where we mock dependencies
describe('Auth Middleware', () => {
  // Create mock request, h objects
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock request object
    mockRequest = {
      auth: {
        isAuthenticated: true,
        credentials: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            roles: ['admin']
          }
        }
      },
      url: {
        pathname: '/protected-path'
      }
    }

    // Mock response toolkit
    mockH = {
      redirect: jest.fn().mockReturnValue('redirected'),
      continue: 'continue-response'
    }
  })

  describe('requireAuth middleware', () => {
    test('should continue if user is authenticated and has user credentials', () => {
      // Act
      const result = middleware.requireAuth(mockRequest, mockH)

      // Assert
      expect(result).toBe('continue-response')
      expect(mockRequest.user).toEqual(mockRequest.auth.credentials.user)
      expect(mockH.redirect).not.toHaveBeenCalled()
    })

    test('should redirect to login if user is not authenticated', () => {
      // Arrange
      mockRequest.auth.isAuthenticated = false

      // Act
      const result = middleware.requireAuth(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })

    test('should redirect to login if user credentials are missing', () => {
      // Arrange
      mockRequest.auth.credentials.user = null

      // Act
      const result = middleware.requireAuth(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })
  })

  describe('requireRole middleware', () => {
    test('should return a function', () => {
      // Act
      const middlewareFn = middleware.requireRole('admin')

      // Assert
      expect(typeof middlewareFn).toBe('function')
    })

    test('should continue if user has the required role (string input)', () => {
      // Arrange
      const middlewareFn = middleware.requireRole('admin')

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('continue-response')
      expect(mockRequest.user).toEqual(mockRequest.auth.credentials.user)
    })

    test('should continue if user has one of the required roles (array input)', () => {
      // Arrange
      const middlewareFn = middleware.requireRole(['editor', 'admin'])

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('continue-response')
      expect(mockRequest.user).toEqual(mockRequest.auth.credentials.user)
    })

    test('should redirect to login if user is not authenticated', () => {
      // Arrange
      mockRequest.auth.isAuthenticated = false
      const middlewareFn = middleware.requireRole('admin')

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })

    test('should redirect to login if user credentials are missing', () => {
      // Arrange
      mockRequest.auth.credentials.user = null
      const middlewareFn = middleware.requireRole('admin')

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })

    test('should throw Boom forbidden if user does not have the required role', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = ['editor']
      const middlewareFn = middleware.requireRole('admin')

      // Act & Assert
      expect(() => middlewareFn(mockRequest, mockH)).toThrow(
        'Insufficient permissions'
      )
    })

    test('should throw Boom forbidden if user has no roles', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = []
      const middlewareFn = middleware.requireRole('admin')

      // Act & Assert
      expect(() => middlewareFn(mockRequest, mockH)).toThrow(
        'Insufficient permissions'
      )
    })

    test('should handle undefined roles properly', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = undefined
      const middlewareFn = middleware.requireRole('admin')

      // Act & Assert
      expect(() => middlewareFn(mockRequest, mockH)).toThrow(
        'Insufficient permissions'
      )
    })
  })
})
