import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import {
  getProfessions,
  getProfessionById,
  deleteProfession
} from './professions.js'

// Mock dependencies
jest.mock('~/src/server/common/helpers/fetch/fetcher.js', () => ({
  fetcher: jest.fn()
}))

jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js', () => ({
  authedFetchJsonDecorator: jest.fn()
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

describe('Professions service', () => {
  const mockRequest = {
    auth: {
      credentials: {
        token: 'test-token'
      }
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  }

  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    authedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  describe('getProfessions', () => {
    test('should fetch professions with authenticated request', async () => {
      // Arrange
      const mockProfessions = [
        { id: '1', name: 'Test Profession 1' },
        { id: '2', name: 'Test Profession 2' }
      ]
      mockAuthedFetch.mockResolvedValue(mockProfessions)

      // Act
      const result = await getProfessions(mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions')
      expect(result).toEqual(mockProfessions)
    })

    test('should fetch professions without authenticated request', async () => {
      // Arrange
      const mockProfessions = [
        { id: '1', name: 'Test Profession 1' },
        { id: '2', name: 'Test Profession 2' }
      ]
      fetcher.mockResolvedValue(mockProfessions)

      // Act
      const result = await getProfessions()

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/professions')
      expect(result).toEqual(mockProfessions)
    })

    test('should handle null response from API', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await getProfessions(mockRequest)

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getProfessionById', () => {
    test('should fetch profession by ID with authenticated request', async () => {
      // Arrange
      const mockProfession = { id: '1', name: 'Test Profession' }
      mockAuthedFetch.mockResolvedValue(mockProfession)

      // Act
      const result = await getProfessionById('1', mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/1')
      expect(result).toEqual(mockProfession)
    })

    test('should fetch profession by ID without authenticated request', async () => {
      // Arrange
      const mockProfession = { id: '1', name: 'Test Profession' }
      fetcher.mockResolvedValue(mockProfession)

      // Act
      const result = await getProfessionById('1')

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/professions/1')
      expect(result).toEqual(mockProfession)
    })

    test('should return null when profession not found', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await getProfessionById('999', mockRequest)

      // Assert
      expect(result).toBeNull()
    })

    test('should throw error when API call fails', async () => {
      // Arrange
      const error = new Error('API error')
      mockAuthedFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(getProfessionById('1', mockRequest)).rejects.toThrow(
        'API error'
      )
    })
  })

  describe('deleteProfession', () => {
    test('should delete profession with authenticated request', async () => {
      // Arrange
      const mockResult = { success: true }
      mockAuthedFetch.mockResolvedValue(mockResult)

      // Act
      const result = await deleteProfession('1', mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockResult)
    })

    test('should delete profession without authenticated request', async () => {
      // Arrange
      const mockResult = { success: true }
      fetcher.mockResolvedValue(mockResult)

      // Act
      const result = await deleteProfession('1')

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/professions/1', {
        method: 'DELETE'
      })
      expect(result).toEqual(mockResult)
    })

    test('should throw error when API call fails', async () => {
      // Arrange
      const error = new Error('API error')
      mockAuthedFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(deleteProfession('1', mockRequest)).rejects.toThrow(
        'API error'
      )
    })
  })
})
