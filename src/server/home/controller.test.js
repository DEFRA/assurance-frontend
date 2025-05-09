import { homeController } from './controller.js'

// Mocks
const mockGetProjects = jest.fn()
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}

// Mock dependencies
jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args)
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => mockLogger
}))

// Skip actual server creation
jest.mock('~/src/server/index.js', () => ({
  createServer: jest.fn().mockResolvedValue({
    initialize: jest.fn().mockResolvedValue({}),
    stop: jest.fn().mockResolvedValue({})
  })
}))

describe('Home Controller', () => {
  // Test data setup
  const sampleProjects = [
    {
      id: 'project-1',
      name: 'Project 1',
      status: 'RED',
      lastUpdated: '2023-01-01',
      tags: ['Portfolio: Future Farming', 'Type: Development']
    },
    {
      id: 'project-2',
      name: 'Project 2',
      status: 'AMBER',
      lastUpdated: '2023-01-02',
      tags: ['Portfolio: Environmental Protection']
    },
    {
      id: 'project-3',
      name: 'Different Project',
      status: 'GREEN',
      lastUpdated: '2023-01-03',
      tags: ['Portfolio: Other']
    }
  ]

  // Common test objects
  let mockH
  let mockRequest

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup response toolkit mock
    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    // Setup request mock with defaults
    mockRequest = {
      query: {},
      auth: {
        isAuthenticated: false
      },
      logger: mockLogger
    }

    // Default mock implementation
    mockGetProjects.mockResolvedValue(sampleProjects)
  })

  afterAll(() => {
    jest.resetModules()
  })

  describe('handler', () => {
    it('should return all projects when no search query is provided', async () => {
      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert - Focus on key behaviors, not implementation details
      expect(mockH.view).toHaveBeenCalledWith(
        'home/index',
        expect.objectContaining({
          projects: sampleProjects,
          projectNames: expect.arrayContaining([
            'Project 1',
            'Project 2',
            'Different Project'
          ])
        })
      )
      // Verify expected number of projects
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toHaveLength(3)
    })

    it('should filter projects by name when search term is provided', async () => {
      // Arrange - Setup request with search query
      mockRequest.query = { search: 'Project 1' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Check behavior without over-specifying
      expect(viewArgs.projects).toHaveLength(1)
      expect(viewArgs.projects[0].name).toBe('Project 1')
      expect(viewArgs.searchTerm).toBe('Project 1')
      // All project names should still be available for autocomplete
      expect(viewArgs.projectNames).toHaveLength(3)
    })

    it('should perform case-insensitive search', async () => {
      // Arrange - Use lowercase search term
      mockRequest.query = { search: 'project' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // All projects with 'project' in name (case-insensitive) should be included
      // This includes "Project 1", "Project 2", and "Different Project"
      expect(viewArgs.projects).toHaveLength(3)

      // Verify all projects with "project" in their name are found
      const projectNames = viewArgs.projects.map((p) => p.name)
      expect(projectNames).toContain('Project 1')
      expect(projectNames).toContain('Project 2')
      expect(projectNames).toContain('Different Project')

      // Verify search was case-insensitive
      expect(viewArgs.searchTerm).toBe('project')
    })

    it('should return partial matches within project names', async () => {
      // Arrange - Use partial term that appears in some project names
      mockRequest.query = { search: 'Diff' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      expect(viewArgs.projects).toHaveLength(1)
      expect(viewArgs.projects[0].name).toBe('Different Project')
    })

    it('should return empty projects array when no matches found', async () => {
      // Arrange
      mockRequest.query = { search: 'non-existent-project' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      expect(viewArgs.projects).toEqual([])
      // Project names for autocomplete should still be available
      expect(viewArgs.projectNames).toHaveLength(3)
    })

    it('should handle authenticated users correctly', async () => {
      // Arrange
      mockRequest.auth.isAuthenticated = true

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.isAuthenticated).toBe(true)
    })

    describe('error handling', () => {
      it('should handle API errors gracefully', async () => {
        // Arrange
        const testError = new Error('API unavailable')
        mockGetProjects.mockRejectedValue(testError)

        // Act
        await homeController.handler(mockRequest, mockH)

        // Assert
        expect(mockLogger.error).toHaveBeenCalled()

        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.projects).toEqual([])
        expect(viewArgs.description).toContain('Unable to load projects')
      })

      it('should handle unexpected API response format', async () => {
        // Arrange - API returns null instead of array
        mockGetProjects.mockResolvedValue(null)

        // Act
        await homeController.handler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]

        // Should handle this gracefully
        expect(viewArgs.projects).toEqual([])
        expect(viewArgs.projectNames).toEqual([])
      })

      it('should handle empty API response', async () => {
        // Arrange - API returns empty array
        mockGetProjects.mockResolvedValue([])

        // Act
        await homeController.handler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]

        expect(viewArgs.projects).toEqual([])
        expect(viewArgs.projectNames).toEqual([])
      })
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
