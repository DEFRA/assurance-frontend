import {
  getProjects,
  getProjectById,
  updateProject,
  getStandardHistory,
  getProjectHistory,
  createProject
} from './projects.js'

// First declare the mocks
jest.mock('~/src/server/common/helpers/fetch/fetcher.js', () => ({
  fetcher: jest.fn()
}))

jest.mock('~/src/server/services/service-standards.js', () => ({
  getServiceStandards: jest.fn()
}))

// Define the mock logger module first
jest.mock('~/src/server/common/helpers/logging/logger.js', () => {
  return {
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    })
  }
})

// Then initialize the mock logger
const mockLogger = jest
  .requireMock('~/src/server/common/helpers/logging/logger.js')
  .createLogger()

// Then get references to the mocks
const { fetcher: mockFetch } = jest.requireMock(
  '~/src/server/common/helpers/fetch/fetcher.js'
)
const { getServiceStandards: mockGetServiceStandards } = jest.requireMock(
  '~/src/server/services/service-standards.js'
)

describe('Projects service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    jest.resetModules()
  })

  describe('getProjects', () => {
    test('should fetch and return all projects', async () => {
      // Arrange
      const mockProjects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' }
      ]
      mockFetch.mockResolvedValue(mockProjects)

      // Act
      const result = await getProjects()

      // Assert
      expect(result).toEqual(mockProjects)
      expect(mockFetch).toHaveBeenCalledWith('/projects')
    })

    test('should handle API errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API Error'))

      // Act & Assert
      await expect(getProjects()).rejects.toThrow('API Error')
    })

    test('should handle null data from API', async () => {
      // Arrange
      mockFetch.mockResolvedValue(null)

      // Act
      const result = await getProjects()

      // Assert
      expect(result).toEqual([])
    })

    test('should handle non-array data from API', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ error: 'Invalid data' })

      // Act
      const result = await getProjects()

      // Assert
      expect(result).toEqual([])
    })

    test('should log sample project structure when data exists', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '1',
          standards: [
            { standardId: '1', status: 'GREEN' },
            { standardId: '2', status: 'AMBER' }
          ]
        }
      ]
      mockFetch.mockResolvedValue(mockProjects)

      // Act
      await getProjects()

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          sampleProject: {
            id: '1',
            standards: [
              { standardId: '1', status: 'GREEN' },
              { standardId: '2', status: 'AMBER' }
            ]
          }
        },
        'Sample project structure'
      )
    })

    test('should handle projects with tags', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '1',
          tags: ['Portfolio: Future Farming', 'Type: Development']
        }
      ]
      mockFetch.mockResolvedValue(mockProjects)

      // Act
      const result = await getProjects()

      // Assert
      expect(result[0].tags).toEqual([
        'Portfolio: Future Farming',
        'Type: Development'
      ])
    })

    test('should handle projects with empty tags', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '1',
          tags: []
        }
      ]
      mockFetch.mockResolvedValue(mockProjects)

      // Act
      const result = await getProjects()

      // Assert
      expect(result[0].tags).toEqual([])
    })
  })

  describe('getProjectById', () => {
    test('should fetch and return a specific project', async () => {
      // Arrange
      const mockProject = { id: '1', name: 'Project 1' }
      mockFetch.mockResolvedValue(mockProject)

      // Act
      const result = await getProjectById('1')

      // Assert
      expect(result).toEqual(mockProject)
      expect(mockFetch).toHaveBeenCalledWith('/projects/1')
    })

    test('should handle project not found', async () => {
      // Arrange
      mockFetch.mockResolvedValue(null)

      // Act
      const result = await getProjectById('999')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('updateProject', () => {
    const mockProjectUpdate = {
      status: 'GREEN',
      commentary: 'Updated commentary',
      standards: [
        { standardId: '1', status: 'GREEN', commentary: 'Standard met' }
      ]
    }

    test('should update project successfully', async () => {
      // Arrange
      const currentProject = {
        id: '1',
        standards: [
          { standardId: '1', status: 'AMBER', commentary: 'Previous state' }
        ]
      }
      const mockResponse = { success: true }
      mockFetch
        .mockResolvedValueOnce(currentProject) // First call to get current project
        .mockResolvedValueOnce(mockResponse) // Second call to update project

      // Act
      const result = await updateProject('1', mockProjectUpdate)

      // Assert
      expect(result).toEqual(mockResponse)
      // Verify the call was made with correct URL and method
      expect(mockFetch).toHaveBeenCalledWith(
        '/projects/1',
        expect.objectContaining({
          method: 'PUT'
        })
      )

      // Parse and verify the body content separately
      const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(secondCallBody).toEqual(
        expect.objectContaining({
          id: '1',
          standards: [
            { standardId: '1', status: 'GREEN', commentary: 'Standard met' }
          ],
          status: 'GREEN',
          commentary: 'Updated commentary'
        })
      )
      expect(secondCallBody.lastUpdated).toMatch(/\d{1,2} \w+ \d{4}/)
    })

    test('should handle update failure', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Update failed'))

      // Act & Assert
      await expect(updateProject('1', mockProjectUpdate)).rejects.toThrow(
        'Update failed'
      )
    })

    test('should handle API validation failure', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ id: '1' }) // Get current project
        .mockResolvedValueOnce({
          // Update response
          isBoom: true,
          output: {
            statusCode: 400,
            payload: { message: 'Validation failed' }
          }
        })

      // Act & Assert
      await expect(
        updateProject('1', {
          status: 'GREEN',
          commentary: 'Test'
        })
      ).rejects.toThrow('Failed to update project: Invalid data')
    })

    test('should handle empty API response', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ id: '1' }) // Get current project
        .mockResolvedValueOnce(null) // Empty update response

      // Act & Assert
      await expect(
        updateProject('1', {
          status: 'GREEN',
          commentary: 'Test'
        })
      ).rejects.toThrow('Failed to update project')
    })

    test('should handle missing current project', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(null) // No current project found

      // Act & Assert
      await expect(
        updateProject('1', {
          status: 'GREEN',
          commentary: 'Test'
        })
      ).rejects.toThrow('Project not found')
    })

    test('should handle invalid status updates', async () => {
      // Arrange
      const currentProject = {
        id: '1',
        standards: []
      }
      mockFetch.mockResolvedValueOnce(currentProject)

      // Act & Assert
      await expect(
        updateProject('1', {
          status: 'INVALID_STATUS',
          commentary: 'Test'
        })
      ).rejects.toThrow('Update failed')
    })

    test('should handle empty commentary updates', async () => {
      // Arrange
      const currentProject = {
        id: '1',
        standards: []
      }
      mockFetch.mockResolvedValueOnce(currentProject)

      // Act & Assert
      await expect(
        updateProject('1', {
          status: 'GREEN',
          commentary: ''
        })
      ).rejects.toThrow('Update failed')
    })

    test('should handle API validation errors', async () => {
      // Arrange
      const currentProject = {
        id: '123',
        standards: [{ standardId: '1', status: 'GREEN' }]
      }
      mockFetch
        .mockResolvedValueOnce(currentProject) // getProjectById call
        .mockResolvedValueOnce({
          isBoom: true,
          output: {
            statusCode: 400,
            payload: { message: 'Invalid data' }
          }
        })

      // Act & Assert
      await expect(
        updateProject('123', {
          status: 'INVALID',
          commentary: 'Test'
        })
      ).rejects.toThrow('Failed to update project: Invalid data')
    })

    test('should merge updated standards with existing ones', async () => {
      // Arrange
      const currentProject = {
        id: '123',
        standards: [
          { standardId: '1', status: 'AMBER', commentary: 'Old' },
          { standardId: '2', status: 'GREEN', commentary: 'Unchanged' }
        ]
      }
      mockFetch
        .mockResolvedValueOnce(currentProject)
        .mockResolvedValueOnce({ success: true })

      // Act
      await updateProject('123', {
        status: 'GREEN',
        commentary: 'Updated',
        standards: [{ standardId: '1', status: 'GREEN', commentary: 'New' }]
      })

      // Assert
      const updateCall = mockFetch.mock.calls[1]
      const requestBody = JSON.parse(updateCall[1].body)
      expect(requestBody.standards).toEqual([
        { standardId: '1', status: 'GREEN', commentary: 'New' },
        { standardId: '2', status: 'GREEN', commentary: 'Unchanged' }
      ])
    })
  })

  describe('getStandardHistory', () => {
    test('should fetch standard history', async () => {
      // Arrange
      const mockHistory = [
        {
          date: '2024-02-15',
          status: 'GREEN',
          commentary: 'Standard met'
        }
      ]
      mockFetch.mockResolvedValue(mockHistory)

      // Act
      const result = await getStandardHistory('1', '2')

      // Assert
      expect(result).toEqual(mockHistory)
      expect(mockFetch).toHaveBeenCalledWith('/projects/1/standards/2/history')
    })

    test('should handle empty history', async () => {
      // Arrange
      mockFetch.mockResolvedValue([])

      // Act
      const result = await getStandardHistory('1', '2')

      // Assert
      expect(result).toEqual([])
    })

    test('should handle null API response and log warning', async () => {
      // Arrange
      mockFetch.mockResolvedValue(null)

      // Act
      const result = await getStandardHistory('123', '1')

      // Assert
      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith('No history found', {
        projectId: '123',
        standardId: '1'
      })
    })

    test('should handle invalid project ID', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Invalid project ID'))

      // Act & Assert
      await expect(getStandardHistory('invalid', '1')).rejects.toThrow(
        'Invalid project ID'
      )
    })

    test('should handle invalid standard ID', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Invalid standard ID'))

      // Act & Assert
      await expect(getStandardHistory('1', 'invalid')).rejects.toThrow(
        'Invalid standard ID'
      )
    })

    test('should log history count on success', async () => {
      // Arrange
      const mockHistory = [
        { date: '2024-01-01', status: 'GREEN' },
        { date: '2024-01-02', status: 'AMBER' }
      ]
      mockFetch.mockResolvedValue(mockHistory)

      // Act
      const result = await getStandardHistory('123', '1')

      // Assert
      expect(result).toEqual(mockHistory)
      expect(mockLogger.info).toHaveBeenCalledWith(
        { historyCount: 2 },
        'Standard history retrieved successfully'
      )
    })
  })

  describe('getProjectHistory', () => {
    test('should fetch project history', async () => {
      // Arrange
      const mockHistory = [
        {
          date: '2024-02-15',
          status: 'GREEN',
          commentary: 'Project updated'
        }
      ]
      mockFetch.mockResolvedValue(mockHistory)

      // Act
      const result = await getProjectHistory('1')

      // Assert
      expect(result).toEqual(mockHistory)
      expect(mockFetch).toHaveBeenCalledWith('/projects/1/history')
    })

    test('should handle empty history', async () => {
      // Arrange
      mockFetch.mockResolvedValue([])

      // Act
      const result = await getProjectHistory('1')

      // Assert
      expect(result).toEqual([])
    })

    test('should handle empty API response', async () => {
      // Arrange
      mockFetch.mockResolvedValue(null)

      // Act
      const result = await getProjectHistory('1')

      // Assert
      expect(result).toEqual([])
    })
  })
})

