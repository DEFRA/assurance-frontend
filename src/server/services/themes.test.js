import {
  getThemes,
  getAllThemes,
  getThemeById,
  createTheme,
  updateTheme,
  archiveTheme,
  restoreTheme,
  getThemesByProject
} from './themes.js'

// Mock dependencies
jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js', () => ({
  authedFetchJsonDecorator: jest.fn()
}))

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

const { authedFetchJsonDecorator } = jest.requireMock(
  '~/src/server/common/helpers/fetch/authed-fetch-json.js'
)

describe('Themes service', () => {
  let mockAuthedFetch
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockAuthedFetch = jest.fn()
    authedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    mockRequest = {
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    }
  })

  describe('getThemes', () => {
    it('should fetch active themes and sort by creation date', async () => {
      const mockThemes = [
        { id: '1', name: 'Theme A', createdAt: '2023-01-01T00:00:00Z' },
        { id: '2', name: 'Theme B', createdAt: '2023-06-01T00:00:00Z' }
      ]
      mockAuthedFetch.mockResolvedValue(mockThemes)

      const result = await getThemes(mockRequest)

      expect(authedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/themes')
      expect(result).toHaveLength(2)
      // Should be sorted newest first
      expect(result[0].id).toBe('2')
    })

    it('should handle empty response', async () => {
      mockAuthedFetch.mockResolvedValue(null)

      const result = await getThemes(mockRequest)

      expect(result).toEqual([])
    })

    it('should handle API errors', async () => {
      const error = new Error('API Error')
      mockAuthedFetch.mockRejectedValue(error)

      await expect(getThemes(mockRequest)).rejects.toThrow('API Error')
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })

  describe('getAllThemes', () => {
    it('should fetch all themes including archived', async () => {
      const mockThemes = [
        { id: '1', name: 'Active Theme', IsActive: true },
        { id: '2', name: 'Archived Theme', IsActive: false }
      ]
      mockAuthedFetch.mockResolvedValue(mockThemes)

      const result = await getAllThemes(mockRequest)

      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/themes?includeArchived=true'
      )
      expect(result).toHaveLength(2)
    })
  })

  describe('getThemeById', () => {
    it('should fetch a theme by ID', async () => {
      const mockTheme = { id: 'theme-1', name: 'Test Theme' }
      mockAuthedFetch.mockResolvedValue(mockTheme)

      const result = await getThemeById('theme-1', mockRequest)

      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/themes/theme-1')
      expect(result).toEqual(mockTheme)
    })

    it('should throw error when theme not found', async () => {
      mockAuthedFetch.mockResolvedValue(null)

      await expect(getThemeById('non-existent', mockRequest)).rejects.toThrow(
        'Theme with ID non-existent not found'
      )
    })
  })

  describe('createTheme', () => {
    it('should create a theme with PascalCase transformation', async () => {
      const themeData = {
        name: 'New Theme',
        description: 'A new theme',
        projectIds: ['proj-1']
      }
      const mockResponse = { id: 'new-id', Name: 'New Theme' }
      mockAuthedFetch.mockResolvedValue(mockResponse)

      const result = await createTheme(themeData, mockRequest)

      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/themes', {
        method: 'POST',
        body: expect.any(String)
      })

      // Verify the body was transformed to PascalCase with generated Id
      const callArgs = mockAuthedFetch.mock.calls[0][1]
      const sentData = JSON.parse(callArgs.body)
      expect(sentData.Id).toBeDefined()
      expect(sentData.Id).toMatch(/^[0-9a-f]{24}$/) // Valid MongoDB ObjectId format
      expect(sentData.Name).toBe('New Theme')
      expect(sentData.Description).toBe('A new theme')
      expect(sentData.ProjectIds).toEqual(['proj-1'])
      expect(sentData.IsActive).toBe(true)
      expect(sentData.CreatedAt).toBeDefined()
      expect(sentData.UpdatedAt).toBeDefined()
      expect(result).toEqual(mockResponse)
    })

    it('should handle empty projectIds', async () => {
      const themeData = {
        name: 'Theme Without Projects',
        description: 'No projects'
      }
      const mockResponse = { id: 'new-id' }
      mockAuthedFetch.mockResolvedValue(mockResponse)

      await createTheme(themeData, mockRequest)

      const callArgs = mockAuthedFetch.mock.calls[0][1]
      const sentData = JSON.parse(callArgs.body)
      expect(sentData.Id).toMatch(/^[0-9a-f]{24}$/) // Valid MongoDB ObjectId
      expect(sentData.ProjectIds).toEqual([])
    })

    it('should handle creation errors', async () => {
      const themeData = { name: 'Invalid Theme', description: 'Test' }
      mockAuthedFetch.mockRejectedValue(new Error('Validation failed'))

      await expect(createTheme(themeData, mockRequest)).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('updateTheme', () => {
    it('should update a theme with PascalCase transformation', async () => {
      const existingTheme = {
        id: 'theme-1',
        name: 'Original Name',
        description: 'Original description',
        projectIds: ['proj-1'],
        isActive: true,
        createdAt: '2023-01-01T00:00:00Z'
      }
      const updateData = { name: 'Updated Name' }
      const mockResponse = { id: 'theme-1', Name: 'Updated Name' }

      mockAuthedFetch
        .mockResolvedValueOnce(existingTheme) // getThemeById call
        .mockResolvedValueOnce(mockResponse) // update call

      const result = await updateTheme('theme-1', updateData, mockRequest)

      expect(mockAuthedFetch).toHaveBeenCalledTimes(2)

      // Verify the body was transformed to PascalCase
      const callArgs = mockAuthedFetch.mock.calls[1][1]
      const sentData = JSON.parse(callArgs.body)
      expect(sentData.Id).toBe('theme-1')
      expect(sentData.Name).toBe('Updated Name')
      expect(sentData.Description).toBe('Original description')
      expect(sentData.ProjectIds).toEqual(['proj-1'])
      expect(sentData.IsActive).toBe(true)
      expect(sentData.CreatedAt).toBe('2023-01-01T00:00:00Z')
      expect(sentData.UpdatedAt).toBeDefined()
      expect(result).toEqual(mockResponse)
    })

    it('should handle backend-style PascalCase response', async () => {
      const existingTheme = {
        Id: 'theme-1',
        Name: 'Original Name',
        Description: 'Original description',
        ProjectIds: [],
        IsActive: true,
        CreatedAt: '2023-01-01T00:00:00Z'
      }
      const updateData = { name: 'Updated Name', description: 'New desc' }
      const mockResponse = { Id: 'theme-1', Name: 'Updated Name' }

      mockAuthedFetch
        .mockResolvedValueOnce(existingTheme)
        .mockResolvedValueOnce(mockResponse)

      const result = await updateTheme('theme-1', updateData, mockRequest)

      const callArgs = mockAuthedFetch.mock.calls[1][1]
      const sentData = JSON.parse(callArgs.body)
      expect(sentData.Name).toBe('Updated Name')
      expect(sentData.Description).toBe('New desc')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('archiveTheme', () => {
    it('should archive a theme', async () => {
      mockAuthedFetch.mockResolvedValue(undefined)

      await archiveTheme('theme-1', mockRequest)

      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/themes/theme-1/archive',
        { method: 'PUT' }
      )
    })

    it('should handle archive errors', async () => {
      mockAuthedFetch.mockRejectedValue(new Error('Archive failed'))

      await expect(archiveTheme('theme-1', mockRequest)).rejects.toThrow(
        'Archive failed'
      )
    })
  })

  describe('restoreTheme', () => {
    it('should restore a theme', async () => {
      mockAuthedFetch.mockResolvedValue(undefined)

      await restoreTheme('theme-1', mockRequest)

      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/themes/theme-1/restore',
        { method: 'PUT' }
      )
    })
  })

  describe('getThemesByProject', () => {
    it('should fetch themes by project ID', async () => {
      const mockThemes = [{ id: '1', name: 'Theme for Project' }]
      mockAuthedFetch.mockResolvedValue(mockThemes)

      const result = await getThemesByProject('proj-1', mockRequest)

      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/themes/by-project/proj-1'
      )
      expect(result).toEqual(mockThemes)
    })

    it('should return empty array when no themes found', async () => {
      mockAuthedFetch.mockResolvedValue(null)

      const result = await getThemesByProject('proj-1', mockRequest)

      expect(result).toEqual([])
    })
  })
})
