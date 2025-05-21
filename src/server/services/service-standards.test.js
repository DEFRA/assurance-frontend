import { getServiceStandards } from './service-standards.js'

// First declare the mocks
jest.mock('~/src/server/common/helpers/fetch/fetcher.js', () => ({
  fetcher: jest.fn()
}))

// Define the mock logger module first
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Then initialize the mock logger
const mockLogger = jest.requireMock(
  '~/src/server/common/helpers/logging/logger.js'
).logger

// Then get references to the mocks
const { fetcher: mockFetch } = jest.requireMock(
  '~/src/server/common/helpers/fetch/fetcher.js'
)

describe('Service Standards service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getServiceStandards', () => {
    test('should fetch and return all service standards', async () => {
      // Arrange
      const mockStandards = [
        { number: 1, name: 'Standard 1', description: 'Description 1' },
        { number: 2, name: 'Standard 2', description: 'Description 2' }
      ]
      mockFetch.mockResolvedValue(mockStandards)

      // Act
      const result = await getServiceStandards()

      // Assert
      expect(result).toEqual(mockStandards)
      expect(mockFetch).toHaveBeenCalledWith('/serviceStandards')
      expect(mockLogger.info).toHaveBeenCalledWith(
        { endpoint: '/serviceStandards' },
        'Fetching service standards from API'
      )
    })

    test('should handle null response from API', async () => {
      // Arrange
      mockFetch.mockResolvedValue(null)

      // Act
      const result = await getServiceStandards()

      // Assert
      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid data returned from API',
        { data: null }
      )
    })

    test('should handle non-array response from API', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ error: 'Invalid data' })

      // Act
      const result = await getServiceStandards()

      // Assert
      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid data returned from API',
        { data: { error: 'Invalid data' } }
      )
    })

    test('should handle API errors', async () => {
      // Arrange
      const error = new Error('API Error')
      error.code = 'ECONNREFUSED'
      mockFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(getServiceStandards()).rejects.toThrow('API Error')
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          error: error.message,
          stack: error.stack,
          code: error.code
        },
        'Failed to fetch service standards'
      )
    })

    test('should handle network errors', async () => {
      // Arrange
      const error = new Error('Network Error')
      error.code = 'ETIMEDOUT'
      mockFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(getServiceStandards()).rejects.toThrow('Network Error')
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network Error',
          code: 'ETIMEDOUT'
        }),
        'Failed to fetch service standards'
      )
    })
  })
})
