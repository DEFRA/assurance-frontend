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

jest.mock('~/src/server/common/helpers/analytics.js', () => ({
  analytics: {
    trackProjectSearch: jest.fn().mockResolvedValue(undefined)
  },
  trackProjectSearch: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: mockLogger
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
    },
    {
      id: 'project-4',
      name: 'TBC Project',
      status: 'TBC',
      lastUpdated: '2023-01-04',
      tags: ['Portfolio: Future Farming', 'Type: Development']
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
      // Arrange - unauthenticated user by default
      mockGetProjects.mockResolvedValue(sampleProjects)

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert - Focus on key behaviors, not implementation details
      expect(mockH.view).toHaveBeenCalledWith(
        'home/index',
        expect.objectContaining({
          projects: expect.any(Array),
          projectNames: expect.arrayContaining([
            'Project 1',
            'Project 2',
            'Different Project'
          ])
        })
      )
      // Verify expected number of projects (3 for unauthenticated users - TBC hidden)
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toHaveLength(3)

      // Should not include TBC project for unauthenticated users
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(false)
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
      it('should throw Boom error when API fails', async () => {
        // Arrange
        const testError = new Error('API unavailable')
        mockGetProjects.mockRejectedValue(testError)

        // Act & Assert
        await expect(
          homeController.handler(mockRequest, mockH)
        ).rejects.toThrow()
        expect(mockLogger.error).toHaveBeenCalled()
      })

      it('should throw error when API returns unexpected response format', async () => {
        // Arrange - API returns null instead of array
        mockGetProjects.mockResolvedValue(null)

        // Act & Assert
        await expect(
          homeController.handler(mockRequest, mockH)
        ).rejects.toThrow()
        expect(mockLogger.error).toHaveBeenCalled()
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

  describe('TBC project filtering', () => {
    it('should hide TBC projects from unauthenticated users', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = false

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should not include the TBC project
      expect(viewArgs.projects).toHaveLength(3)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(false)

      // Project names should also exclude TBC project
      expect(viewArgs.projectNames).toEqual([
        'Project 1',
        'Project 2',
        'Different Project'
      ])
    })

    it('should show TBC projects to authenticated users', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = true

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should include all projects including TBC
      expect(viewArgs.projects).toHaveLength(4)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3',
        'project-4'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(true)

      // Project names should include TBC project
      expect(viewArgs.projectNames).toEqual([
        'Project 1',
        'Project 2',
        'Different Project',
        'TBC Project'
      ])
    })

    it('should filter TBC projects correctly when searching as unauthenticated user', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = false
      mockRequest.query.search = 'project' // Should match projects 1, 2, 3 but not TBC project

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should match only visible (non-TBC) projects
      expect(viewArgs.projects).toHaveLength(3)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(false)
    })

    it('should include TBC projects in search results for authenticated users', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = true
      mockRequest.query.search = 'project' // Should match all projects including TBC

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should match all projects including TBC
      expect(viewArgs.projects).toHaveLength(4)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3',
        'project-4'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(true)
    })

    it('should handle search for TBC project name as unauthenticated user', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = false
      mockRequest.query.search = 'TBC Project' // Searching specifically for TBC project

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should return empty results since TBC projects are hidden
      expect(viewArgs.projects).toHaveLength(0)
    })

    it('should handle search for TBC project name as authenticated user', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = true
      mockRequest.query.search = 'TBC Project' // Searching specifically for TBC project

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should return the TBC project since user is authenticated
      expect(viewArgs.projects).toHaveLength(1)
      expect(viewArgs.projects[0].id).toBe('project-4')
      expect(viewArgs.projects[0].status).toBe('TBC')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
