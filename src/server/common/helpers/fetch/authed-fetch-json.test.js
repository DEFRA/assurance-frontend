import {
  authedFetchJsonDecorator,
  authedFetchJson
} from './authed-fetch-json.js'
import { config } from '~/src/config/config.js'
import { getBearerToken } from '~/src/server/common/helpers/auth/get-token.js'

// Mock dependencies
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}))

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

jest.mock('~/src/server/common/helpers/auth/get-token.js', () => ({
  getBearerToken: jest.fn()
}))

// Mock global fetch
global.fetch = jest.fn()

// Initialize mock logger
const mockLogger = jest
  .requireMock('~/src/server/common/helpers/logging/logger.js')
  .createLogger()

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
      json: jest.fn().mockResolvedValue({ data: 'test' }),
      text: jest.fn().mockResolvedValue(JSON.stringify({ data: 'test' }))
    })
  })

  describe('authedFetchJson', () => {
    test('should fetch data with token', async () => {
      // Arrange
      const url = '/data'
      const token = 'test-token'

      // Act
      const result = await authedFetchJson(url, token)

      // Assert
      expect(result).toEqual({ data: 'test' })
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${url}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          })
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Added authorization header to request',
        expect.objectContaining({
          url: `${mockApiUrl}${url}`,
          tokenLength: token.length
        })
      )
    })

    test('should clean up token with "Bearer" prefix', async () => {
      // Arrange
      const url = '/data'
      const token = 'Bearer test-token'

      // Act
      await authedFetchJson(url, token)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${url}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Token was cleaned up before sending to API',
        expect.objectContaining({
          originalLength: token.length,
          cleanedLength: 'test-token'.length
        })
      )
    })

    test('should use absolute URL if provided', async () => {
      // Arrange
      const url = 'https://other-api.example.org/data'
      const token = 'test-token'

      // Act
      await authedFetchJson(url, token)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(url, expect.any(Object))
    })

    test('should warn when no token is provided', async () => {
      // Arrange
      const url = '/data'

      // Act
      await authedFetchJson(url, null)

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No token provided for authenticated request',
        { url: `${mockApiUrl}${url}` }
      )
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${url}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      // Verify no Authorization header was set
      expect(
        global.fetch.mock.calls[0][1].headers.Authorization
      ).toBeUndefined()
    })

    test('should merge custom options and headers', async () => {
      // Arrange
      const url = '/data'
      const token = 'test-token'
      const options = {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      }

      // Act
      await authedFetchJson(url, token, options)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}${url}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Custom-Header': 'custom-value'
          })
        })
      )
    })

    test('should handle non-JSON responses', async () => {
      // Arrange
      const url = '/text-data'
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('text/plain')
        },
        text: jest.fn().mockResolvedValue('Plain text response')
      })

      // Act
      const result = await authedFetchJson(url, 'test-token')

      // Assert
      expect(result).toBe('Plain text response')
    })

    test('should handle API errors', async () => {
      // Arrange
      const url = '/data'
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error occurred')
      })

      // Act & Assert
      await expect(authedFetchJson(url, 'test-token')).rejects.toThrow(
        'API Error: 500 Server error occurred'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching data from API'),
        expect.objectContaining({
          url: `${mockApiUrl}${url}`
        })
      )
    })

    test('should handle authentication errors', async () => {
      // Arrange
      const url = '/data'
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('Invalid token')
      })

      // Act & Assert
      await expect(authedFetchJson(url, 'test-token')).rejects.toThrow(
        'API Error: 401 Invalid token'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Authentication error - Token may be invalid or expired',
        expect.objectContaining({
          status: 401,
          error: 'Invalid token',
          url: `${mockApiUrl}${url}`
        })
      )
    })

    test('should handle fetch errors', async () => {
      // Arrange
      const url = '/data'
      const error = new Error('Network error')
      global.fetch.mockRejectedValue(error)

      // Act & Assert
      await expect(authedFetchJson(url, 'test-token')).rejects.toThrow(
        'Network error'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching data from API: Network error',
        expect.objectContaining({
          url: `${mockApiUrl}${url}`,
          error: 'Network error'
        })
      )
    })
  })

  describe('authedFetchJsonDecorator', () => {
    test('should get token from request and use it for fetch', async () => {
      // Arrange
      const request = { auth: { credentials: { token: 'from-request' } } }
      const mockToken = 'bearer-token-from-auth'
      getBearerToken.mockResolvedValue(mockToken)

      // Act
      const decoratedFetch = authedFetchJsonDecorator(request)
      await decoratedFetch('/data')

      // Assert
      expect(getBearerToken).toHaveBeenCalledWith(request)
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/data`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`
          })
        })
      )
    })

    test('should handle token retrieval failures', async () => {
      // Arrange
      const request = {}
      getBearerToken.mockRejectedValue(new Error('Token retrieval failed'))

      // Act
      const decoratedFetch = authedFetchJsonDecorator(request)
      await decoratedFetch('/data')

      // Assert
      expect(getBearerToken).toHaveBeenCalledWith(request)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get bearer token'
      )
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/data`,
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String)
          })
        })
      )
    })

    test('should pass custom options to fetch', async () => {
      // Arrange
      const request = {}
      getBearerToken.mockResolvedValue('test-token')
      const options = {
        method: 'POST',
        body: JSON.stringify({ data: 'test' })
      }

      // Act
      const decoratedFetch = authedFetchJsonDecorator(request)
      await decoratedFetch('/data', options)

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/data`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
          headers: expect.objectContaining({
            Authorization: `Bearer test-token`
          })
        })
      )
    })
  })
})
