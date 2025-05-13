import { fetch as undiciFetch } from 'undici'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher, getApiUrl } from './fetcher.js'

// Mock dependencies
jest.mock('undici', () => ({
  fetch: jest.fn()
}))

// Need to mock config.get to return appropriate values for logger-options.js
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'api.baseUrl') return 'https://api.example.com'
      if (key === 'log')
        return {
          enabled: true,
          level: 'info',
          format: 'pino-pretty',
          redact: []
        }
      if (key === 'serviceName') return 'test-service'
      if (key === 'serviceVersion') return '1.0.0'
      if (key === 'env') return 'test'
      return undefined
    })
  }
}))

// Mock createLogger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn()
}))

// Mock AbortSignal.timeout
global.AbortSignal = {
  timeout: jest.fn().mockReturnValue({ aborted: false })
}

describe('fetcher', () => {
  const mockApiUrl = 'https://api.example.com'
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  }
  const mockRequest = {
    logger: mockLogger
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mocks
    createLogger.mockReturnValue(mockLogger)
  })

  test('should return data for successful JSON response', async () => {
    // Arrange
    const mockResponseData = { data: 'test data' }
    const mockResponse = {
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue(mockResponseData)
    }
    undiciFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await fetcher('/test', {}, mockRequest)

    // Assert
    expect(undiciFetch).toHaveBeenCalledWith(
      `${mockApiUrl}/test`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        signal: expect.anything()
      })
    )
    expect(mockResponse.json).toHaveBeenCalled()
    expect(result).toEqual(mockResponseData)
    expect(mockLogger.info).toHaveBeenCalledTimes(2)
  })

  test('should handle 201 Created responses', async () => {
    // Arrange
    const mockResponseData = { id: '123', created: true }
    const mockResponse = {
      ok: true,
      status: 201,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue(mockResponseData)
    }
    undiciFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await fetcher('/test', { method: 'POST' }, mockRequest)

    // Assert
    expect(undiciFetch).toHaveBeenCalledWith(
      `${mockApiUrl}/test`,
      expect.objectContaining({
        method: 'POST'
      })
    )
    expect(mockResponse.json).toHaveBeenCalled()
    expect(result).toEqual(mockResponseData)
  })

  test('should handle non-JSON responses', async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('text/plain')
      }
    }
    undiciFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await fetcher('/test', {}, mockRequest)

    // Assert
    expect(result).toEqual({ ok: true, status: 200 })
  })

  test('should handle error responses', async () => {
    // Arrange
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {
        get: jest.fn()
      }
    }
    undiciFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await fetcher('/test', {}, mockRequest)

    // Assert
    expect(result).toHaveProperty('isBoom', true)
    expect(result.output.statusCode).toBe(404)
    expect(result.message).toContain('Not Found')
  })

  test('should handle network errors', async () => {
    // Arrange
    const networkError = new Error('Network error')
    undiciFetch.mockRejectedValue(networkError)

    // Act
    const result = await fetcher('/test', {}, mockRequest)

    // Assert
    expect(result).toHaveProperty('isBoom', true)
    expect(result.output.statusCode).toBe(503)
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('should handle timeout errors', async () => {
    // Arrange
    const timeoutError = new Error('Timeout')
    timeoutError.name = 'AbortError'
    undiciFetch.mockRejectedValue(timeoutError)

    // Act
    const result = await fetcher('/test', {}, mockRequest)

    // Assert
    expect(result).toHaveProperty('isBoom', true)
    expect(result.output.statusCode).toBe(503)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${mockApiUrl}/test` }),
      'API request timed out after 5 seconds'
    )
  })

  test('should handle connection refused errors', async () => {
    // Arrange
    const connError = new Error('Connection refused')
    connError.code = 'ECONNREFUSED'
    undiciFetch.mockRejectedValue(connError)

    // Act
    const result = await fetcher('/test', {}, mockRequest)

    // Assert
    expect(result).toHaveProperty('isBoom', true)
    expect(result.output.statusCode).toBe(503)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${mockApiUrl}/test` }),
      'API connection refused - service may be unavailable'
    )
  })

  test('should use absolute URL if provided', async () => {
    // Arrange
    const absoluteUrl = 'https://other-api.com/test'
    const mockResponse = {
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue({ data: 'test' })
    }
    undiciFetch.mockResolvedValue(mockResponse)

    // Act
    await fetcher(absoluteUrl, {}, mockRequest)

    // Assert
    expect(undiciFetch).toHaveBeenCalledWith(absoluteUrl, expect.anything())
  })

  test('should create logger if not provided in request', async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue({ data: 'test' })
    }
    undiciFetch.mockResolvedValue(mockResponse)

    // Act
    await fetcher('/test')

    // Assert
    expect(createLogger).toHaveBeenCalled()
  })

  test('getApiUrl should return the configured API URL', () => {
    // Act
    const result = getApiUrl()

    // Assert
    expect(result).toBe('https://api.example.com')
    expect(config.get).toHaveBeenCalledWith('api.baseUrl')
  })
})