describe('createProject', () => {
  test('should create project with standards', async () => {
    // Arrange
    const mockStandards = [
      { number: 2, name: 'Standard 2' },
      { number: 1, name: 'Standard 1' }
    ]
    const mockProjectData = {
      name: 'Test Project',
      status: 'GREEN',
      commentary: 'Initial setup'
    }
    const mockResponse = { id: '123', ...mockProjectData }

    mockGetServiceStandards.mockResolvedValue(mockStandards)
    mockFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await createProject(mockProjectData)

    // Assert
    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"standards":[{') // Verify standards included
      })
    )
    // Verify standards are sorted by number
    const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(requestBody.standards[0].standardId).toBe('1')
    expect(requestBody.standards[1].standardId).toBe('2')
  })

  test('should handle missing service standards', async () => {
    // Arrange
    mockGetServiceStandards.mockResolvedValue([])

    // Act & Assert
    await expect(
      createProject({
        name: 'Test Project',
        status: 'GREEN'
      })
    ).rejects.toThrow(
      'Failed to create project: No service standards available'
    )
  })

  test('should handle API validation errors', async () => {
    // Arrange
    const mockStandards = [{ number: 1, name: 'Standard 1' }]
    mockGetServiceStandards.mockResolvedValue(mockStandards)
    mockFetch.mockResolvedValue({
      isBoom: true,
      output: {
        statusCode: 400,
        payload: { message: 'Invalid data' }
      }
    })

    // Act & Assert
    await expect(
      createProject({
        name: 'Test Project',
        status: 'INVALID'
      })
    ).rejects.toThrow('Failed to create project: Invalid data')
  })

  test('should handle empty API response', async () => {
    // Arrange
    const mockStandards = [{ number: 1, name: 'Standard 1' }]
    mockGetServiceStandards.mockResolvedValue(mockStandards)
    mockFetch.mockResolvedValue({
      isBoom: true,
      output: {
        statusCode: 500,
        payload: { message: 'Failed to create project' }
      }
    })

    // Act & Assert
    await expect(
      createProject({
        name: 'Test Project',
        status: 'GREEN'
      })
    ).rejects.toThrow('Failed to create project')
  })
})
