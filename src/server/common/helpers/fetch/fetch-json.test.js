import Wreck from '@hapi/wreck'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../../../../config/config.js'
import { handleResponse } from './handle-response.js'
import { fetchJson } from './fetch-json.js'

// Mock dependencies
jest.mock('@hapi/wreck')
jest.mock('@defra/hapi-tracing')
jest.mock('../../../../config/config.js')
jest.mock('./handle-response.js')

describe('fetchJson', () => {
  const mockUrl = 'https://example.com/api'
  const mockResponse = {
    res: { statusCode: 200 },
    payload: { data: 'test data' }
  }
  const mockHandledResponse = {
    res: mockResponse.res,
    payload: mockResponse.payload
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mocks
    config.get.mockReturnValue('X-Trace-ID')
    getTraceId.mockReturnValue('test-trace-id')
    Wreck.get.mockResolvedValue(mockResponse)
    Wreck.post.mockResolvedValue(mockResponse)
    handleResponse.mockReturnValue(mockHandledResponse)
  })

  test('should make a GET request and return handled response', async () => {
    // Act
    const result = await fetchJson(mockUrl)

    // Assert
    expect(Wreck.get).toHaveBeenCalledWith(mockUrl, {
      json: true,
      headers: {
        'X-Trace-ID': 'test-trace-id',
        'Content-Type': 'application/json'
      }
    })
    expect(handleResponse).toHaveBeenCalledWith(mockResponse)
    expect(result).toEqual(mockHandledResponse)
  })

  test('should make a POST request with options', async () => {
    // Arrange
    const options = {
      method: 'POST',
      payload: { foo: 'bar' },
      headers: {
        'Custom-Header': 'custom-value'
      }
    }

    // Act
    const result = await fetchJson(mockUrl, options)

    // Assert
    expect(Wreck.post).toHaveBeenCalledWith(mockUrl, {
      ...options,
      json: true,
      headers: {
        'Custom-Header': 'custom-value',
        'X-Trace-ID': 'test-trace-id',
        'Content-Type': 'application/json'
      }
    })
    expect(handleResponse).toHaveBeenCalledWith(mockResponse)
    expect(result).toEqual(mockHandledResponse)
  })

  test('should handle non-JSON responses', async () => {
    // Arrange
    const nonJsonResponse = {
      res: { statusCode: 200 },
      payload: 'plain text response'
    }
    Wreck.get.mockResolvedValue(nonJsonResponse)
    handleResponse.mockReturnValue({
      res: nonJsonResponse.res,
      payload: nonJsonResponse.payload
    })

    // Act
    const result = await fetchJson(mockUrl)

    // Assert
    expect(handleResponse).toHaveBeenCalledWith(nonJsonResponse)
    expect(result).toEqual({
      res: nonJsonResponse.res,
      payload: nonJsonResponse.payload
    })
  })

  test('should handle error status codes', async () => {
    // Arrange
    const errorResponse = {
      res: { statusCode: 404 },
      payload: { message: 'Not found' }
    }
    Wreck.get.mockResolvedValue(errorResponse)
    handleResponse.mockReturnValue({
      res: errorResponse.res,
      error: new Error('Not found')
    })

    // Act
    const result = await fetchJson(mockUrl)

    // Assert
    expect(handleResponse).toHaveBeenCalledWith(errorResponse)
    expect(result).toHaveProperty('error')
  })

  test('should handle network errors', async () => {
    // Arrange
    const networkError = new Error('Network error')
    Wreck.get.mockRejectedValue(networkError)

    // Act & Assert
    await expect(fetchJson(mockUrl)).rejects.toThrow('Network error')
  })

  test('should add tracing headers when trace ID is available', async () => {
    // Act
    await fetchJson(mockUrl)

    // Assert
    expect(Wreck.get).toHaveBeenCalledWith(
      mockUrl,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Trace-ID': 'test-trace-id'
        })
      })
    )
  })

  test('should not add tracing headers when trace ID is not available', async () => {
    // Arrange
    getTraceId.mockReturnValue(null)

    // Act
    await fetchJson(mockUrl)

    // Assert
    expect(Wreck.get).toHaveBeenCalledWith(
      mockUrl,
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'X-Trace-ID': expect.anything()
        })
      })
    )
  })
})
