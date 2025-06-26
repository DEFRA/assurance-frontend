import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import {
  getProfessions,
  getProfessionById,
  deleteProfession,
  getAllProfessions,
  restoreProfession
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

// Mock config to return old endpoint format for backward compatibility in tests
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

    test('should handle non-array response from API', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ error: 'Not an array' })

      // Act
      const result = await getProfessions(mockRequest)

      // Assert
      expect(result).toEqual([])
    })

    test('should handle API errors', async () => {
      // Arrange
      const error = new Error('API error')
      mockAuthedFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(getProfessions(mockRequest)).rejects.toThrow('API error')
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
      mockAuthedFetch.mockResolvedValue(null) // API returns no content for delete

      // Act
      const result = await deleteProfession('1', mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/1', {
        method: 'DELETE'
      })
      expect(result).toBe(true)
    })

    test('should delete profession without authenticated request', async () => {
      // Arrange
      fetcher.mockResolvedValue(null) // API returns no content for delete

      // Act
      const result = await deleteProfession('1')

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/professions/1', {
        method: 'DELETE'
      })
      expect(result).toBe(true)
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

  describe('getAllProfessions', () => {
    test('should fetch all professions including inactive with authenticated request', async () => {
      // Arrange
      const mockProfessions = [
        { id: '1', name: 'Active Profession', active: true },
        { id: '2', name: 'Inactive Profession', active: false }
      ]
      mockAuthedFetch.mockResolvedValue(mockProfessions)

      // Act
      const result = await getAllProfessions(mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/professions?includeInactive=true'
      )
      expect(result).toEqual(mockProfessions)
    })

    test('should fetch all professions without authenticated request', async () => {
      // Arrange
      const mockProfessions = [
        { id: '1', name: 'Active Profession', active: true },
        { id: '2', name: 'Inactive Profession', active: false }
      ]
      fetcher.mockResolvedValue(mockProfessions)

      // Act
      const result = await getAllProfessions()

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/professions?includeInactive=true')
      expect(result).toEqual(mockProfessions)
    })

    test('should handle null response from API', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await getAllProfessions(mockRequest)

      // Assert
      expect(result).toEqual([])
    })

    test('should handle non-array response from API', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ error: 'Not an array' })

      // Act
      const result = await getAllProfessions(mockRequest)

      // Assert
      expect(result).toEqual([])
    })

    test('should throw error when API call fails', async () => {
      // Arrange
      const error = new Error('API error')
      error.code = 'ECONNREFUSED'
      mockAuthedFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(getAllProfessions(mockRequest)).rejects.toThrow('API error')
    })
  })

  describe('restoreProfession', () => {
    test('should restore profession with authenticated request', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await restoreProfession('1', mockRequest)

      // Assert
      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/1/restore', {
        method: 'POST'
      })
      expect(result).toBe(true)
    })

    test('should restore profession without authenticated request', async () => {
      // Arrange
      fetcher.mockResolvedValue(null)

      // Act
      const result = await restoreProfession('1')

      // Assert
      expect(fetcher).toHaveBeenCalledWith('/professions/1/restore', {
        method: 'POST'
      })
      expect(result).toBe(true)
    })

    test('should throw error when API call fails', async () => {
      // Arrange
      const error = new Error('Restore failed')
      error.code = 'ECONNREFUSED'
      mockAuthedFetch.mockRejectedValue(error)

      // Act & Assert
      await expect(restoreProfession('1', mockRequest)).rejects.toThrow(
        'Restore failed'
      )
    })
  })
})
