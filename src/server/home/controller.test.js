import { homeController } from './controller.js'

const mockGetProjects = jest.fn()
const mockLoggerError = jest.fn()
const mockLoggerInfo = jest.fn()

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args)
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: mockLoggerInfo,
    error: mockLoggerError,
    debug: jest.fn(),
    warn: jest.fn()
  })
}))

// Skip actual server creation
jest.mock('~/src/server/index.js', () => ({
  createServer: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({}),
    stop: jest.fn().mockResolvedValue({})
  }))
}))

describe('Home controller', () => {
  const mockH = {
    view: jest.fn()
  }

  const mockRequest = {
    query: {},
    auth: {
      isAuthenticated: false
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.resetModules()
  })

  describe('handler', () => {
    test('should return view with all projects when no tag filter', async () => {
      // Arrange
      const mockProjects = [
        {
          name: 'Project 1',
          status: 'RED',
          tags: ['Portfolio: Future Farming', 'Type: Development']
        },
        {
          name: 'Project 2',
          status: 'AMBER',
          tags: ['Portfolio: Environmental Protection']
        }
      ]
      mockGetProjects.mockResolvedValue(mockProjects)

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: mockProjects.map((project) => ({
          ...project,
          actions: 'View details'
        })),
        currentTag: undefined,
        isAuthenticated: false
      })
    })

    test('should filter projects by tag when tag query parameter is provided', async () => {
      // Arrange
      const mockProjects = [
        {
          name: 'Project 1',
          status: 'RED',
          tags: ['Portfolio: Future Farming', 'Type: Development']
        },
        {
          name: 'Project 2',
          status: 'AMBER',
          tags: ['Portfolio: Environmental Protection']
        }
      ]
      mockGetProjects.mockResolvedValue(mockProjects)

      const requestWithTag = {
        ...mockRequest,
        query: { tag: 'Future Farming' }
      }

      // Act
      await homeController.handler(requestWithTag, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: [
          {
            ...mockProjects[0],
            actions: 'View details'
          }
        ],
        currentTag: 'Future Farming',
        isAuthenticated: false
      })
    })

    test('should handle case-insensitive tag filtering', async () => {
      // Arrange
      const mockProjects = [
        {
          name: 'Project 1',
          tags: ['Portfolio: Future Farming']
        }
      ]
      mockGetProjects.mockResolvedValue(mockProjects)

      const requestWithTag = {
        ...mockRequest,
        query: { tag: 'future farming' }
      }

      // Act
      await homeController.handler(requestWithTag, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: [
          {
            ...mockProjects[0],
            actions: 'View details'
          }
        ],
        currentTag: 'future farming',
        isAuthenticated: false
      })
    })

    test('should return empty projects array when no matches found', async () => {
      // Arrange
      const mockProjects = [
        {
          name: 'Project 1',
          tags: ['Portfolio: Future Farming']
        }
      ]
      mockGetProjects.mockResolvedValue(mockProjects)

      const requestWithTag = {
        ...mockRequest,
        query: { tag: 'non-existent-tag' }
      }

      // Act
      await homeController.handler(requestWithTag, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: [],
        currentTag: 'non-existent-tag',
        isAuthenticated: false
      })
    })

    test('should handle errors appropriately', async () => {
      // Arrange
      const error = new Error('Test error')
      mockGetProjects.mockRejectedValue(error)

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: [],
        currentTag: undefined,
        description:
          'Unable to load projects at this time. Please try again later.',
        isAuthenticated: false
      })

      // Check that the error was logged
      expect(mockLoggerError).toHaveBeenCalled()
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
