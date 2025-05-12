import {
  authedFetchJsonDecorator,
  authedFetchJson
} from './authed-fetch-json.js'
import { config } from '~/src/config/config.js'
import { getBearerToken } from '~/src/server/common/helpers/auth/get-token.js'

// Mock dependencies
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

jest.mock('~/src/server/common/helpers/auth/get-token.js', () => ({
  getBearerToken: jest.fn()
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}))

// Mock global fetch
global.fetch = jest.fn()

describe('Authenticated Fetch JSON', () => {
  const mockApiUrl = 'https://api.example.com'

  beforeEach(() => {
    jest.clearAllMocks()
    config.get.mockImplementation((key) => {
      if (key === 'api.baseUrl') {
        return mockApiUrl
      }
      return null
    })

    // Setup default mock for fetch
    global.fetch.mockReset()
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue({ data: 'test' })
    })
  })

  describe('authedFetchJson', () => {
    test('should fetch and return JSON response with token', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should clean up token if it already has Bearer prefix', async () => {
      // Arrange
      const mockToken = '  Bearer   test-token  '
      const mockUrl = '/test-endpoint'

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should use full URL if provided', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = 'https://another-api.example.com/endpoint'

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        mockUrl,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should warn when no token is provided', async () => {
      // Arrange
      const mockUrl = '/test-endpoint'

      // Act
      const result = await authedFetchJson(mockUrl, null)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should merge provided options with defaults', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'
      const mockOptions = {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      }

      // Act
      const result = await authedFetchJson(mockUrl, mockToken, mockOptions)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
            'X-Custom-Header': 'custom-value'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should handle non-JSON responses', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'

      // Setup fetch to return text
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('text/plain')
        },
        text: jest.fn().mockResolvedValue('Plain text response')
      })

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(result).toBe('Plain text response')
    })

    test('should handle error responses', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'

      // Setup fetch to return error
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request')
      })

      // Act & Assert
      await expect(authedFetchJson(mockUrl, mockToken)).rejects.toThrow(
        'API Error: 400 Bad request'
      )
    })

    test('should handle authentication errors', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'

      // Setup fetch to return auth error
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized')
      })

      // Act & Assert
      await expect(authedFetchJson(mockUrl, mockToken)).rejects.toThrow(
        'API Error: 401 Unauthorized'
      )
    })

    test('should handle network errors', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'

      // Setup fetch to throw network error
      global.fetch.mockRejectedValue(new Error('Network error'))

      // Act & Assert
      await expect(authedFetchJson(mockUrl, mockToken)).rejects.toThrow(
        'Network error'
      )
    })

    test('should handle empty string token', async () => {
      // Arrange
      const mockToken = ''
      const mockUrl = '/test-endpoint'

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should handle non-string token', async () => {
      // Arrange
      const mockToken = 12345
      const mockUrl = '/test-endpoint'

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer 12345'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should handle options.headers as non-object', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'
      const mockOptions = {
        headers: 'not-an-object'
      }

      // Act
      const result = await authedFetchJson(mockUrl, mockToken, mockOptions)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should handle missing content-type header', async () => {
      // Arrange
      const mockToken = 'test-token'
      const mockUrl = '/test-endpoint'
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue(undefined)
        },
        text: jest.fn().mockResolvedValue('No content-type')
      })

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(result).toBe('No content-type')
    })

    test('should handle token with extra whitespace and Bearer prefix', async () => {
      // Arrange
      const mockToken = '  Bearer   test-token  '
      const mockUrl = '/test-endpoint'
      const mockApiUrl = 'https://api.example.com'
      const mockResponse = { data: 'test' }

      // Mock fetch response
      global.fetch.mockResolvedValue({
        ok: true,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve(mockResponse)
      })

      // Act
      const result = await authedFetchJson(mockUrl, mockToken)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token'
          }
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('authedFetchJsonDecorator', () => {
    test('should return a function that fetches with the request token', async () => {
      // Arrange
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockUrl = '/test-endpoint'

      // Mock getBearerToken to return a token
      getBearerToken.mockResolvedValue('test-token-from-request')

      // Act
      const decoratedFetch = authedFetchJsonDecorator(mockRequest)
      const result = await decoratedFetch(mockUrl)

      // Assert
      expect(getBearerToken).toHaveBeenCalledWith(mockRequest)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-from-request'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should handle error getting token', async () => {
      // Arrange
      const mockRequest = { auth: { credentials: null } }
      const mockUrl = '/test-endpoint'

      // Mock getBearerToken to throw error
      getBearerToken.mockRejectedValue(new Error('Token error'))

      // Act
      const decoratedFetch = authedFetchJsonDecorator(mockRequest)
      const result = await decoratedFetch(mockUrl)

      // Assert
      expect(getBearerToken).toHaveBeenCalledWith(mockRequest)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${mockUrl}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual({ data: 'test' })
    })

    test('should handle synchronous error in getBearerToken', async () => {
      // Arrange
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockUrl = '/test-endpoint'
      getBearerToken.mockImplementation(() => {
        throw new Error('Sync error')
      })

      // Act
      const decoratedFetch = authedFetchJsonDecorator(mockRequest)
      const result = await decoratedFetch(mockUrl)

      // Assert
      expect(result).toEqual({ data: 'test' })
    })
  })
})
