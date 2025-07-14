import { catchAll } from './errors.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

// Mock the logger
const mockLogger = {
  error: jest.fn()
}

describe('errors helper', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      logger: mockLogger
    }

    mockH = {
      continue: 'continue-response',
      view: jest.fn().mockReturnValue({
        code: jest.fn().mockReturnValue('view-response')
      })
    }
  })

  describe('catchAll', () => {
    test('should continue when response is not a Boom error', () => {
      // Arrange
      mockRequest.response = {
        // Normal response without isBoom property
        data: 'some data'
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(result).toBe('continue-response')
      expect(mockH.view).not.toHaveBeenCalled()
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should handle 404 Not Found error', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: statusCodes.notFound
        },
        stack: 'error stack trace'
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/not-found', {
        pageTitle: 'Page not found',
        heading: statusCodes.notFound,
        message: 'Page not found'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).not.toHaveBeenCalled() // 404 is not >= 500
    })

    test('should handle 403 Forbidden error', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: statusCodes.forbidden
        }
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/forbidden', {
        pageTitle: 'Forbidden',
        heading: statusCodes.forbidden,
        message: 'Forbidden'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should handle 401 Unauthorized error', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: statusCodes.unauthorized
        }
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Unauthorized',
        heading: statusCodes.unauthorized,
        message: 'Unauthorized'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should handle 400 Bad Request error', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: statusCodes.badRequest
        }
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Bad Request',
        heading: statusCodes.badRequest,
        message: 'Bad Request'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should handle unknown error status codes with default message', () => {
      // Arrange
      const unknownStatusCode = 418 // I'm a teapot
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: unknownStatusCode
        }
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Something went wrong',
        heading: unknownStatusCode,
        message: 'Something went wrong'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should log errors for server errors (>= 500)', () => {
      // Arrange
      const errorStack = 'Internal server error stack trace'
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: statusCodes.internalServerError
        },
        stack: errorStack
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/server-error', {
        pageTitle: 'Something went wrong',
        heading: statusCodes.internalServerError,
        message: 'Something went wrong'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).toHaveBeenCalledWith(errorStack)
    })

    test('should handle server error without stack trace', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: statusCodes.internalServerError
        }
        // No stack property
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/server-error', {
        pageTitle: 'Something went wrong',
        heading: statusCodes.internalServerError,
        message: 'Something went wrong'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).toHaveBeenCalledWith(undefined)
    })

    test('should handle 502 Bad Gateway error', () => {
      // Arrange
      const badGatewayCode = 502
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: badGatewayCode
        },
        stack: 'Gateway error stack'
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/server-error', {
        pageTitle: 'Something went wrong',
        heading: badGatewayCode,
        message: 'Something went wrong'
      })
      expect(result).toBe('view-response')
      expect(mockLogger.error).toHaveBeenCalledWith('Gateway error stack')
    })

    test('should handle response with undefined statusCode', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: undefined
        }
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('error/index', {
        pageTitle: 'Something went wrong',
        heading: undefined,
        message: 'Something went wrong'
      })
      expect(result).toBe('view-response')
    })

    test('should handle response with missing output object', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: null
      }

      // Act & Assert - Should throw error due to accessing statusCode on null
      expect(() => catchAll(mockRequest, mockH)).toThrow()
    })

    test('should handle exactly borderline status codes for template selection', () => {
      // Test exactly 500 (boundary for server error template)
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: 500
        }
      }

      catchAll(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith(
        'errors/server-error',
        expect.any(Object)
      )

      // Reset mock
      mockH.view.mockClear()

      // Test 499 (just below server error threshold)
      mockRequest.response.output.statusCode = 499
      catchAll(mockRequest, mockH)
      expect(mockH.view).toHaveBeenCalledWith('error/index', expect.any(Object))
    })

    test('should handle response with null stack property', () => {
      // Arrange
      mockRequest.response = {
        isBoom: true,
        output: {
          statusCode: statusCodes.internalServerError
        },
        stack: null
      }

      // Act
      const result = catchAll(mockRequest, mockH)

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(null)
      expect(result).toBe('view-response')
    })

    test('should handle all specific status codes that map to specific templates', () => {
      const testCases = [
        { status: statusCodes.notFound, expectedTemplate: 'errors/not-found' },
        { status: statusCodes.forbidden, expectedTemplate: 'errors/forbidden' },
        {
          status: statusCodes.internalServerError,
          expectedTemplate: 'errors/server-error'
        },
        {
          status: statusCodes.badGateway,
          expectedTemplate: 'errors/server-error'
        },
        {
          status: statusCodes.serviceUnavailable,
          expectedTemplate: 'errors/server-error'
        }
      ]

      testCases.forEach(({ status, expectedTemplate }) => {
        mockH.view.mockClear()
        mockRequest.response = {
          isBoom: true,
          output: { statusCode: status }
        }

        catchAll(mockRequest, mockH)
        expect(mockH.view).toHaveBeenCalledWith(
          expectedTemplate,
          expect.any(Object)
        )
      })
    })
  })
})
