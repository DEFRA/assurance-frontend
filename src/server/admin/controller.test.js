import { adminController } from './controller.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProjects } from '~/src/server/data/projects.js'
import { defaultProfessions } from '~/src/server/data/professions.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import Boom from '@hapi/boom'

const mockGetServiceStandards = jest.fn()
const mockUpdateServiceStandard = jest.fn()
const mockGetStandardHistory = jest.fn()
const mockGetProjects = jest.fn()
const mockGetProfessions = jest.fn()
const mockSeedProfessions = jest.fn()
const mockDeleteProfessions = jest.fn()

// Mock the config.get function
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'env') return 'test'
      return 'mock-value'
    })
  }
}))

jest.mock('~/src/server/services/service-standards.js', () => ({
  getServiceStandards: (...args) => mockGetServiceStandards(...args),
  updateServiceStandard: (...args) => mockUpdateServiceStandard(...args),
  getStandardHistory: (...args) => mockGetStandardHistory(...args)
}))

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args),
  deleteProject: jest.fn()
}))

jest.mock('~/src/server/services/professions.js', () => ({
  getProfessions: (...args) => mockGetProfessions(...args),
  seedProfessions: (...args) => mockSeedProfessions(...args),
  deleteProfessions: (...args) => mockDeleteProfessions(...args)
}))

jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js')

describe('Admin controller', () => {
  let mockRequest
  let mockH
  let mockFetch

  beforeEach(() => {
    mockRequest = {
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      },
      auth: {
        credentials: {
          token: 'test-token'
        }
      }
    }

    mockH = {
      view: jest.fn(),
      redirect: jest.fn()
    }

    mockFetch = jest.fn()
    authedFetchJsonDecorator.mockImplementation(() => mockFetch)
    mockGetProfessions.mockResolvedValue([])
  })

  describe('get', () => {
    it('should return admin dashboard view with counts', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        },
        query: {
          notification: 'Test notification'
        }
      }

      const mockH = {
        view: jest.fn().mockReturnValue('view result')
      }

      const mockStandards = [{}, {}, {}]
      const mockProjects = [{}, {}]
      const mockProfessions = [{}, {}]

      mockGetServiceStandards.mockResolvedValue(mockStandards)
      mockGetProjects.mockResolvedValue(mockProjects)
      mockGetProfessions.mockResolvedValue(mockProfessions)

      // Act
      const result = await adminController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: 3,
        projectsCount: 2,
        professionsCount: 2,
        projects: mockProjects,
        notification: 'Test notification',
        isTestEnvironment: true
      })
      expect(result).toBe('view result')
    })

    it('should handle standards fetch error', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        },
        query: {}
      }

      const mockH = {
        view: jest.fn()
      }

      const mockError = new Error('API Error')
      mockGetServiceStandards.mockRejectedValue(mockError)
      mockGetProjects.mockResolvedValue([])
      mockGetProfessions.mockResolvedValue([])

      // Act & Assert
      await expect(adminController.get(mockRequest, mockH)).rejects.toThrow(
        Boom.Boom
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Error fetching admin dashboard data'
      )
    })

    test('should handle projects fetch error', async () => {
      // Arrange
      const mockRequest = {
        query: {},
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockGetServiceStandards.mockResolvedValue([])
      mockGetProjects.mockRejectedValue(new Error('API Error'))
      mockGetProfessions.mockResolvedValue([])

      // Act & Assert
      await expect(adminController.get(mockRequest, mockH)).rejects.toThrow(
        Boom.Boom
      )
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    test('should handle professions fetch error', async () => {
      // Arrange
      const mockRequest = {
        query: {},
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockGetServiceStandards.mockResolvedValue([])
      mockGetProjects.mockResolvedValue([])
      mockGetProfessions.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await expect(adminController.get(mockRequest, mockH)).rejects.toThrow(
        Boom.Boom
      )
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })

  describe('seedProfessions', () => {
    test('should seed professions and redirect', async () => {
      // Arrange
      const mockRequest = {
        logger: { info: jest.fn() }
      }

      // Mock a successful API response
      mockFetch.mockResolvedValue({})

      // Act
      await adminController.seedProfessions(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/professions/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(defaultProfessions)
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions seeded successfully'
      )
    })

    test('should handle errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.seedProfessions(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed professions'
      )
    })
  })

  describe('deleteProfessions', () => {
    test('should delete professions and redirect', async () => {
      // Arrange
      const mockRequest = {
        logger: { info: jest.fn() }
      }

      // Mock a successful API response
      mockFetch.mockResolvedValue({})

      // Act
      await adminController.deleteProfessions(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/professions/deleteAll', {
        method: 'POST'
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions deleted successfully'
      )
    })

    test('should handle errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.deleteProfessions(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to delete professions'
      )
    })
  })

  describe('seedStandards', () => {
    test('should seed standards and redirect', async () => {
      // Arrange
      mockFetch.mockResolvedValue({})

      // Act
      await adminController.seedStandards(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify(defaultServiceStandards)
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards seeded successfully'
      )
    })

    test('should handle seeding error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.seedStandards(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed standards'
      )
    })
  })

  describe('deleteStandards', () => {
    test('should delete standards and redirect', async () => {
      // Arrange
      mockFetch.mockResolvedValue({})

      // Act
      await adminController.deleteStandards(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify([])
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards deleted successfully'
      )
    })

    test('should handle deletion error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.deleteStandards(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to delete standards'
      )
    })
  })

  describe('seedProjects', () => {
    test('should seed projects and redirect', async () => {
      // Arrange
      mockFetch.mockResolvedValue({})

      // Act
      await adminController.seedProjects(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/projects/seedData?clearExisting=false',
        {
          method: 'POST',
          body: JSON.stringify(defaultProjects)
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Projects seeded successfully'
      )
    })

    test('should handle seeding error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.seedProjects(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed projects'
      )
    })
  })

  describe('deleteAllProjects', () => {
    test('should delete projects and redirect', async () => {
      // Arrange
      mockFetch.mockResolvedValue({})

      // Act
      await adminController.deleteAllProjects(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/projects/deleteAll', {
        method: 'POST'
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=All projects deleted successfully'
      )
    })

    test('should handle deletion error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.deleteAllProjects(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to delete all projects'
      )
    })
  })
})
