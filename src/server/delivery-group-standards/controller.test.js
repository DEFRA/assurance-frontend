import { deliveryGroupStandardsController } from '~/src/server/delivery-group-standards/controller.js'

describe('Delivery Group Standards controller', () => {
  const mockRequest = {}
  const mockH = {
    view: jest.fn(),
    response: jest.fn().mockReturnThis(),
    code: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('get', () => {
    it('should return delivery group standards view', () => {
      // Act
      deliveryGroupStandardsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'delivery-group-standards/views/index',
        {
          pageTitle: 'Delivery Group Standards | Defra Digital Assurance',
          heading: 'Delivery Group Standards'
        }
      )
    })
  })

  describe('getStandard', () => {
    it('should return standard 1 view', () => {
      // Arrange
      const request = { params: { standardNumber: '1' } }

      // Act
      deliveryGroupStandardsController.getStandard(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'delivery-group-standards/views/standard-1',
        {
          pageTitle:
            '1. Define and share outcomes | Delivery Group Standards | Defra Digital Assurance',
          heading: '1. Define and share outcomes',
          standardNumber: 1
        }
      )
    })

    it('should return standard 2 view', () => {
      // Arrange
      const request = { params: { standardNumber: '2' } }

      // Act
      deliveryGroupStandardsController.getStandard(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'delivery-group-standards/views/standard-2',
        {
          pageTitle:
            '2. Maintain an inventory of products and services | Delivery Group Standards | Defra Digital Assurance',
          heading: '2. Maintain an inventory of products and services',
          standardNumber: 2
        }
      )
    })

    it('should return standard 3 view', () => {
      // Arrange
      const request = { params: { standardNumber: '3' } }

      // Act
      deliveryGroupStandardsController.getStandard(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'delivery-group-standards/views/standard-3',
        {
          pageTitle:
            '3. Publish a roadmap for change | Delivery Group Standards | Defra Digital Assurance',
          heading: '3. Publish a roadmap for change',
          standardNumber: 3
        }
      )
    })

    it('should return standard 4 view', () => {
      // Arrange
      const request = { params: { standardNumber: '4' } }

      // Act
      deliveryGroupStandardsController.getStandard(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'delivery-group-standards/views/standard-4',
        {
          pageTitle:
            '4. Define success measures and share progress | Delivery Group Standards | Defra Digital Assurance',
          heading: '4. Define success measures and share progress',
          standardNumber: 4
        }
      )
    })

    it('should return 404 for invalid standard number', () => {
      // Arrange
      const request = { params: { standardNumber: '5' } }

      // Act
      deliveryGroupStandardsController.getStandard(request, mockH)

      // Assert
      expect(mockH.response).toHaveBeenCalledWith('Standard not found')
      expect(mockH.code).toHaveBeenCalledWith(404)
    })

    it('should return 404 for non-numeric standard number', () => {
      // Arrange
      const request = { params: { standardNumber: 'invalid' } }

      // Act
      deliveryGroupStandardsController.getStandard(request, mockH)

      // Assert
      expect(mockH.response).toHaveBeenCalledWith('Standard not found')
      expect(mockH.code).toHaveBeenCalledWith(404)
    })
  })
})
