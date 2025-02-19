import { adminController } from './controller.js'

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
  getProjects: (...args) => mockGetProjects(...args)
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
    test('should return admin dashboard view with counts', async () => {
      // Arrange
      const mockRequest = {
        query: {
          notification: 'Test notification'
        },
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      const mockStandards = Array(3).fill({})
      const mockProjects = Array(2).fill({})
      mockGetServiceStandards.mockResolvedValue(mockStandards)
      mockGetProjects.mockResolvedValue(mockProjects)

      // Act
      await adminController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: 3,
        projectsCount: 2,
        notification: 'Test notification'
      })
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        'Fetching admin dashboard data'
      )
    })

    test('should handle standards fetch error', async () => {
      // Arrange
      const mockRequest = {
        query: {},
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockGetServiceStandards.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await expect(
        adminController.get(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500,
          payload: {
            message: 'An internal server error occurred'
          }
        }
      })
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Failed to fetch standards'
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
      await expect(
        adminController.get(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500,
          payload: {
            message: 'An internal server error occurred'
          }
        }
      })
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
        expect.objectContaining({
          method: 'POST',
          body: '[]'
        }),
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
      await expect(
        adminController.deleteStandards(mockRequest, mockH)
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
        adminController.deleteStandards(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 500 }
      })
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        'Failed to delete standards - no response from API'
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
        '/projects/seedData',
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

  describe('deleteProjects', () => {
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
      await adminController.deleteProjects(mockRequest, mockH)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/projects/deleteAll',
        expect.objectContaining({
          method: 'POST'
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Projects deleted successfully'
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
        adminController.deleteProjects(mockRequest, mockH)
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
        adminController.deleteProjects(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 500 }
      })
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        'Failed to delete projects - no response from API'
      )
    })
  })
})
