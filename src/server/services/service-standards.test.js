import {
  getServiceStandards,
  getAllServiceStandards,
  deleteServiceStandard,
  restoreServiceStandard
} from './service-standards.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

// Mock dependencies
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('~/src/server/common/helpers/fetch/fetcher.js', () => ({
  fetcher: jest.fn()
}))

jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js', () => ({
  authedFetchJsonDecorator: jest.fn()
}))

// Mock config to return empty API version for backward compatibility in tests
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'api.version') {
        return '' // Return empty string to use legacy endpoints
      }
      return undefined
    })
  }
}))

describe('Service Standards Service', () => {
  let mockRequest
  let mockAuthedFetch

  beforeEach(() => {
    mockAuthedFetch = jest.fn()

    mockRequest = {
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    }

    // Setup authedFetchJsonDecorator to return our mock function
    authedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    jest.clearAllMocks()
  })

  describe('getServiceStandards', () => {
    test('should return service standards from API when available', async () => {
      // Arrange
      const mockApiResponse = [
        {
          id: 'std-1',
          number: '1',
          name: 'Understand users and their needs',
          description: 'Take time to understand user needs',
          url: 'https://example.com/standard-1'
        },
        {
          id: 'std-2',
          number: '2',
          name: 'Solve a whole problem for users',
          description:
            'Work towards creating a service that solves a whole problem',
          url: 'https://example.com/standard-2'
        }
      ]

      mockAuthedFetch.mockResolvedValue(mockApiResponse)

      // Act
      const result = await getServiceStandards(mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/serviceStandards')
      expect(result).toEqual(mockApiResponse)
      expect(logger.info).toHaveBeenCalledWith(
        { endpoint: '/serviceStandards' },
        'Fetching service standards from API'
      )
      expect(logger.info).toHaveBeenCalledWith(
        { count: mockApiResponse.length },
        'Service standards retrieved successfully'
      )
    })

    test('should use unauthenticated fetcher when no request provided', async () => {
      // Arrange
      const mockApiResponse = [
        {
          id: 'std-1',
          number: '1',
          name: 'Test Standard',
          description: 'Test description',
          url: 'https://example.com/standard-1'
        }
      ]

      fetcher.mockResolvedValue(mockApiResponse)

      // Act
      const result = await getServiceStandards()

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/serviceStandards')
      expect(result).toEqual(mockApiResponse)
      expect(logger.warn).toHaveBeenCalledWith(
        '[API_AUTH] No request context provided, using unauthenticated fetcher'
      )
    })

    test('should return empty array for null API response', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await getServiceStandards(mockRequest)

      // Assert
      expect(result).toEqual([])
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid data returned from API',
        { data: null }
      )
    })

    test('should return empty array for non-array API response', async () => {
      // Arrange
      const malformedResponse = { not: 'an array' }
      mockAuthedFetch.mockResolvedValue(malformedResponse)

      // Act
      const result = await getServiceStandards(mockRequest)

      // Assert
      expect(result).toEqual([])
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid data returned from API',
        { data: malformedResponse }
      )
    })

    test('should handle API errors by throwing', async () => {
      // Arrange
      const apiError = new Error('API connection failed')
      apiError.code = 'ECONNREFUSED'
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(getServiceStandards(mockRequest)).rejects.toThrow(
        'API connection failed'
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: apiError.message,
          stack: apiError.stack,
          code: apiError.code
        },
        'Failed to fetch service standards'
      )
    })

    test('should handle empty array response', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue([])

      // Act
      const result = await getServiceStandards(mockRequest)

      // Assert
      expect(result).toEqual([])
      expect(logger.info).toHaveBeenCalledWith(
        { count: 0 },
        'Service standards retrieved successfully'
      )
    })

    test('should handle network timeouts', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout')
      timeoutError.code = 'ETIMEDOUT'
      mockAuthedFetch.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(getServiceStandards(mockRequest)).rejects.toThrow(
        'Request timeout'
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: timeoutError.message,
          stack: timeoutError.stack,
          code: timeoutError.code
        },
        'Failed to fetch service standards'
      )
    })

    test('should handle server errors', async () => {
      // Arrange
      const serverError = new Error('Internal Server Error')
      serverError.status = 500
      mockAuthedFetch.mockRejectedValue(serverError)

      // Act & Assert
      await expect(getServiceStandards(mockRequest)).rejects.toThrow(
        'Internal Server Error'
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: serverError.message,
          stack: serverError.stack,
          code: undefined // Server error might not have a code
        },
        'Failed to fetch service standards'
      )
    })

    test('should handle large API responses', async () => {
      // Arrange
      const largeResponse = Array.from({ length: 100 }, (_, i) => ({
        id: `std-${i}`,
        number: `${i + 1}`,
        name: `Standard ${i + 1}`,
        description: `Description for standard ${i + 1}`,
        url: `https://example.com/standard-${i + 1}`
      }))

      mockAuthedFetch.mockResolvedValue(largeResponse)

      // Act
      const result = await getServiceStandards(mockRequest)

      // Assert
      expect(result).toEqual(largeResponse)
      expect(result).toHaveLength(100)
      expect(logger.info).toHaveBeenCalledWith(
        { count: 100 },
        'Service standards retrieved successfully'
      )
    })

    test('should handle API response with incomplete standard objects', async () => {
      // Arrange
      const incompleteResponse = [
        {
          id: 'std-1',
          number: '1'
          // Missing name, description, url
        },
        {
          id: 'std-2',
          name: 'Standard 2'
          // Missing number, description, url
        }
      ]

      mockAuthedFetch.mockResolvedValue(incompleteResponse)

      // Act
      const result = await getServiceStandards(mockRequest)

      // Assert
      expect(result).toEqual(incompleteResponse)
      expect(logger.info).toHaveBeenCalledWith(
        { count: 2 },
        'Service standards retrieved successfully'
      )
    })

    test('should preserve original error properties when logging', async () => {
      // Arrange
      const originalError = new Error('Original API Error')
      originalError.status = 404
      originalError.statusText = 'Not Found'
      originalError.data = { message: 'Standards endpoint not found' }

      mockAuthedFetch.mockRejectedValue(originalError)

      // Act & Assert
      await expect(getServiceStandards(mockRequest)).rejects.toThrow(
        'Original API Error'
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: originalError.message,
          stack: originalError.stack,
          code: undefined // This error doesn't have a code property
        },
        'Failed to fetch service standards'
      )
    })

    test('should use authenticated fetch when request is provided', async () => {
      // Arrange
      const mockStandards = [{ id: 'std-1', name: 'Test Standard' }]
      mockAuthedFetch.mockResolvedValue(mockStandards)

      // Act
      await getServiceStandards(mockRequest)

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        '[API_AUTH] Using authenticated fetcher for standards API'
      )
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/serviceStandards')
    })
  })

  describe('getAllServiceStandards', () => {
    test('should fetch all service standards including inactive with authenticated request', async () => {
      // Arrange
      const mockApiResponse = [
        {
          id: 'std-1',
          number: '1',
          name: 'Active Standard',
          active: true
        },
        {
          id: 'std-2',
          number: '2',
          name: 'Inactive Standard',
          active: false
        }
      ]

      mockAuthedFetch.mockResolvedValue(mockApiResponse)

      // Act
      const result = await getAllServiceStandards(mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/serviceStandards?includeInactive=true'
      )
      expect(result).toEqual(mockApiResponse)
      expect(logger.info).toHaveBeenCalledWith(
        { endpoint: '/serviceStandards?includeInactive=true' },
        'Fetching all service standards (including inactive) from API'
      )
    })

    test('should use unauthenticated fetcher when no request provided', async () => {
      // Arrange
      const mockApiResponse = [
        { id: 'std-1', name: 'Test Standard', active: true }
      ]

      fetcher.mockResolvedValue(mockApiResponse)

      // Act
      const result = await getAllServiceStandards()

      // Assert
      expect(fetcher).toHaveBeenCalledWith(
        '/serviceStandards?includeInactive=true'
      )
      expect(result).toEqual(mockApiResponse)
      expect(logger.warn).toHaveBeenCalledWith(
        '[API_AUTH] No request context provided, using unauthenticated fetcher'
      )
    })

    test('should return empty array for null API response', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await getAllServiceStandards(mockRequest)

      // Assert
      expect(result).toEqual([])
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid data returned from API',
        { data: null }
      )
    })

    test('should handle API errors by throwing', async () => {
      // Arrange
      const apiError = new Error('API connection failed')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(getAllServiceStandards(mockRequest)).rejects.toThrow(
        'API connection failed'
      )
    })
  })

  describe('deleteServiceStandard', () => {
    test('should delete service standard with authenticated request', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await deleteServiceStandard('std-1', mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/serviceStandards/std-1', {
        method: 'DELETE'
      })
      expect(result).toBe(true)
      expect(logger.info).toHaveBeenCalledWith(
        { endpoint: '/serviceStandards/std-1', id: 'std-1' },
        'Soft deleting service standard'
      )
      expect(logger.info).toHaveBeenCalledWith(
        { id: 'std-1' },
        'Service standard soft deleted successfully'
      )
    })

    test('should delete service standard without authenticated request', async () => {
      // Arrange
      fetcher.mockResolvedValue(null)

      // Act
      const result = await deleteServiceStandard('std-1')

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/serviceStandards/std-1', {
        method: 'DELETE'
      })
      expect(result).toBe(true)
    })

    test('should handle API errors when deleting', async () => {
      // Arrange
      const error = new Error('Delete failed')
      error.code = 'FORBIDDEN'
      mockAuthedFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(deleteServiceStandard('std-1', mockRequest)).rejects.toThrow(
        'Delete failed'
      )
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: error.message,
          stack: error.stack,
          code: error.code,
          id: 'std-1'
        },
        'Failed to soft delete service standard'
      )
    })
  })

  describe('restoreServiceStandard', () => {
    test('should restore service standard with authenticated request', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await restoreServiceStandard('std-1', mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/serviceStandards/std-1/restore',
        {
          method: 'POST'
        }
      )
      expect(result).toBe(true)
      expect(logger.info).toHaveBeenCalledWith(
        { endpoint: '/serviceStandards/std-1/restore', id: 'std-1' },
        'Restoring service standard'
      )
      expect(logger.info).toHaveBeenCalledWith(
        { id: 'std-1' },
        'Service standard restored successfully'
      )
    })

    test('should restore service standard without authenticated request', async () => {
      // Arrange
      fetcher.mockResolvedValue(null)

      // Act
      const result = await restoreServiceStandard('std-1')

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/serviceStandards/std-1/restore', {
        method: 'POST'
      })
      expect(result).toBe(true)
    })

    test('should handle API errors when restoring', async () => {
      // Arrange
      const error = new Error('Restore failed')
      error.code = 'NOT_FOUND'
      mockAuthedFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(
        restoreServiceStandard('std-1', mockRequest)
      ).rejects.toThrow('Restore failed')
      expect(logger.error).toHaveBeenCalledWith(
        {
          error: error.message,
          stack: error.stack,
          code: error.code,
          id: 'std-1'
        },
        'Failed to restore service standard'
      )
    })
  })
})
