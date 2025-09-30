import { deliveryPartnersController } from '~/src/server/delivery-partners/controller.js'

// Mock the services
const mockGetDeliveryPartnerById = jest.fn()
const mockGetProjects = jest.fn()
const mockGetProjectDeliveryPartners = jest.fn()

jest.mock('~/src/server/services/delivery-partners.js', () => ({
  getDeliveryPartnerById: (...args) => mockGetDeliveryPartnerById(...args)
}))

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args),
  getProjectDeliveryPartners: (...args) =>
    mockGetProjectDeliveryPartners(...args)
}))

describe('Delivery Partners Controller', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    mockRequest = {
      params: { id: 'test-delivery-partner' },
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    jest.clearAllMocks()
  })

  describe('get', () => {
    it('should return delivery partner details with projects when valid ID is provided', async () => {
      // Arrange
      const mockDeliveryPartner = {
        Id: 'test-delivery-partner',
        Name: 'Test Delivery Partner',
        Lead: 'John Doe'
      }
      const mockAllProjects = [
        {
          id: 'project1',
          name: 'Project 1',
          status: 'GREEN',
          deliveryPartners: [
            { id: 'test-delivery-partner', name: 'Test Delivery Partner' }
          ]
        },
        {
          id: 'project2',
          name: 'Project 2',
          status: 'AMBER',
          deliveryPartners: [{ id: 'other-partner', name: 'Other Partner' }]
        },
        {
          id: 'project3',
          name: 'Project 3',
          status: 'RED',
          deliveryPartners: [
            { id: 'test-delivery-partner', name: 'Test Delivery Partner' }
          ]
        }
      ]

      mockGetDeliveryPartnerById.mockResolvedValue(mockDeliveryPartner)
      mockGetProjects.mockResolvedValue(mockAllProjects)

      // Mock getProjectDeliveryPartners to return delivery partners for each project
      // Set up individual mock responses for each project
      mockGetProjectDeliveryPartners
        .mockResolvedValueOnce([
          { id: 'test-delivery-partner', name: 'Test Delivery Partner' }
        ]) // project1
        .mockResolvedValueOnce([{ id: 'other-partner', name: 'Other Partner' }]) // project2
        .mockResolvedValueOnce([
          { id: 'test-delivery-partner', name: 'Test Delivery Partner' }
        ]) // project3

      // Act
      await deliveryPartnersController.get(mockRequest, mockH)

      // Assert
      expect(mockGetDeliveryPartnerById).toHaveBeenCalledWith(
        'test-delivery-partner',
        mockRequest
      )
      expect(mockGetProjects).toHaveBeenCalledWith(mockRequest)
      expect(mockH.view).toHaveBeenCalledWith('delivery-partners/views/index', {
        pageTitle: 'Test Delivery Partner | Delivery Partner',
        deliveryPartner: {
          id: 'test-delivery-partner',
          name: 'Test Delivery Partner',
          lead: 'John Doe'
        },
        projects: [
          {
            id: 'project1',
            name: 'Project 1',
            status: 'GREEN',
            deliveryPartners: [
              { id: 'test-delivery-partner', name: 'Test Delivery Partner' }
            ]
          },
          {
            id: 'project3',
            name: 'Project 3',
            status: 'RED',
            deliveryPartners: [
              { id: 'test-delivery-partner', name: 'Test Delivery Partner' }
            ]
          }
        ]
      })
    })

    it('should handle camelCase field names from backend', async () => {
      // Arrange
      const mockDeliveryPartner = {
        id: 'test-delivery-partner',
        name: 'Test Delivery Partner',
        lead: 'Jane Smith'
      }
      const mockAllProjects = []

      mockGetDeliveryPartnerById.mockResolvedValue(mockDeliveryPartner)
      mockGetProjects.mockResolvedValue(mockAllProjects)

      // Act
      await deliveryPartnersController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('delivery-partners/views/index', {
        pageTitle: 'Test Delivery Partner | Delivery Partner',
        deliveryPartner: {
          id: 'test-delivery-partner',
          name: 'Test Delivery Partner',
          lead: 'Jane Smith'
        },
        projects: []
      })
    })

    it('should return 404 when delivery partner is not found', async () => {
      // Arrange
      mockGetDeliveryPartnerById.mockResolvedValue(null)
      mockGetProjects.mockResolvedValue([])

      // Act
      await deliveryPartnersController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/not-found', {
        pageTitle: 'Delivery partner not found'
      })
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    it('should handle delivery partner without lead', async () => {
      // Arrange
      const mockDeliveryPartner = {
        Name: 'Test Delivery Partner'
        // No Lead field
      }
      const mockAllProjects = []

      mockGetDeliveryPartnerById.mockResolvedValue(mockDeliveryPartner)
      mockGetProjects.mockResolvedValue(mockAllProjects)

      // Act
      await deliveryPartnersController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('delivery-partners/views/index', {
        pageTitle: 'Test Delivery Partner | Delivery Partner',
        deliveryPartner: {
          id: 'test-delivery-partner',
          name: 'Test Delivery Partner',
          lead: undefined
        },
        projects: []
      })
    })

    it('should handle projects without delivery partners', async () => {
      // Arrange
      const mockDeliveryPartner = {
        Name: 'Test Delivery Partner',
        Lead: 'John Doe'
      }
      const mockAllProjects = [
        { id: 'project1', name: 'Project 1', status: 'GREEN' }, // No deliveryPartners field
        {
          id: 'project2',
          name: 'Project 2',
          status: 'AMBER',
          deliveryPartners: []
        } // Empty array
      ]

      mockGetDeliveryPartnerById.mockResolvedValue(mockDeliveryPartner)
      mockGetProjects.mockResolvedValue(mockAllProjects)

      // Act
      await deliveryPartnersController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('delivery-partners/views/index', {
        pageTitle: 'Test Delivery Partner | Delivery Partner',
        deliveryPartner: {
          id: 'test-delivery-partner',
          name: 'Test Delivery Partner',
          lead: 'John Doe'
        },
        projects: []
      })
    })

    it('should throw error when service calls fail', async () => {
      // Arrange
      const mockError = new Error('Service error')
      mockGetDeliveryPartnerById.mockRejectedValue(mockError)

      // Act & Assert
      await expect(
        deliveryPartnersController.get(mockRequest, mockH)
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: mockError, deliveryPartnerId: 'test-delivery-partner' },
        'Error loading delivery partner details'
      )
    })
  })
})
