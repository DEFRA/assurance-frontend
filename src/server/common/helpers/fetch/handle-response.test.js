import { handleResponse } from './handle-response.js'

describe('handleResponse', () => {
  test('should return payload and response for successful responses', () => {
    // Arrange
    const mockResponse = {
      res: { statusCode: 200 },
      payload: { data: 'test data' }
    }

    // Act
    const result = handleResponse(mockResponse)

    // Assert
    expect(result).toEqual({
      res: { statusCode: 200 },
      payload: { data: 'test data' }
    })
  })

  test('should return error for 4xx responses', () => {
    // Arrange
    const mockResponse = {
      res: { statusCode: 400 },
      payload: { message: 'Bad request' }
    }

    // Act
    const result = handleResponse(mockResponse)

    // Assert
    expect(result).toHaveProperty('res')
    expect(result).toHaveProperty('error')
    expect(result.error.isBoom).toBe(true)
    expect(result.error.output.statusCode).toBe(400)
    expect(result.error.data).toEqual({ message: 'Bad request' })
  })

  test('should return error for 5xx responses', () => {
    // Arrange
    const mockResponse = {
      res: { statusCode: 500 },
      payload: { message: 'Server error' }
    }

    // Act
    const result = handleResponse(mockResponse)

    // Assert
    expect(result).toHaveProperty('res')
    expect(result).toHaveProperty('error')
    expect(result.error.isBoom).toBe(true)
    expect(result.error.output.statusCode).toBe(500)
    expect(result.error.data).toEqual({ message: 'Server error' })
  })

  test('should use default error message if payload message is not provided', () => {
    // Arrange
    const mockResponse = {
      res: { statusCode: 404 },
      payload: {}
    }

    // Act
    const result = handleResponse(mockResponse)

    // Assert
    expect(result).toHaveProperty('error')
    expect(result.error.message).toContain('Request failed')
  })
})
