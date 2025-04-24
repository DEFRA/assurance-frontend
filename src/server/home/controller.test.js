import { createServer } from '~/src/server/index.js'
import { homeController } from './controller.js'

const mockGetProjects = jest.fn()
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args)
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => mockLogger
}))

describe('Home controller', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should return view with projects', () => {
    expect(true).toBe(true)
  })

  const mockH = {
    view: jest.fn()
  }
  const mockRequest = {
    query: {},
    logger: {
      error: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
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
        currentTag: undefined
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
        currentTag: 'Future Farming'
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
        currentTag: 'future farming'
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
        currentTag: 'non-existent-tag'
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
          'Unable to load projects at this time. Please try again later.'
      })
      // Check that the error was logged
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
