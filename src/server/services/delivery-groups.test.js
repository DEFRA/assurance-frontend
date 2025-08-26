import {
  getDeliveryGroups,
  getAllDeliveryGroups,
  getDeliveryGroupById,
  createDeliveryGroup,
  updateDeliveryGroup,
  deleteDeliveryGroup,
  restoreDeliveryGroup
} from './delivery-groups.js'

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

// Then get references to the mocks (mockLogger and mockFetch not used in this test file)
// const mockLogger = jest.requireMock(
//   '~/src/server/common/helpers/logging/logger.js'
// ).logger

// const { fetcher: mockFetch } = jest.requireMock(
//   '~/src/server/common/helpers/fetch/fetcher.js'
// )

const { authedFetchJsonDecorator: mockAuthedFetchJsonDecorator } =
  jest.requireMock('~/src/server/common/helpers/fetch/authed-fetch-json.js')

// Mock data
const mockDeliveryGroups = [
  {
    Id: 'frontend-team',
    Name: 'Frontend Development Team',
    Status: 'Active',
    Lead: 'John Doe',
    IsActive: true,
    CreatedAt: '2024-01-15T09:00:00.000Z',
    UpdatedAt: '2024-01-15T09:00:00.000Z'
  },
  {
    Id: 'backend-team',
    Name: 'Backend Services Team',
    Status: 'Pending',
    Lead: 'Jane Smith',
    IsActive: true,
    CreatedAt: '2024-01-16T10:30:00.000Z',
    UpdatedAt: '2024-01-16T10:30:00.000Z'
  },
  {
    Id: 'devops-team',
    Name: 'DevOps and Infrastructure',
    Status: 'On Hold',
    Lead: 'Bob Wilson',
    IsActive: false,
    CreatedAt: '2024-01-17T14:15:00.000Z',
    UpdatedAt: '2024-01-18T09:20:00.000Z'
  }
]

