import { getPrioritisationData } from './insights.js'

// First declare the mocks
jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js', () => ({
  authedFetchJsonDecorator: jest.fn()
}))

// Define the mock logger module
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock config module
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'api.version') {
        return 'v1.0'
      }
      return undefined
    })
  }
}))

// Get references to the mocks
const { authedFetchJsonDecorator: mockAuthedFetchJsonDecorator } =
  jest.requireMock('~/src/server/common/helpers/fetch/authed-fetch-json.js')

const mockLogger = jest.requireMock(
  '~/src/server/common/helpers/logging/logger.js'
).logger

// Mock data
const mockPrioritisationResponse = {
  deliveriesNeedingStandardUpdates: [
    {
      id: 'proj-1',
      name: 'Animal Health Platform',
      status: 'AMBER',
      lastServiceStandardUpdate: '2025-10-02T10:30:00Z',
      daysSinceStandardUpdate: 60
    },
    {
      id: 'proj-2',
      name: 'Farming Investment Fund Portal',
      status: 'RED',
      lastServiceStandardUpdate: '2025-10-20T10:30:00Z',
      daysSinceStandardUpdate: 42
    }
  ],
  deliveriesWithWorseningStandards: [
    {
      id: 'proj-2',
      name: 'Farming Investment Fund Portal',
      status: 'RED',
      standardChanges: [
        {
          standardNumber: 1,
          standardName: 'Understand users and their needs',
          statusHistory: ['GREEN', 'GREEN', 'AMBER']
        },
        {
          standardNumber: 5,
          standardName: 'Make sure everyone can use the service',
          statusHistory: ['RED']
        }
      ]
    }
  ]
}

describe('Insights Service', () => {
  let mockRequest
  let mockAuthedFetch

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock request with logger
    mockRequest = {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }
    }

    // Create mock authed fetch function
    mockAuthedFetch = jest.fn()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  describe('getPrioritisationData', () => {
    it('should return prioritisation data from API', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)

      // Act
      const result = await getPrioritisationData(mockRequest)

      // Assert
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/insights/prioritisation?standardThreshold=14&worseningDays=14'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: expect.any(String) }),
        'Fetching prioritisation data from API'
      )
      expect(result).toEqual(mockPrioritisationResponse)
    })

    it('should use default thresholds when options not provided', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)

      // Act
      await getPrioritisationData(mockRequest)

      // Assert - should use default values of 14
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        expect.stringContaining('standardThreshold=14')
      )
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        expect.stringContaining('worseningDays=14')
      )
    })

    it('should use custom thresholds when provided', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)
      const options = { standardThreshold: 7, worseningDays: 30 }

      // Act
      await getPrioritisationData(mockRequest, options)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/insights/prioritisation?standardThreshold=7&worseningDays=30'
      )
    })

    it('should return empty arrays when API returns null', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await getPrioritisationData(mockRequest)

      // Assert
      expect(result).toEqual({
        deliveriesNeedingStandardUpdates: [],
        deliveriesWithWorseningStandards: []
      })
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No data returned from prioritisation API'
      )
    })

    it('should throw error when request is not provided', async () => {
      // Act & Assert
      await expect(getPrioritisationData(null)).rejects.toThrow(
        'Request context is required for prioritisation API'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        'No request context provided for prioritisation API'
      )
    })

    it('should throw error when request is undefined', async () => {
      // Act & Assert
      await expect(getPrioritisationData(undefined)).rejects.toThrow(
        'Request context is required for prioritisation API'
      )
    })

    it('should log success message with counts', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)

      // Act
      await getPrioritisationData(mockRequest)

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          needingUpdates: 2,
          worsening: 1
        }),
        'Prioritisation data retrieved successfully'
      )
    })

    it('should handle empty response arrays', async () => {
      // Arrange
      const emptyResponse = {
        deliveriesNeedingStandardUpdates: [],
        deliveriesWithWorseningStandards: []
      }
      mockAuthedFetch.mockResolvedValue(emptyResponse)

      // Act
      const result = await getPrioritisationData(mockRequest)

      // Assert
      expect(result).toEqual(emptyResponse)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          needingUpdates: 0,
          worsening: 0
        }),
        'Prioritisation data retrieved successfully'
      )
    })

    it('should handle response with missing arrays gracefully', async () => {
      // Arrange - response with undefined arrays
      const partialResponse = {}
      mockAuthedFetch.mockResolvedValue(partialResponse)

      // Act
      const result = await getPrioritisationData(mockRequest)

      // Assert - should still return the response (controller handles defaults)
      expect(result).toEqual(partialResponse)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          needingUpdates: 0,
          worsening: 0
        }),
        'Prioritisation data retrieved successfully'
      )
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const apiError = new Error('API connection failed')
      apiError.code = 'ECONNREFUSED'
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(getPrioritisationData(mockRequest)).rejects.toThrow(
        'API connection failed'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'API connection failed',
          stack: expect.any(String),
          code: 'ECONNREFUSED'
        }),
        'Failed to fetch prioritisation data'
      )
    })

    it('should throw error on network timeout', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout')
      timeoutError.code = 'ETIMEDOUT'
      mockAuthedFetch.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(getPrioritisationData(mockRequest)).rejects.toThrow(
        'Request timeout'
      )
    })

    it('should log authenticated fetcher usage', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)

      // Act
      await getPrioritisationData(mockRequest)

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('for insights API')
      )
    })

    it('should handle partial custom options', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)

      // Act - only provide standardThreshold
      await getPrioritisationData(mockRequest, { standardThreshold: 21 })

      // Assert - worseningDays should default to 14
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/insights/prioritisation?standardThreshold=21&worseningDays=14'
      )
    })

    it('should handle only worseningDays option', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)

      // Act - only provide worseningDays
      await getPrioritisationData(mockRequest, { worseningDays: 7 })

      // Assert - standardThreshold should default to 14
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/insights/prioritisation?standardThreshold=14&worseningDays=7'
      )
    })

    it('should correctly format query parameters as strings', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockPrioritisationResponse)

      // Act
      await getPrioritisationData(mockRequest, {
        standardThreshold: 0,
        worseningDays: 0
      })

      // Assert - even 0 values should be included as strings
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/insights/prioritisation?standardThreshold=0&worseningDays=0'
      )
    })
  })
})
