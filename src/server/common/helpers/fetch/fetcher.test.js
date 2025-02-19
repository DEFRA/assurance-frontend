import { fetcher } from './fetcher.js'
import { fetch as undiciFetch } from 'undici'

// Mock undici fetch
jest.mock('undici', () => ({
  fetch: jest.fn()
}))

// Mock config
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn().mockReturnValue('http://test-api')
  }
}))

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

describe('Fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET requests', () => {
    test('should make GET request and return JSON response', async () => {
      // Arrange
      const mockResponse = { data: 'test' }
      undiciFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve(mockResponse)
      })
      const mockRequest = {
        logger: mockLogger
      }

      // Act
      const result = await fetcher('/test-endpoint', {}, mockRequest)

      // Assert
      expect(result).toEqual(mockResponse)
      expect(undiciFetch).toHaveBeenCalledWith(
        'http://test-api/test-endpoint',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Making GET request to http://test-api/test-endpoint'
      )
    })

    test('should handle non-OK responses', async () => {
      // Arrange
      undiciFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })
      const mockRequest = {
        logger: mockLogger
      }

      // Act
      const result = await fetcher('/not-found', {}, mockRequest)

      // Assert
      expect(result).toMatchObject({
        isBoom: true,
        output: {
          statusCode: 404
        }
      })
    })

    test('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network error')
      undiciFetch.mockRejectedValue(networkError)
      const mockRequest = {
        logger: mockLogger
      }

      // Act & Assert
      await expect(fetcher('/test', {}, mockRequest)).rejects.toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500
        }
      })
      expect(mockLogger.error).toHaveBeenCalledWith(networkError)
    })
  })

  describe('POST requests', () => {
    test('should handle 201 Created response', async () => {
      // Arrange
      const mockResponse = { id: '123' }
      undiciFetch.mockResolvedValue({
        status: 201,
        json: () => Promise.resolve(mockResponse)
      })
      const mockRequest = {
        logger: mockLogger
      }

      // Act
      const result = await fetcher(
        '/test-endpoint',
        {
          method: 'POST',
          body: JSON.stringify({ test: 'data' })
        },
        mockRequest
      )

      // Assert
      expect(result).toEqual(mockResponse)
    })

    test('should handle non-JSON responses', async () => {
      // Arrange
      undiciFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: () => 'text/plain'
        }
      })
      const mockRequest = {
        logger: mockLogger
      }

      // Act
      const result = await fetcher('/test', { method: 'POST' }, mockRequest)

      // Assert
      expect(result).toEqual({
        ok: true,
        status: 200
      })
    })
  })

  describe('URL handling', () => {
    test('should handle full URLs', async () => {
      // Arrange
      const fullUrl = 'https://external-api.com/endpoint'
      undiciFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json'
        },
        json: () => Promise.resolve({})
      })
      const mockRequest = {
        logger: mockLogger
      }

      // Act
      await fetcher(fullUrl, {}, mockRequest)

      // Assert
      expect(undiciFetch).toHaveBeenCalledWith(fullUrl, expect.any(Object))
    })
  })
})