describe('Delivery Groups Service', () => {
  let mockRequest
  let mockAuthedFetch

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock request with logger
    mockRequest = {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }
    }

    // Create mock authed fetch function
    mockAuthedFetch = jest.fn()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  describe('getDeliveryGroups', () => {
    it('should return active delivery groups sorted by creation date', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockDeliveryGroups)

      // Act
      const result = await getDeliveryGroups(mockRequest)

      // Assert
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/deliverygroups')
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        'Fetching active delivery groups from API'
      )

      // Should only return active groups (2 out of 3)
      expect(result).toHaveLength(2)
      expect(result[0].Name).toBe('Backend Services Team') // Newer first
      expect(result[1].Name).toBe('Frontend Development Team')
      expect(result.every((group) => group.IsActive)).toBe(true)
    })

    it('should handle empty response', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue([])

      // Act
      const result = await getDeliveryGroups(mockRequest)

      // Assert
      expect(result).toEqual([])
    })

    it('should handle null response', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(null)

      // Act
      const result = await getDeliveryGroups(mockRequest)

      // Assert
      expect(result).toEqual([])
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const apiError = new Error('API Error')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(getDeliveryGroups(mockRequest)).rejects.toThrow('API Error')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: apiError },
        'Failed to fetch delivery groups from API'
      )
    })
  })

  describe('getAllDeliveryGroups', () => {
    it('should return all delivery groups sorted by creation date', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue(mockDeliveryGroups)

      // Act
      const result = await getAllDeliveryGroups(mockRequest)

      // Assert
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/deliverygroups')
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        'Fetching all delivery groups including archived from API'
      )

      // Should return all groups (3 total) sorted by creation date (newest first)
      expect(result).toHaveLength(3)
      expect(result[0].Name).toBe('DevOps and Infrastructure') // Newest (archived)
      expect(result[1].Name).toBe('Backend Services Team')
      expect(result[2].Name).toBe('Frontend Development Team')
    })

    it('should handle empty response', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue([])

      // Act
      const result = await getAllDeliveryGroups(mockRequest)

      // Assert
      expect(result).toEqual([])
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const apiError = new Error('API Error')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(getAllDeliveryGroups(mockRequest)).rejects.toThrow(
        'API Error'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: apiError },
        'Failed to fetch all delivery groups from API'
      )
    })
  })

  describe('getDeliveryGroupById', () => {
    it('should return delivery group by ID', async () => {
      // Arrange
      const groupId = 'frontend-team'
      const expectedGroup = mockDeliveryGroups[0]
      mockAuthedFetch.mockResolvedValue(expectedGroup)

      // Act
      const result = await getDeliveryGroupById(groupId, mockRequest)

      // Assert
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverygroups/${groupId}`
      )
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        { id: groupId },
        'Fetching delivery group by ID from API'
      )
      expect(result).toEqual(expectedGroup)
    })

    it('should throw error when delivery group not found', async () => {
      // Arrange
      const groupId = 'nonexistent-group'
      mockAuthedFetch.mockResolvedValue(null)

      // Act & Assert
      await expect(getDeliveryGroupById(groupId, mockRequest)).rejects.toThrow(
        `Delivery group with ID ${groupId} not found`
      )
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const groupId = 'frontend-team'
      const apiError = new Error('API Error')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(getDeliveryGroupById(groupId, mockRequest)).rejects.toThrow(
        'API Error'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: apiError, id: groupId },
        'Failed to fetch delivery group by ID from API'
      )
    })
  })

  describe('createDeliveryGroup', () => {
    it('should create delivery group successfully', async () => {
      // Arrange
      const groupData = {
        Id: 'new-team',
        Name: 'New Team',
        Status: 'Pending',
        Lead: 'Alice Brown',
        IsActive: true,
        CreatedAt: '2024-01-20T10:00:00.000Z',
        UpdatedAt: '2024-01-20T10:00:00.000Z'
      }
      mockAuthedFetch.mockResolvedValue(groupData)

      // Act
      const result = await createDeliveryGroup(groupData, mockRequest)

      // Assert
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/deliverygroups', {
        method: 'POST',
        body: JSON.stringify(groupData)
      })
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        { groupData },
        'Creating delivery group via API'
      )
      expect(result).toEqual(groupData)
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const groupData = { Name: 'Test Group' }
      const apiError = new Error('Validation Error')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(createDeliveryGroup(groupData, mockRequest)).rejects.toThrow(
        'Validation Error'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: apiError, groupData },
        'Failed to create delivery group via API'
      )
    })
  })

  describe('updateDeliveryGroup', () => {
    it('should update delivery group successfully', async () => {
      // Arrange
      const groupId = 'frontend-team'
      const updateData = { Name: 'Updated Frontend Team', Lead: 'New Lead' }
      const existingGroup = mockDeliveryGroups[0]
      const updatedGroup = { ...existingGroup, ...updateData }

      // Mock the getDeliveryGroupById call within updateDeliveryGroup
      mockAuthedFetch
        .mockResolvedValueOnce(existingGroup) // First call for getting existing group
        .mockResolvedValueOnce(updatedGroup) // Second call for update

      // Act
      const result = await updateDeliveryGroup(groupId, updateData, mockRequest)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverygroups/${groupId}`
      )
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverygroups/${groupId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ ...existingGroup, ...updateData })
        }
      )
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        { id: groupId, updateData },
        'Updating delivery group via API'
      )
      expect(result).toEqual(updatedGroup)
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const groupId = 'frontend-team'
      const updateData = { Name: 'Updated Name' }
      const apiError = new Error('Update Error')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(
        updateDeliveryGroup(groupId, updateData, mockRequest)
      ).rejects.toThrow('Update Error')
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: apiError, id: groupId, updateData },
        'Failed to update delivery group via API'
      )
    })
  })

  describe('deleteDeliveryGroup', () => {
    it('should archive delivery group successfully', async () => {
      // Arrange
      const groupId = 'frontend-team'
      const existingGroup = mockDeliveryGroups[0] // Use the correct group
      const archivedGroup = { ...existingGroup, IsActive: false }

      mockAuthedFetch
        .mockResolvedValueOnce(existingGroup) // First call for getting existing group
        .mockResolvedValueOnce(archivedGroup) // Second call for update

      // Act
      const result = await deleteDeliveryGroup(groupId, mockRequest)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverygroups/${groupId}`
      )
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverygroups/${groupId}`,
        {
          method: 'PUT',
          body: expect.stringContaining('"IsActive":false')
        }
      )
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        { id: groupId },
        'Archiving delivery group via API'
      )
      expect(result).toEqual(archivedGroup)
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const groupId = 'frontend-team'
      const apiError = new Error('Delete Error')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(deleteDeliveryGroup(groupId, mockRequest)).rejects.toThrow(
        'Delete Error'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: apiError, id: groupId },
        'Failed to archive delivery group via API'
      )
    })
  })

  describe('restoreDeliveryGroup', () => {
    it('should restore delivery group successfully', async () => {
      // Arrange
      const groupId = 'devops-team'
      const existingGroup = mockDeliveryGroups[2] // The archived one
      const restoredGroup = { ...existingGroup, IsActive: true }

      mockAuthedFetch
        .mockResolvedValueOnce(existingGroup) // First call for getting existing group
        .mockResolvedValueOnce(restoredGroup) // Second call for update

      // Act
      const result = await restoreDeliveryGroup(groupId, mockRequest)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverygroups/${groupId}`
      )
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        `/api/v1.0/deliverygroups/${groupId}`,
        {
          method: 'PUT',
          body: expect.stringContaining('"IsActive":true')
        }
      )
      expect(mockRequest.logger.info).toHaveBeenCalledWith(
        { id: groupId },
        'Restoring delivery group via API'
      )
      expect(result).toEqual(restoredGroup)
    })

    it('should throw error on API failure', async () => {
      // Arrange
      const groupId = 'devops-team'
      const apiError = new Error('Restore Error')
      mockAuthedFetch.mockRejectedValue(apiError)

      // Act & Assert
      await expect(restoreDeliveryGroup(groupId, mockRequest)).rejects.toThrow(
        'Restore Error'
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: apiError, id: groupId },
        'Failed to restore delivery group via API'
      )
    })
  })
})
