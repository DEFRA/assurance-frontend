import { adminController } from './controller.js'
import Boom from '@hapi/boom'

const mockGetServiceStandards = jest.fn()
const mockUpdateServiceStandard = jest.fn()
const mockGetStandardHistory = jest.fn()
const mockGetProjects = jest.fn()
const mockFetch = jest.fn()

jest.mock('~/src/server/services/service-standards.js', () => ({
  getServiceStandards: (...args) => mockGetServiceStandards(...args),
  updateServiceStandard: (...args) => mockUpdateServiceStandard(...args),
  getStandardHistory: (...args) => mockGetStandardHistory(...args)
}))

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args),
  deleteProject: jest.fn()
}))

jest.mock('~/src/server/common/helpers/fetch/fetcher.js', () => ({
  fetcher: (...args) => mockFetch(...args)
}))

describe('Admin controller', () => {
  const mockH = {
    view: jest.fn(),
    redirect: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
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

      mockGetServiceStandards.mockResolvedValue(mockStandards)
      mockGetProjects.mockResolvedValue(mockProjects)

      // Act
      const result = await adminController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: 3,
        projectsCount: 2,
        projects: mockProjects,
        notification: 'Test notification'
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

      // Act & Assert
      await expect(adminController.get(mockRequest, mockH)).rejects.toThrow(
        Boom.Boom
      )
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })

  describe('seedStandards', () => {
    test('should seed standards and redirect', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue({ success: true })

      // Act
      await adminController.seedStandards(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/serviceStandards/seed',
        expect.objectContaining({
          method: 'POST'
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards seeded successfully'
      )
    })

    test('should handle seeding error', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue(null)

      // Act & Assert
      await expect(
        adminController.seedStandards(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500
        }
      })
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })

  describe('deleteStandards', () => {
    test('should delete standards and redirect', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue({ success: true })

      // Act
      await adminController.deleteStandards(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/serviceStandards/seed',
        {
          method: 'POST',
          body: JSON.stringify([])
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards deleted successfully'
      )
    })

    test('should handle API error', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await adminController.deleteStandards(mockRequest, mockH)
      expect(mockRequest.logger.error).toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to delete standards'
      )
    })

    test('should handle null response', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue(null)

      // Act & Assert
      await adminController.deleteStandards(mockRequest, mockH)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards deleted successfully'
      )
    })
  })

  describe('seedProjects', () => {
    test('should seed projects and redirect', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue({ success: true })

      // Act
      await adminController.seedProjects(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/projects/seedData?clearExisting=false',
        expect.objectContaining({
          method: 'POST'
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Projects seeded successfully'
      )
    })

    test('should handle API error', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await expect(
        adminController.seedProjects(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 500 }
      })
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    test('should handle null response', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue(null)

      // Act & Assert
      await expect(
        adminController.seedProjects(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 500 }
      })
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        'Failed to seed projects - no response from API'
      )
    })
  })

  describe('deleteAllProjects', () => {
    test('should delete projects and redirect', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue({ success: true })

      // Act
      await adminController.deleteAllProjects(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/projects/deleteAll',
        {
          method: 'POST'
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=All projects deleted successfully'
      )
    })

    test('should handle API error', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await adminController.deleteAllProjects(mockRequest, mockH)
      expect(mockRequest.logger.error).toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to delete all projects'
      )
    })

    test('should handle null response', async () => {
      // Arrange
      const mockRequest = {
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockFetch.mockResolvedValue(null)

      // Act & Assert
      await adminController.deleteAllProjects(mockRequest, mockH)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=All projects deleted successfully'
      )
    })
  })
})
