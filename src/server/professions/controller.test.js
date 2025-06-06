import { professionsController } from './controller.js'
import Boom from '@hapi/boom'

// Mocking dependencies
const mockGetProfessions = jest.fn()
const mockGetProjects = jest.fn()
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}

jest.mock('~/src/server/services/professions.js', () => ({
  getProfessions: (...args) => mockGetProfessions(...args)
}))

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args)
}))

// Mock Boom to check error handling
jest.mock('@hapi/boom', () => ({
  boomify: jest.fn((error, options) => {
    return {
      ...error,
      isBoom: true,
      statusCode: options?.statusCode || 500
    }
  })
}))

describe('Professions Controller', () => {
  // Sample test data
  const sampleProfessions = [
    {
      id: 'prof-1',
      name: 'delivery management',
      description: 'Delivery Management professionals'
    },
    {
      id: 'prof-2',
      name: 'software engineering',
      description: 'Software Engineering professionals'
    },
    {
      id: 'test-profession-id',
      name: 'test profession',
      description: 'Test profession for testing'
    }
  ]

  const sampleProjects = [
    {
      id: 'project-1',
      name: 'Project 1',
      status: 'GREEN',
      lastUpdated: '2023-01-01',
      professions: [
        {
          professionId: 'test-profession-id',
          status: 'RED',
          commentary: 'Needs attention'
        },
        {
          professionId: 'prof-2',
          status: 'AMBER',
          commentary: 'Some engineering challenges'
        }
      ]
    },
    {
      id: 'project-2',
      name: 'Project 2',
      status: 'AMBER',
      lastUpdated: '2023-01-02',
      professions: [
        {
          professionId: 'test-profession-id',
          status: 'AMBER_RED',
          commentary: 'Some delivery issues'
        }
      ]
    },
    {
      id: 'project-3',
      name: 'Project 3',
      status: 'RED',
      lastUpdated: '2023-01-03',
      professions: [
        {
          professionId: 'test-profession-id',
          status: 'AMBER',
          commentary: 'Minor issues'
        }
      ]
    }
  ]

  // Common test objects
  let mockH
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Set up response toolkit mock with chainable methods
    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    // Set up request mock
    mockRequest = {
      logger: mockLogger,
      auth: { isAuthenticated: true },
      params: { id: 'test-profession-id' }
    }

    // Default mock implementations
    mockGetProfessions.mockResolvedValue(sampleProfessions)
    mockGetProjects.mockResolvedValue(sampleProjects)
  })

  describe('getAll', () => {
    it('should return all professions with formatted display names', async () => {
      // Act
      await professionsController.getAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/index',
        expect.objectContaining({
          professions: expect.arrayContaining([
            expect.objectContaining({
              id: 'prof-1',
              name: 'delivery management',
              displayName: 'Delivery Management'
            }),
            expect.objectContaining({
              id: 'prof-2',
              name: 'software engineering',
              displayName: 'Software Engineering'
            })
          ])
        })
      )
    })

    it('should handle empty professions list', async () => {
      // Arrange
      mockGetProfessions.mockResolvedValue([])

      // Act
      await professionsController.getAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/index',
        expect.objectContaining({
          professions: [],
          message: expect.stringContaining('No professions found')
        })
      )
    })

    it('should handle null professions response', async () => {
      // Arrange
      mockGetProfessions.mockResolvedValue(null)

      // Act
      await professionsController.getAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/index',
        expect.objectContaining({
          professions: [],
          message: expect.stringContaining('No professions found')
        })
      )
    })

    it('should handle API errors', async () => {
      // Arrange
      const testError = new Error('API failure')
      mockGetProfessions.mockRejectedValue(testError)

      // Act & Assert
      await expect(
        professionsController.getAll(mockRequest, mockH)
      ).rejects.toHaveProperty('isBoom', true)

      expect(mockLogger.error).toHaveBeenCalled()
      expect(Boom.boomify).toHaveBeenCalledWith(testError, { statusCode: 500 })
    })
  })

  describe('get', () => {
    it('should return profession details with projects', async () => {
      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/detail',
        expect.objectContaining({
          pageTitle: 'Test Profession overview',
          heading: 'Test Profession',
          profession: expect.objectContaining({
            id: 'test-profession-id',
            name: 'test profession',
            displayName: 'Test Profession'
          }),
          projects: expect.arrayContaining([
            expect.objectContaining({
              id: 'project-1',
              name: 'Project 1',
              professionAssessment: expect.objectContaining({
                status: 'RED',
                commentary: 'Needs attention'
              })
            })
          ]),
          summary: expect.objectContaining({
            total: 3,
            red: 1,
            amberRed: 1,
            amber: 1,
            amberGreen: 0,
            green: 0,
            notUpdated: 0
          })
        })
      )
    })

    it('should sort projects based on the profession status', async () => {
      // Arrange - projects should be sorted by status (RED first, then AMBER_RED, etc.)
      const expectedOrder = [
        expect.objectContaining({
          id: 'project-1',
          professionAssessment: expect.objectContaining({ status: 'RED' })
        }),
        expect.objectContaining({
          id: 'project-2',
          professionAssessment: expect.objectContaining({ status: 'AMBER_RED' })
        }),
        expect.objectContaining({
          id: 'project-3',
          professionAssessment: expect.objectContaining({ status: 'AMBER' })
        })
      ]

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toEqual(expectedOrder)
    })

    it('should handle profession not found', async () => {
      // Arrange
      mockGetProfessions.mockResolvedValue([])

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/not-found', {
        pageTitle: 'Profession Not Found'
      })
      expect(mockH.view().code).toHaveBeenCalledWith(404)
    })

    it('should handle projects with missing professions array', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue([
        { id: 'project-1', name: 'Project 1' } // No professions array
      ])

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toEqual([])
    })

    it('should handle projects with no matching profession assessments', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue([
        {
          id: 'project-1',
          name: 'Project 1',
          professions: [
            { professionId: 'different-profession-id', status: 'GREEN' }
          ]
        }
      ])

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      // Get the arguments from the view call
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toEqual([])
    })

    it('should handle API errors', async () => {
      // Arrange
      const testError = new Error('API Error')
      mockGetProfessions.mockRejectedValue(testError)

      // Act & Assert
      await expect(
        professionsController.get(mockRequest, mockH)
      ).rejects.toHaveProperty('isBoom', true)

      expect(mockLogger.error).toHaveBeenCalled()
      expect(Boom.boomify).toHaveBeenCalledWith(testError, { statusCode: 500 })
    })

    it('should handle errors when fetching projects', async () => {
      // Arrange
      mockGetProjects.mockRejectedValue(new Error('Projects API Error'))

      // Act & Assert
      await expect(
        professionsController.get(mockRequest, mockH)
      ).rejects.toHaveProperty('isBoom', true)

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})
