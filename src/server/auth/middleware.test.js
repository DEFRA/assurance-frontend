import * as middleware from './middleware.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

// Mock the logger module before importing middleware
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
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

    // Mock response toolkit with takeover method
    const mockRedirectResponse = {
      takeover: jest.fn().mockReturnValue('redirected-with-takeover')
    }

    mockH = {
      redirect: jest.fn().mockReturnValue(mockRedirectResponse),
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
      expect(result).toBe(mockH.redirect())
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
      expect(result).toBe(mockH.redirect())
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })

    test('should handle errors and redirect to login', () => {
      // Arrange
      mockRequest.auth = null // This will cause an error when trying to access .isAuthenticated

      // Act
      const result = middleware.requireAuth(mockRequest, mockH)

      // Assert
      expect(result).toBe(mockH.redirect())
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
      expect(logger.error).toHaveBeenCalledWith(
        'Authentication error',
        expect.any(Error)
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
      expect(result).toBe('redirected-with-takeover')
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
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })

    test('should redirect to insufficient permissions if user does not have the required role', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = ['editor']
      const middlewareFn = middleware.requireRole('admin')

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
      expect(logger.warn).toHaveBeenCalledWith(
        'Access denied - insufficient permissions',
        {
          requiredRoles: ['admin'],
          userRoles: ['editor'],
          userId: 'test-user-id',
          path: '/protected-path',
          userEmail: 'test@example.com'
        }
      )
    })

    test('should redirect to insufficient permissions if user has no roles', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = []
      const middlewareFn = middleware.requireRole('admin')

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
    })

    test('should redirect to insufficient permissions when roles are undefined', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = undefined
      const middlewareFn = middleware.requireRole('admin')

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
    })

    test('should handle errors and redirect to insufficient permissions', () => {
      // Arrange
      mockRequest.auth = null // This will cause an error
      const middlewareFn = middleware.requireRole('admin')

      // Act
      const result = middlewareFn(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
      expect(logger.error).toHaveBeenCalledWith(
        'Authorization error',
        expect.any(Error)
      )
    })
  })

  describe('requireAdmin middleware', () => {
    test('should continue if user is authenticated and has admin role', () => {
      // Act
      const result = middleware.requireAdmin(mockRequest, mockH)

      // Assert
      expect(result).toBe('continue-response')
      expect(mockRequest.user).toEqual(mockRequest.auth.credentials.user)
    })

    test('should redirect to login if user is not authenticated', () => {
      // Arrange
      mockRequest.auth.isAuthenticated = false

      // Act
      const result = middleware.requireAdmin(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })

    test('should redirect to login if user credentials are missing', () => {
      // Arrange
      mockRequest.auth.credentials.user = null

      // Act
      const result = middleware.requireAdmin(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/login?redirectTo=/protected-path'
      )
    })

    test('should redirect to insufficient permissions if user does not have admin role', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = ['editor']

      // Act
      const result = middleware.requireAdmin(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
    })

    test('should redirect to insufficient permissions if user has no roles', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = []

      // Act
      const result = middleware.requireAdmin(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
    })

    test('should redirect to insufficient permissions when roles are undefined', () => {
      // Arrange
      mockRequest.auth.credentials.user.roles = undefined

      // Act
      const result = middleware.requireAdmin(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
    })

    test('should handle errors and redirect to insufficient permissions', () => {
      // Arrange
      mockRequest.auth = null // This will cause an error

      // Act
      const result = middleware.requireAdmin(mockRequest, mockH)

      // Assert
      expect(result).toBe('redirected-with-takeover')
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/auth/insufficient-permissions'
      )
      expect(logger.error).toHaveBeenCalledWith(
        'Admin authorization error',
        expect.any(Error)
      )
    })
  })
})
