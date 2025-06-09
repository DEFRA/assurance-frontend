import { getBearerToken } from './get-token.js'

// Mock the logger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn()
  }
}))

describe('Auth Token Helpers', () => {
  describe('getBearerToken', () => {
    test('should return null if request is not authenticated', () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: false
        },
        headers: {}
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should return token from credentials if available', () => {
      // Arrange
      const tokenValue = 'test-token-value'
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            token: tokenValue
          }
        },
        headers: {}
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBe(tokenValue)
    })

    test('should clean Bearer prefix from token in credentials', () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            token: 'Bearer test-token-value'
          }
        },
        headers: {}
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBe('test-token-value')
    })

    test('should return token from Authorization header if no credentials', () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: false
        },
        headers: {
          authorization: 'Bearer header-token-value'
        }
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBe('header-token-value')
    })

    test('should return null if no token found anywhere', () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: false
        },
        headers: {}
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should prefer credentials over header', () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            token: 'credentials-token'
          }
        },
        headers: {
          authorization: 'Bearer header-token'
        }
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBe('credentials-token')
    })

    test('should handle missing auth object', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Bearer fallback-token'
        }
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBe('fallback-token')
    })

    test('should handle malformed Authorization header', () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: false
        },
        headers: {
          authorization: 'Basic not-bearer-token'
        }
      }

      // Act
      const result = getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })
  })
})
