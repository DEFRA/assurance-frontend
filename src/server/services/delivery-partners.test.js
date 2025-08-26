import {
  getDeliveryPartners,
  getAllDeliveryPartners,
  getDeliveryPartnerById,
  createDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  restoreDeliveryPartner
} from './delivery-partners.js'

// First declare the mocks
jest.mock('~/src/server/common/helpers/fetch/fetcher.js', () => ({
  fetcher: jest.fn()
}))

jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js', () => ({
  authedFetchJsonDecorator: jest.fn()
}))

// Define the mock logger module first
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock config module
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'api.version') {
        return 'v1.0' // Return actual version to use versioned endpoints
      }
      return undefined
    })
  }
}))

// Then initialize the mock logger
const mockLogger = jest.requireMock(
  '~/src/server/common/helpers/logging/logger.js'
).logger

// Then get references to the mocks
const { fetcher: mockFetch } = jest.requireMock(
  '~/src/server/common/helpers/fetch/fetcher.js'
)
const { authedFetchJsonDecorator: mockAuthedFetchJsonDecorator } =
  jest.requireMock('~/src/server/common/helpers/fetch/authed-fetch-json.js')
const { config: mockConfig } = jest.requireMock('~/src/config/config.js')

describe('Delivery Partners service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock config to return v1.0 for api.version to use versioned endpoints in tests
    mockConfig.get.mockImplementation((key) => {
      if (key === 'api.version') {
        return 'v1.0'
      }
      return undefined
    })
  })

  afterAll(() => {
    jest.resetModules()
  })

  describe('getDeliveryPartners', () => {
    test('should fetch and return all active delivery partners', async () => {
      // Arrange
      const mockPartners = [
        { id: '1', name: 'Partner 1', isActive: true },
        { id: '2', name: 'Partner 2', isActive: true }
      ]
      mockFetch.mockResolvedValue(mockPartners)

      // Act
      const result = await getDeliveryPartners()

      // Assert
      expect(result).toEqual(mockPartners)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners')
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const mockPartners = [
        { id: '1', name: 'Partner 1', isActive: true },
        { id: '2', name: 'Partner 2', isActive: true }
      ]
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockAuthedFetch = jest.fn().mockResolvedValue(mockPartners)
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Act
      const result = await getDeliveryPartners(mockRequest)

      // Assert
      expect(result).toEqual(mockPartners)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners')
    })

    test('should handle API errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await expect(getDeliveryPartners()).rejects.toThrow('API Error')
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'API Error'
        }),
        'Failed to fetch delivery partners'
      )
    })

    test('should handle null data from API', async () => {
      // Arrange
      mockFetch.mockResolvedValue(null)

      // Act
      const result = await getDeliveryPartners()

      // Assert
      expect(result).toEqual([])
    })

    test('should handle non-array data from API', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ error: 'Invalid data' })

      // Act
      const result = await getDeliveryPartners()

      // Assert
      expect(result).toEqual([])
    })
  })

  describe('getAllDeliveryPartners', () => {
    test('should fetch and return all delivery partners including inactive', async () => {
      // Arrange
      const mockPartners = [
        { id: '1', name: 'Partner 1', isActive: true },
        { id: '2', name: 'Partner 2', isActive: false }
      ]
      mockFetch.mockResolvedValue(mockPartners)

      // Act
      const result = await getAllDeliveryPartners()

      // Assert
      expect(result).toEqual(mockPartners)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners')
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const mockPartners = [
        { id: '1', name: 'Partner 1', isActive: true },
        { id: '2', name: 'Partner 2', isActive: false }
      ]
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockAuthedFetch = jest.fn().mockResolvedValue(mockPartners)
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Act
      const result = await getAllDeliveryPartners(mockRequest)

      // Assert
      expect(result).toEqual(mockPartners)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners')
    })

    test('should handle API errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await expect(getAllDeliveryPartners()).rejects.toThrow('API Error')
    })
  })

  describe('getDeliveryPartnerById', () => {
    test('should fetch and return delivery partner by ID', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const mockPartner = { id: partnerId, name: 'Partner 1', isActive: true }
      mockFetch.mockResolvedValue(mockPartner)

      // Act
      const result = await getDeliveryPartnerById(partnerId)

      // Assert
      expect(result).toEqual(mockPartner)
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`
      )
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const mockPartner = { id: partnerId, name: 'Partner 1', isActive: true }
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockAuthedFetch = jest.fn().mockResolvedValue(mockPartner)
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Act
      const result = await getDeliveryPartnerById(partnerId, mockRequest)

      // Assert
      expect(result).toEqual(mockPartner)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`
      )
    })

    test('should handle API errors', async () => {
      // Arrange
      const partnerId = 'partner-1'
      mockFetch.mockRejectedValue(new Error('Partner not found'))

      // Act & Assert
      await expect(getDeliveryPartnerById(partnerId)).rejects.toThrow(
        'Partner not found'
      )
    })
  })

  describe('createDeliveryPartner', () => {
    test('should transform and create delivery partner', async () => {
      // Arrange
      const partnerData = { name: 'New Partner' }
      const mockCreatedPartner = {
        Id: 'new-partner-123456',
        Name: 'New Partner',
        IsActive: true,
        CreatedAt: '2023-01-01T00:00:00.000Z',
        UpdatedAt: '2023-01-01T00:00:00.000Z'
      }
      mockFetch.mockResolvedValue(mockCreatedPartner)

      // Mock Date.now to make tests deterministic, before mocking constructor
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456)

      // Mock Date constructor
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      const OriginalDate = global.Date
      global.Date = jest.fn(() => mockDate)
      global.Date.now = dateNowSpy

      // Act
      const result = await createDeliveryPartner(partnerData)

      // Assert
      expect(result).toEqual(mockCreatedPartner)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners', {
        method: 'POST',
        body: JSON.stringify({
          Id: 'new-partner-123456',
          Name: 'New Partner',
          IsActive: true,
          CreatedAt: mockDate.toISOString(),
          UpdatedAt: mockDate.toISOString()
        })
      })

      // Restore mocks
      global.Date = OriginalDate
      dateNowSpy.mockRestore()
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const partnerData = { name: 'New Partner' }
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockCreatedPartner = {
        Id: 'new-partner-123456',
        Name: 'New Partner',
        IsActive: true
      }
      const mockAuthedFetch = jest.fn().mockResolvedValue(mockCreatedPartner)
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Mock Date.now to make tests deterministic, before mocking constructor
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456)

      // Mock Date constructor
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      const OriginalDate = global.Date
      global.Date = jest.fn(() => mockDate)
      global.Date.now = dateNowSpy

      // Act
      const result = await createDeliveryPartner(partnerData, mockRequest)

      // Assert
      expect(result).toEqual(mockCreatedPartner)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/deliverypartners',
        {
          method: 'POST',
          body: JSON.stringify({
            Id: 'new-partner-123456',
            Name: 'New Partner',
            IsActive: true,
            CreatedAt: mockDate.toISOString(),
            UpdatedAt: mockDate.toISOString()
          })
        }
      )

      // Restore mocks
      global.Date = OriginalDate
      dateNowSpy.mockRestore()
    })

    test('should use provided ID if available', async () => {
      // Arrange
      const partnerData = { id: 'custom-id', name: 'New Partner' }
      const mockCreatedPartner = {
        Id: 'custom-id',
        Name: 'New Partner',
        IsActive: true
      }
      mockFetch.mockResolvedValue(mockCreatedPartner)

      // Mock Date
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      // Act
      const result = await createDeliveryPartner(partnerData)

      // Assert
      expect(result).toEqual(mockCreatedPartner)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners', {
        method: 'POST',
        body: JSON.stringify({
          Id: 'custom-id',
          Name: 'New Partner',
          IsActive: true,
          CreatedAt: mockDate.toISOString(),
          UpdatedAt: mockDate.toISOString()
        })
      })

      // Restore mocks
      jest.restoreAllMocks()
    })

    test('should handle isActive parameter', async () => {
      // Arrange
      const partnerData = { name: 'New Partner', isActive: false }
      const mockCreatedPartner = {
        Id: 'new-partner-123456',
        Name: 'New Partner',
        IsActive: false
      }
      mockFetch.mockResolvedValue(mockCreatedPartner)

      // Mock Date.now to make tests deterministic, before mocking constructor
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456)

      // Mock Date constructor
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      const OriginalDate = global.Date
      global.Date = jest.fn(() => mockDate)
      global.Date.now = dateNowSpy

      // Act
      const result = await createDeliveryPartner(partnerData)

      // Assert
      expect(result).toEqual(mockCreatedPartner)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners', {
        method: 'POST',
        body: JSON.stringify({
          Id: 'new-partner-123456',
          Name: 'New Partner',
          IsActive: false,
          CreatedAt: mockDate.toISOString(),
          UpdatedAt: mockDate.toISOString()
        })
      })

      // Restore mocks
      global.Date = OriginalDate
      dateNowSpy.mockRestore()
    })

    test('should handle API errors', async () => {
      // Arrange
      const partnerData = { name: 'New Partner' }

      // Mock Date.now to prevent Date.now errors during ID generation
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456)

      mockFetch.mockRejectedValue(new Error('Validation failed'))

      // Act & Assert
      await expect(createDeliveryPartner(partnerData)).rejects.toThrow(
        'Validation failed'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed'
        }),
        'Failed to create delivery partner'
      )

      // Restore mocks
      dateNowSpy.mockRestore()
    })
  })

  describe('updateDeliveryPartner', () => {
    test('should transform and update delivery partner', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const updateData = { name: 'Updated Partner' }
      const mockUpdatedPartner = {
        Id: partnerId,
        Name: 'Updated Partner',
        IsActive: true,
        UpdatedAt: '2023-01-01T00:00:00.000Z'
      }
      mockFetch.mockResolvedValue(mockUpdatedPartner)

      // Mock Date
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      // Act
      const result = await updateDeliveryPartner(partnerId, updateData)

      // Assert
      expect(result).toEqual(mockUpdatedPartner)
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            Id: partnerId,
            Name: 'Updated Partner',
            IsActive: true,
            UpdatedAt: mockDate.toISOString()
          })
        }
      )

      // Restore mocks
      jest.restoreAllMocks()
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const updateData = { name: 'Updated Partner' }
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockUpdatedPartner = {
        Id: partnerId,
        Name: 'Updated Partner',
        IsActive: true
      }
      const mockAuthedFetch = jest.fn().mockResolvedValue(mockUpdatedPartner)
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Mock Date
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      // Act
      const result = await updateDeliveryPartner(
        partnerId,
        updateData,
        mockRequest
      )

      // Assert
      expect(result).toEqual(mockUpdatedPartner)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            Id: partnerId,
            Name: 'Updated Partner',
            IsActive: true,
            UpdatedAt: mockDate.toISOString()
          })
        }
      )

      // Restore mocks
      jest.restoreAllMocks()
    })

    test('should preserve createdAt if provided', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const updateData = {
        name: 'Updated Partner',
        createdAt: '2022-01-01T00:00:00.000Z'
      }
      const mockUpdatedPartner = {
        Id: partnerId,
        Name: 'Updated Partner',
        IsActive: true
      }
      mockFetch.mockResolvedValue(mockUpdatedPartner)

      // Mock Date
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      // Act
      const result = await updateDeliveryPartner(partnerId, updateData)

      // Assert
      expect(result).toEqual(mockUpdatedPartner)
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'PUT',
          body: expect.any(String)
        }
      )

      // Verify the body contains the correct data (order doesn't matter)
      const callArgs = mockFetch.mock.calls[0][1].body
      const bodyData = JSON.parse(callArgs)
      expect(bodyData).toEqual({
        Id: partnerId,
        Name: 'Updated Partner',
        IsActive: true,
        CreatedAt: '2022-01-01T00:00:00.000Z',
        UpdatedAt: mockDate.toISOString()
      })

      // Restore mocks
      jest.restoreAllMocks()
    })

    test('should handle isActive parameter', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const updateData = { name: 'Updated Partner', isActive: false }
      const mockUpdatedPartner = {
        Id: partnerId,
        Name: 'Updated Partner',
        IsActive: false
      }
      mockFetch.mockResolvedValue(mockUpdatedPartner)

      // Mock Date
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      // Act
      const result = await updateDeliveryPartner(partnerId, updateData)

      // Assert
      expect(result).toEqual(mockUpdatedPartner)
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            Id: partnerId,
            Name: 'Updated Partner',
            IsActive: false,
            UpdatedAt: mockDate.toISOString()
          })
        }
      )

      // Restore mocks
      jest.restoreAllMocks()
    })

    test('should handle API errors', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const updateData = { name: 'Updated Partner' }
      mockFetch.mockRejectedValue(new Error('Partner not found'))

      // Act & Assert
      await expect(
        updateDeliveryPartner(partnerId, updateData)
      ).rejects.toThrow('Partner not found')
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Partner not found',
          id: partnerId
        }),
        'Failed to update delivery partner'
      )
    })
  })

  describe('deleteDeliveryPartner', () => {
    test('should soft delete delivery partner', async () => {
      // Arrange
      const partnerId = 'partner-1'
      mockFetch.mockResolvedValue(true)

      // Act
      const result = await deleteDeliveryPartner(partnerId)

      // Assert
      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'DELETE'
        }
      )
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockAuthedFetch = jest.fn().mockResolvedValue(true)
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Act
      const result = await deleteDeliveryPartner(partnerId, mockRequest)

      // Assert
      expect(result).toBe(true)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'DELETE'
        }
      )
    })

    test('should handle API errors', async () => {
      // Arrange
      const partnerId = 'partner-1'
      mockFetch.mockRejectedValue(new Error('Partner not found'))

      // Act & Assert
      await expect(deleteDeliveryPartner(partnerId)).rejects.toThrow(
        'Partner not found'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Partner not found',
          id: partnerId
        }),
        'Failed to soft delete delivery partner'
      )
    })
  })

  describe('restoreDeliveryPartner', () => {
    test('should restore delivery partner', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const existingPartner = {
        Id: partnerId,
        Name: 'Existing Partner',
        IsActive: false
      }
      const mockRestoredPartner = {
        Id: partnerId,
        Name: 'Existing Partner',
        IsActive: true
      }

      // Mock the get call first, then the update call
      mockFetch.mockResolvedValueOnce(existingPartner) // getDeliveryPartnerById
      mockFetch.mockResolvedValueOnce(mockRestoredPartner) // updateDeliveryPartner

      // Mock Date
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      // Act
      const result = await restoreDeliveryPartner(partnerId)

      // Assert
      expect(result).toEqual(mockRestoredPartner)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `/api/v1.0/deliverypartners/${partnerId}`
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'PUT',
          body: expect.any(String)
        }
      )

      // Verify the body contains the correct transformation
      const secondCallArgs = mockFetch.mock.calls[1][1].body
      const bodyData = JSON.parse(secondCallArgs)
      expect(bodyData).toEqual({
        Id: partnerId,
        IsActive: true,
        UpdatedAt: mockDate.toISOString()
      })

      // Restore mocks
      jest.restoreAllMocks()
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const partnerId = 'partner-1'
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const existingPartner = {
        Id: partnerId,
        Name: 'Existing Partner',
        IsActive: false
      }
      const mockRestoredPartner = {
        Id: partnerId,
        Name: 'Existing Partner',
        IsActive: true
      }
      const mockAuthedFetch = jest.fn()
      mockAuthedFetch.mockResolvedValueOnce(existingPartner) // getDeliveryPartnerById
      mockAuthedFetch.mockResolvedValueOnce(mockRestoredPartner) // updateDeliveryPartner
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Mock Date
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      // Act
      const result = await restoreDeliveryPartner(partnerId, mockRequest)

      // Assert
      expect(result).toEqual(mockRestoredPartner)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledTimes(2)
      expect(mockAuthedFetch).toHaveBeenNthCalledWith(
        1,
        `/api/v1.0/deliverypartners/${partnerId}`
      )
      expect(mockAuthedFetch).toHaveBeenNthCalledWith(
        2,
        `/api/v1.0/deliverypartners/${partnerId}`,
        {
          method: 'PUT',
          body: expect.any(String)
        }
      )

      // Verify the body contains the correct transformation
      const secondCallArgs = mockAuthedFetch.mock.calls[1][1].body
      const bodyData = JSON.parse(secondCallArgs)
      expect(bodyData).toEqual({
        Id: partnerId,
        IsActive: true,
        UpdatedAt: mockDate.toISOString()
      })

      // Restore mocks
      jest.restoreAllMocks()
    })

    test('should handle API errors', async () => {
      // Arrange
      const partnerId = 'partner-1'
      mockFetch.mockRejectedValue(new Error('Partner not found'))

      // Act & Assert
      await expect(restoreDeliveryPartner(partnerId)).rejects.toThrow(
        'Partner not found'
      )
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Partner not found',
          id: partnerId
        }),
        'Failed to fetch delivery partner by ID'
      )
    })
  })

  // Test ID generation helper function (indirectly through create)
  describe('ID generation', () => {
    test('should generate valid ID from name', async () => {
      // Arrange
      const partnerData = { name: 'Test Partner Name!' }
      const mockCreatedPartner = {
        Id: 'test-partner-name-123456',
        Name: 'Test Partner Name!',
        IsActive: true
      }
      mockFetch.mockResolvedValue(mockCreatedPartner)

      // Mock Date.now to make tests deterministic, before mocking constructor
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123456)

      // Mock Date constructor
      const mockDate = new Date('2023-01-01T00:00:00.000Z')
      const OriginalDate = global.Date
      global.Date = jest.fn(() => mockDate)
      global.Date.now = dateNowSpy

      // Act
      await createDeliveryPartner(partnerData)

      // Assert - Check that the ID was generated correctly
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/deliverypartners', {
        method: 'POST',
        body: JSON.stringify({
          Id: 'test-partner-name-123456', // Special characters removed, spaces to dashes, timestamp added
          Name: 'Test Partner Name!',
          IsActive: true,
          CreatedAt: mockDate.toISOString(),
          UpdatedAt: mockDate.toISOString()
        })
      })

      // Restore mocks
      global.Date = OriginalDate
      dateNowSpy.mockRestore()
    })
  })
})
