import { deliveryGroupsController } from '~/src/server/delivery-groups/controller.js'

// Mock the services
const mockGetDeliveryGroupById = jest.fn()
const mockGetProjectsByDeliveryGroup = jest.fn()

jest.mock('~/src/server/services/delivery-groups.js', () => ({
  getDeliveryGroupById: (...args) => mockGetDeliveryGroupById(...args)
}))

jest.mock('~/src/server/services/projects.js', () => ({
  getProjectsByDeliveryGroup: (...args) =>
    mockGetProjectsByDeliveryGroup(...args)
}))

describe('Delivery Groups Controller', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      params: { id: 'test-delivery-group' },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    jest.clearAllMocks()
  })

  describe('get', () => {
    it('should return delivery group details with projects when valid ID is provided', async () => {
      // Arrange
      const mockDeliveryGroup = {
        Id: 'test-delivery-group',
        Name: 'Test Delivery Group',
        Lead: 'John Doe'
      }
      const mockProjects = [
        { id: 'project1', name: 'Project 1', status: 'GREEN' },
        { id: 'project2', name: 'Project 2', status: 'AMBER' }
      ]

      mockGetDeliveryGroupById.mockResolvedValue(mockDeliveryGroup)
      mockGetProjectsByDeliveryGroup.mockResolvedValue(mockProjects)

      // Act
      await deliveryGroupsController.get(mockRequest, mockH)

      // Assert
      expect(mockGetDeliveryGroupById).toHaveBeenCalledWith(
        'test-delivery-group',
        mockRequest
      )
      expect(mockGetProjectsByDeliveryGroup).toHaveBeenCalledWith(
        'test-delivery-group',
        mockRequest
      )
      expect(mockH.view).toHaveBeenCalledWith('delivery-groups/views/index', {
        pageTitle: 'Test Delivery Group | Delivery Group',
        deliveryGroup: {
          id: 'test-delivery-group',
          name: 'Test Delivery Group',
          lead: 'John Doe'
        },
        projects: mockProjects,
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Test Delivery Group'
          }
        ]
      })
    })

    it('should handle camelCase field names from backend', async () => {
      // Arrange
      const mockDeliveryGroup = {
        id: 'test-delivery-group',
        name: 'Test Delivery Group',
        lead: 'Jane Smith'
      }
      const mockProjects = []

      mockGetDeliveryGroupById.mockResolvedValue(mockDeliveryGroup)
      mockGetProjectsByDeliveryGroup.mockResolvedValue(mockProjects)

      // Act
      await deliveryGroupsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('delivery-groups/views/index', {
        pageTitle: 'Test Delivery Group | Delivery Group',
        deliveryGroup: {
          id: 'test-delivery-group',
          name: 'Test Delivery Group',
          lead: 'Jane Smith'
        },
        projects: [],
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Test Delivery Group'
          }
        ]
      })
    })

    it('should return 404 when delivery group is not found', async () => {
      // Arrange
      mockGetDeliveryGroupById.mockResolvedValue(null)
      mockGetProjectsByDeliveryGroup.mockResolvedValue([])

      // Act
      await deliveryGroupsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/not-found', {
        pageTitle: 'Delivery group not found'
      })
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    it('should handle delivery group without lead', async () => {
      // Arrange
      const mockDeliveryGroup = {
        Name: 'Test Delivery Group'
        // No Lead field
      }
      const mockProjects = []

      mockGetDeliveryGroupById.mockResolvedValue(mockDeliveryGroup)
      mockGetProjectsByDeliveryGroup.mockResolvedValue(mockProjects)

      // Act
      await deliveryGroupsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('delivery-groups/views/index', {
        pageTitle: 'Test Delivery Group | Delivery Group',
        deliveryGroup: {
          id: 'test-delivery-group',
          name: 'Test Delivery Group',
          lead: undefined
        },
        projects: [],
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Test Delivery Group'
          }
        ]
      })
    })

    it('should handle null projects response', async () => {
      // Arrange
      const mockDeliveryGroup = {
        Name: 'Test Delivery Group',
        Lead: 'John Doe'
      }

      mockGetDeliveryGroupById.mockResolvedValue(mockDeliveryGroup)
      mockGetProjectsByDeliveryGroup.mockResolvedValue(null)

      // Act
      await deliveryGroupsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('delivery-groups/views/index', {
        pageTitle: 'Test Delivery Group | Delivery Group',
        deliveryGroup: {
          id: 'test-delivery-group',
          name: 'Test Delivery Group',
          lead: 'John Doe'
        },
        projects: [],
        breadcrumbs: [
          {
            text: 'Home',
            href: '/'
          },
          {
            text: 'Test Delivery Group'
          }
        ]
      })
    })

    it('should throw error when service calls fail', async () => {
      // Arrange
      const mockError = new Error('Service error')
      mockGetDeliveryGroupById.mockRejectedValue(mockError)

      // Act & Assert
      await expect(
        deliveryGroupsController.get(mockRequest, mockH)
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: mockError, deliveryGroupId: 'test-delivery-group' },
        'Error loading delivery group details'
      )
    })
  })
})
