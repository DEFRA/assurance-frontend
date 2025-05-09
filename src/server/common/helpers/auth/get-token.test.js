import { getBearerToken } from './get-token.js'

// Mock the logger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    error: jest.fn()
  })
}))

describe('Auth Token Helpers', () => {
  describe('getBearerToken', () => {
    test('should return null if request is not authenticated', async () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: false
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should return token from credentials if available', async () => {
      // Arrange
      const tokenValue = 'test-token-value'
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            token: tokenValue
          }
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBe(tokenValue)
    })

    test('should clean Bearer prefix from token in credentials', async () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            token: 'Bearer test-token-value'
          }
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBe('test-token-value')
    })

    test('should get token from session cache if not in credentials', async () => {
      // Arrange
      const sessionTokenValue = 'session-token-value'
      const mockSessionCache = {
        get: jest.fn().mockResolvedValue({ token: sessionTokenValue })
      }
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            id: 'user-123'
          }
        },
        server: {
          app: {
            sessionCache: mockSessionCache
          }
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(mockSessionCache.get).toHaveBeenCalledWith('user-123')
      expect(result).toBe(sessionTokenValue)
    })

    test('should clean Bearer prefix from token in session cache', async () => {
      // Arrange
      const mockSessionCache = {
        get: jest
          .fn()
          .mockResolvedValue({ token: 'Bearer session-token-value' })
      }
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            id: 'user-123'
          }
        },
        server: {
          app: {
            sessionCache: mockSessionCache
          }
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBe('session-token-value')
    })

    test('should return null if no token found in credentials or session cache', async () => {
      // Arrange
      const mockSessionCache = {
        get: jest.fn().mockResolvedValue({ noToken: true })
      }
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            id: 'user-123'
          }
        },
        server: {
          app: {
            sessionCache: mockSessionCache
          }
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should handle cache errors gracefully', async () => {
      // Arrange
      const mockSessionCache = {
        get: jest.fn().mockRejectedValue(new Error('Cache error'))
      }
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            id: 'user-123'
          }
        },
        server: {
          app: {
            sessionCache: mockSessionCache
          }
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should handle general errors gracefully', async () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            // Credentials that will cause an error when accessed
            get token() {
              throw new Error('Unexpected error')
            }
          }
        }
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should handle missing server or session cache', async () => {
      // Arrange
      const mockRequest = {
        auth: {
          isAuthenticated: true,
          credentials: {
            id: 'user-123'
            // No token here
          }
        }
        // No server.app.sessionCache
      }

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should handle missing auth or credentials objects', async () => {
      // Arrange
      const mockRequest = {}

      // Act
      const result = await getBearerToken(mockRequest)

      // Assert
      expect(result).toBeNull()
    })
  })
})
