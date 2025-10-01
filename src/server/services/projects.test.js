import {
  getProjects,
  getProjectById,
  updateProject,
  getStandardHistory,
  getProjectHistory,
  createProject,
  deleteProject,
  getProfessionHistory,
  archiveProjectHistoryEntry,
  archiveProfessionHistoryEntry,
  getAssessment,
  updateAssessment,
  getAssessmentHistory,
  archiveAssessmentHistoryEntry,
  replaceAssessment,
  replaceProjectStatus,
  getProjectsByDeliveryGroup,
  getProjectDeliveryPartners
} from './projects.js'

// First declare the mocks
jest.mock('~/src/server/common/helpers/fetch/fetcher.js', () => ({
  fetcher: jest.fn()
}))

jest.mock('~/src/server/services/service-standards.js', () => ({
  getServiceStandards: jest.fn()
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
const { getServiceStandards: mockGetServiceStandards } = jest.requireMock(
  '~/src/server/services/service-standards.js'
)
const { authedFetchJsonDecorator: mockAuthedFetchJsonDecorator } =
  jest.requireMock('~/src/server/common/helpers/fetch/authed-fetch-json.js')
const { config: mockConfig } = jest.requireMock('~/src/config/config.js')

describe('Projects service', () => {
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
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/projects')
    })

    test('should use authenticated fetcher when request is provided', async () => {
      // Arrange
      const mockProjects = [
        { id: '1', name: 'Project 1' },
        { id: '2', name: 'Project 2' }
      ]
      const mockRequest = { auth: { credentials: { token: 'test-token' } } }
      const mockAuthedFetch = jest.fn().mockResolvedValue(mockProjects)
      mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Act
      const result = await getProjects(mockRequest)

      // Assert
      expect(result).toEqual(mockProjects)
      expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
      expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/projects')
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

    test('should handle projects with non-array standards', async () => {
      // Arrange
      const mockProjects = [
        {
          id: '1',
          standards: null
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
            standards: []
          }
        },
        'Sample project structure'
      )
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
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/projects/1')
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
        '/api/v1.0/projects/1',
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
      // lastUpdated is now handled by the backend, so we don't expect it in the request body
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
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1.0/projects/1/standards/2/history'
      )
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
          commentary: 'Project updated',
          timestamp: '2025-05-06T13:05:50.032Z',
          type: 'project',
          changes: {
            status: {
              from: '',
              to: 'GREEN'
            },
            commentary: {
              from: '',
              to: 'Project updated'
            }
          }
        }
      ]
      mockFetch.mockResolvedValue(mockHistory)

      // Act
      const result = await getProjectHistory('1')

      // Assert
      expect(result).toEqual(mockHistory)
      expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/projects/1/history')
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
  test('should create a new project with standards', async () => {
    // Arrange
    const projectData = {
      name: 'New Project',
      phase: 'Alpha',
      defCode: 'DEF001',
      status: 'GREEN',
      commentary: 'Initial project'
    }

    const mockStandards = [
      { number: 1, name: 'Standard 1' },
      { number: 2, name: 'Standard 2' }
    ]

    const expectedProject = {
      id: 'new-project-id',
      name: 'New Project',
      phase: 'Alpha',
      defCode: 'DEF001',
      status: 'GREEN',
      commentary: 'Initial project'
    }

    mockGetServiceStandards.mockResolvedValue(mockStandards)
    mockFetch.mockResolvedValue(expectedProject)

    // Act
    const result = await createProject(projectData)

    // Assert
    expect(result).toEqual(expectedProject)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects',
      expect.objectContaining({
        method: 'POST'
      })
    )

    // Check the body was called with the right structure
    const callArgs = mockFetch.mock.calls[0][1]
    const sentData = JSON.parse(callArgs.body)
    expect(sentData.name).toBe('New Project')
    expect(sentData.phase).toBe('Alpha')
    expect(sentData.standards).toHaveLength(2)
    expect(sentData.standards[0].standardId).toBe('1')
    expect(sentData.standards[1].standardId).toBe('2')
  })

  test('should create project with authenticated request', async () => {
    // Arrange
    const projectData = {
      name: 'Auth Project',
      phase: 'Beta',
      defCode: 'DEF002',
      status: 'AMBER',
      commentary: 'Authenticated project'
    }

    const mockRequest = { auth: { credentials: { token: 'test-token' } } }
    const mockAuthedFetch = jest
      .fn()
      .mockResolvedValue({ id: 'auth-project-id' })
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
    mockGetServiceStandards.mockResolvedValue([])

    // Act
    const result = await createProject(projectData, mockRequest)

    // Assert
    expect(result).toEqual({ id: 'auth-project-id' })
    expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects',
      expect.any(Object)
    )
  })

  test('should handle standards fetch failure gracefully', async () => {
    // Arrange
    const projectData = {
      name: 'Project Without Standards',
      phase: 'Discovery',
      defCode: 'DEF003',
      status: 'RED',
      commentary: 'No standards available'
    }

    mockGetServiceStandards.mockRejectedValue(
      new Error('Standards service unavailable')
    )
    mockFetch.mockResolvedValue({ id: 'project-no-standards' })

    // Act
    const result = await createProject(projectData)

    // Assert
    expect(result).toEqual({ id: 'project-no-standards' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects',
      expect.objectContaining({
        method: 'POST'
      })
    )

    // Check the body was called with empty standards
    const callArgs = mockFetch.mock.calls[0][1]
    const sentData = JSON.parse(callArgs.body)
    expect(sentData.name).toBe('Project Without Standards')
    expect(sentData.standards).toEqual([])
  })

  test('should handle empty standards array', async () => {
    // Arrange
    const projectData = {
      name: 'Empty Standards Project',
      phase: 'Live',
      defCode: 'DEF004',
      status: 'GREEN',
      commentary: 'Empty standards'
    }

    mockGetServiceStandards.mockResolvedValue([])
    mockFetch.mockResolvedValue({ id: 'empty-standards-project' })

    // Act
    const result = await createProject(projectData)

    // Assert
    expect(result).toEqual({ id: 'empty-standards-project' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects',
      expect.objectContaining({
        method: 'POST'
      })
    )

    // Check the body was called with empty standards
    const callArgs = mockFetch.mock.calls[0][1]
    const sentData = JSON.parse(callArgs.body)
    expect(sentData.standards).toEqual([])
  })

  test('should handle Boom error response', async () => {
    // Arrange
    const projectData = {
      name: 'Invalid Project',
      phase: 'Alpha',
      defCode: 'INVALID',
      status: 'GREEN',
      commentary: 'This will fail'
    }

    const boomError = {
      isBoom: true,
      output: {
        statusCode: 400,
        payload: { message: 'Invalid project data' }
      }
    }

    mockGetServiceStandards.mockResolvedValue([])
    mockFetch.mockResolvedValue(boomError)

    // Act & Assert
    await expect(createProject(projectData)).rejects.toThrow(
      'Failed to create project: Invalid data'
    )
  })

  test('should handle null response from API', async () => {
    // Arrange
    const projectData = {
      name: 'Null Response Project',
      phase: 'Alpha',
      defCode: 'DEF005',
      status: 'GREEN',
      commentary: 'Null response'
    }

    mockGetServiceStandards.mockResolvedValue([])
    mockFetch.mockResolvedValue(null)

    // Act & Assert
    await expect(createProject(projectData)).rejects.toThrow(
      'Cannot read properties of null'
    )
  })

  test('should sort standards by number before adding to project', async () => {
    // Arrange
    const projectData = {
      name: 'Sorted Standards Project',
      phase: 'Beta',
      defCode: 'DEF006',
      status: 'AMBER',
      commentary: 'Standards should be sorted'
    }

    const mockStandards = [
      { number: 3, name: 'Standard 3' },
      { number: 1, name: 'Standard 1' },
      { number: 2, name: 'Standard 2' }
    ]

    mockGetServiceStandards.mockResolvedValue(mockStandards)
    mockFetch.mockResolvedValue({ id: 'sorted-project' })

    // Act
    const result = await createProject(projectData)

    // Assert
    expect(result).toEqual({ id: 'sorted-project' })

    // Verify the call was made with standards in the correct order
    const callArgs = mockFetch.mock.calls[0][1]
    const projectWithStandards = JSON.parse(callArgs.body)

    expect(projectWithStandards.standards).toEqual([
      expect.objectContaining({ standardId: '1' }),
      expect.objectContaining({ standardId: '2' }),
      expect.objectContaining({ standardId: '3' })
    ])
  })

  test('should handle API errors during creation', async () => {
    // Arrange
    const projectData = {
      name: 'Error Project',
      phase: 'Alpha',
      defCode: 'ERROR',
      status: 'RED',
      commentary: 'This will cause an error'
    }

    const apiError = new Error('Network error')
    apiError.code = 'ECONNREFUSED'

    mockGetServiceStandards.mockResolvedValue([])
    mockFetch.mockRejectedValue(apiError)

    // Act & Assert
    await expect(createProject(projectData)).rejects.toThrow('Network error')
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Network error',
        code: 'ECONNREFUSED',
        projectData
      }),
      'Failed to create project'
    )
  })
})

describe('deleteProject', () => {
  const mockRequest = {
    auth: {
      credentials: {
        token: 'test-token'
      }
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  }

  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should delete project with authenticated request', async () => {
    // Arrange
    mockAuthedFetch.mockResolvedValue(true)

    // Act
    const result = await deleteProject('1', mockRequest)

    // Assert
    expect(result).toBe(true)
    expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
    expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/projects/1', {
      method: 'DELETE'
    })
  })

  test('should delete project without authenticated request', async () => {
    // Arrange
    mockFetch.mockResolvedValue(true)

    // Act
    const result = await deleteProject('1')

    // Assert
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/projects/1', {
      method: 'DELETE'
    })
  })

  test('should handle API errors', async () => {
    // Arrange
    const error = new Error('Delete failed')
    mockFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(deleteProject('1')).rejects.toThrow('Delete failed')
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Delete failed',
        id: '1'
      }),
      'Failed to delete project'
    )
  })

  test('should log project ID when successfully deleted', async () => {
    // Arrange
    mockFetch.mockResolvedValue(true)

    // Act
    await deleteProject('test-project-id')

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      { id: 'test-project-id' },
      'Project deleted successfully'
    )
  })
})

describe('getProfessionHistory', () => {
  const mockRequest = {
    auth: {
      credentials: {
        token: 'test-token'
      }
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  }

  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
    process.env.NODE_ENV = 'test' // Ensure we're in test mode to prevent cache parameters
  })

  test('should fetch profession history with authenticated request', async () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2024-02-15T12:00:00Z',
        changes: {
          status: { from: 'AMBER', to: 'GREEN' },
          commentary: { from: '', to: 'Updated profession status' }
        }
      }
    ]
    mockAuthedFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProfessionHistory('1', '2', mockRequest)

    // Assert
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          timestamp: '2024-02-15T12:00:00Z',
          type: 'profession'
        })
      ])
    )
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/professions/2/history'
    )
  })

  test('should fetch profession history without authenticated request', async () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2024-02-15T12:00:00Z',
        status: 'GREEN',
        commentary: 'Test commentary'
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProfessionHistory('1', '2')

    // Assert
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          timestamp: '2024-02-15T12:00:00Z',
          type: 'profession',
          changes: expect.objectContaining({
            status: { from: '', to: 'GREEN' },
            commentary: { from: '', to: 'Test commentary' }
          })
        })
      ])
    )
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/professions/2/history'
    )
  })

  test('should normalize history entries', async () => {
    // Arrange
    const mockHistory = [
      {
        // Entry without proper changes object
        timestamp: '2024-02-15T12:00:00Z',
        status: 'GREEN',
        commentary: 'Test commentary'
      },
      {
        // Entry with existing changes object
        timestamp: '2024-02-16T12:00:00Z',
        changes: {
          status: { from: 'AMBER', to: 'GREEN' }
        }
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProfessionHistory('1', '2')

    // Assert
    expect(result).toHaveLength(2)
    // Check first entry was normalized
    expect(result[0]).toMatchObject({
      timestamp: '2024-02-15T12:00:00Z',
      type: 'profession',
      changes: {
        status: { from: '', to: 'GREEN' },
        commentary: { from: '', to: 'Test commentary' }
      }
    })
    // Check second entry kept original changes but got type added
    expect(result[1]).toMatchObject({
      timestamp: '2024-02-16T12:00:00Z',
      type: 'profession',
      changes: {
        status: { from: 'AMBER', to: 'GREEN' }
      }
    })
  })

  test('should handle null API response', async () => {
    // Arrange
    mockFetch.mockResolvedValue(null)

    // Act
    const result = await getProfessionHistory('1', '2')

    // Assert
    expect(result).toEqual([])
    expect(mockLogger.warn).toHaveBeenCalledWith('No history found', {
      projectId: '1',
      professionId: '2'
    })
  })

  test('should handle empty history array', async () => {
    // Arrange
    mockFetch.mockResolvedValue([])

    // Act
    const result = await getProfessionHistory('1', '2')

    // Assert
    expect(result).toEqual([])
  })

  test('should handle API errors', async () => {
    // Arrange
    const error = new Error('API error')
    mockFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(getProfessionHistory('1', '2')).rejects.toThrow('API error')
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'API error',
        projectId: '1',
        professionId: '2'
      }),
      'Failed to fetch profession history'
    )
  })

  test('should append cache parameter in non-test environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'development'
    const mockDate = new Date('2024-05-15T12:00:00Z')
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

    mockFetch.mockResolvedValue([])

    // Act
    await getProfessionHistory('1', '2')

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/professions/2/history?_cache=2024-05-15'
    )

    // Cleanup
    global.Date = Date
    process.env.NODE_ENV = 'test'
  })
})

describe('archiveProjectHistoryEntry', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should archive project history entry with authenticated request', async () => {
    // Arrange
    mockAuthedFetch.mockResolvedValue({ success: true })

    // Act
    const result = await archiveProjectHistoryEntry('1', 'hist-1', mockRequest)

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/history/hist-1/archive',
      {
        method: 'PUT'
      }
    )
    expect(result).toBe(true)
  })

  test('should archive project history entry without authenticated request', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ success: true })

    // Act
    const result = await archiveProjectHistoryEntry('1', 'hist-1')

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/history/hist-1/archive',
      {
        method: 'PUT'
      }
    )
    expect(result).toBe(true)
  })

  test('should handle API errors', async () => {
    // Arrange
    const error = new Error('Archive failed')
    mockAuthedFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(
      archiveProjectHistoryEntry('1', 'hist-1', mockRequest)
    ).rejects.toThrow('Archive failed')
  })
})

describe('archiveProfessionHistoryEntry', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should archive profession history entry with authenticated request', async () => {
    // Arrange
    mockAuthedFetch.mockResolvedValue({ success: true })

    // Act
    const result = await archiveProfessionHistoryEntry(
      '1',
      '2',
      'hist-1',
      mockRequest
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/professions/2/history/hist-1/archive',
      {
        method: 'PUT'
      }
    )
    expect(result).toBe(true)
  })

  test('should archive profession history entry without authenticated request', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ success: true })

    // Act
    const result = await archiveProfessionHistoryEntry('1', '2', 'hist-1')

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/professions/2/history/hist-1/archive',
      {
        method: 'PUT'
      }
    )
    expect(result).toBe(true)
  })

  test('should handle API errors', async () => {
    // Arrange
    const error = new Error('Archive failed')
    mockAuthedFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(
      archiveProfessionHistoryEntry('1', '2', 'hist-1', mockRequest)
    ).rejects.toThrow('Archive failed')
  })
})

describe('getAssessment', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should get assessment with authenticated request', async () => {
    // Arrange
    const mockAssessment = {
      projectId: '1',
      standardId: '2',
      professionId: '3',
      status: 'GREEN',
      commentary: 'Test assessment'
    }
    mockAuthedFetch.mockResolvedValue(mockAssessment)

    // Act
    const result = await getAssessment('1', '2', '3', mockRequest)

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/assessment'
    )
    expect(result).toEqual(mockAssessment)
  })

  test('should get assessment without authenticated request', async () => {
    // Arrange
    const mockAssessment = {
      projectId: '1',
      standardId: '2',
      professionId: '3',
      status: 'AMBER',
      commentary: 'Test assessment'
    }
    mockFetch.mockResolvedValue(mockAssessment)

    // Act
    const result = await getAssessment('1', '2', '3')

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/assessment'
    )
    expect(result).toEqual(mockAssessment)
  })

  test('should return null when assessment not found', async () => {
    // Arrange
    mockAuthedFetch.mockResolvedValue(null)

    // Act
    const result = await getAssessment('1', '2', '3', mockRequest)

    // Assert
    expect(result).toBeNull()
  })

  test('should handle API errors', async () => {
    // Arrange
    const error = new Error('API error')
    mockAuthedFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(getAssessment('1', '2', '3', mockRequest)).rejects.toThrow(
      'API error'
    )
  })
})

describe('updateAssessment', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should update assessment with authenticated request', async () => {
    // Arrange
    const assessmentData = {
      status: 'GREEN',
      commentary: 'Updated assessment'
    }
    const mockResponse = { success: true }
    mockAuthedFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await updateAssessment(
      '1',
      '2',
      '3',
      assessmentData,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/assessment',
      {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: { 'Content-Type': 'application/json' }
      }
    )
    expect(result).toEqual(mockResponse)
  })

  test('should update assessment without authenticated request', async () => {
    // Arrange
    const assessmentData = {
      status: 'AMBER',
      commentary: 'Updated assessment'
    }
    const mockResponse = { success: true }
    mockFetch.mockResolvedValue(mockResponse)

    // Act
    const result = await updateAssessment('1', '2', '3', assessmentData)

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/assessment',
      {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: { 'Content-Type': 'application/json' }
      }
    )
    expect(result).toEqual(mockResponse)
  })

  test('should handle API errors', async () => {
    // Arrange
    const assessmentData = { status: 'RED', commentary: 'Error test' }
    const error = new Error('Update failed')
    mockAuthedFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(
      updateAssessment('1', '2', '3', assessmentData, mockRequest)
    ).rejects.toThrow('Update failed')
  })
})

describe('getAssessmentHistory', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
    process.env.NODE_ENV = 'test'
  })

  test('should get assessment history with authenticated request', async () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2024-02-15T12:00:00Z',
        changes: {
          status: { from: 'AMBER', to: 'GREEN' },
          commentary: { from: '', to: 'Updated assessment' }
        }
      }
    ]
    mockAuthedFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getAssessmentHistory('1', '2', '3', mockRequest)

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/history'
    )
    expect(result).toEqual(mockHistory)
  })

  test('should get assessment history without authenticated request', async () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2024-02-15T12:00:00Z',
        status: 'GREEN',
        commentary: 'Test assessment'
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getAssessmentHistory('1', '2', '3')

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/history'
    )
    expect(result).toEqual(mockHistory)
  })

  test('should handle null API response', async () => {
    // Arrange
    mockAuthedFetch.mockResolvedValue(null)

    // Act
    const result = await getAssessmentHistory('1', '2', '3', mockRequest)

    // Assert
    expect(result).toEqual([])
  })

  test('should handle API errors', async () => {
    // Arrange
    const error = new Error('API error')
    mockAuthedFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(
      getAssessmentHistory('1', '2', '3', mockRequest)
    ).rejects.toThrow('API error')
  })

  test('should not append cache parameter in test environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'test'
    mockFetch.mockResolvedValue([])

    // Act
    await getAssessmentHistory('1', '2', '3')

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/history'
    )
  })
})

describe('archiveAssessmentHistoryEntry', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should archive assessment history entry with authenticated request', async () => {
    // Arrange
    mockAuthedFetch.mockResolvedValue({ success: true })

    // Act
    const result = await archiveAssessmentHistoryEntry(
      '1',
      '2',
      '3',
      'hist-1',
      mockRequest
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/history/hist-1/archive',
      {
        method: 'POST'
      }
    )
    expect(result).toEqual({ success: true })
  })

  test('should archive assessment history entry without authenticated request', async () => {
    // Arrange
    mockFetch.mockResolvedValue({ success: true })

    // Act
    const result = await archiveAssessmentHistoryEntry('1', '2', '3', 'hist-1')

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1/standards/2/professions/3/history/hist-1/archive',
      {
        method: 'POST'
      }
    )
    expect(result).toEqual({ success: true })
  })

  test('should handle API errors', async () => {
    // Arrange
    const error = new Error('Archive failed')
    mockAuthedFetch.mockRejectedValue(error)

    // Act & Assert
    await expect(
      archiveAssessmentHistoryEntry('1', '2', '3', 'hist-1', mockRequest)
    ).rejects.toThrow('Archive failed')
  })
})

describe('normalizeHistoryEntry edge cases', () => {
  test('should handle entry with string status in changes via getProjectHistory', async () => {
    // Arrange
    const mockHistory = [
      {
        id: '1',
        changes: {
          status: 'GREEN'
        }
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProjectHistory('project-1')

    // Assert
    expect(result[0].changes.status).toEqual({
      from: '',
      to: 'GREEN'
    })
  })

  test('should handle entry with commentary but no changes.commentary via getProjectHistory', async () => {
    // Arrange
    const mockHistory = [
      {
        id: '1',
        commentary: 'Test commentary'
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProjectHistory('project-1')

    // Assert
    expect(result[0].changes.commentary).toEqual({
      from: '',
      to: 'Test commentary'
    })
  })

  test('should handle entry with changeDate instead of timestamp via getProjectHistory', async () => {
    // Arrange
    const changeDate = '2023-01-01T12:00:00Z'
    const mockHistory = [
      {
        id: '1',
        changeDate
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProjectHistory('project-1')

    // Assert
    expect(result[0].timestamp).toBe(changeDate)
  })

  test('should handle entry with status but no changes.status via getProjectHistory', async () => {
    // Arrange
    const mockHistory = [
      {
        id: '1',
        status: 'AMBER'
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProjectHistory('project-1')

    // Assert
    expect(result[0].changes.status).toEqual({
      from: '',
      to: 'AMBER'
    })
  })

  test('should preserve existing proper status changes object via getProjectHistory', async () => {
    // Arrange
    const mockHistory = [
      {
        id: '1',
        changes: {
          status: {
            from: 'GREEN',
            to: 'RED'
          }
        }
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProjectHistory('project-1')

    // Assert
    expect(result[0].changes.status).toEqual({
      from: 'GREEN',
      to: 'RED'
    })
  })

  test('should test normalizeHistoryEntry via getProfessionHistory', async () => {
    // Arrange
    const mockHistory = [
      {
        id: '1',
        commentary: 'Test comment',
        status: 'RED'
      }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProfessionHistory('project-1', 'prof-1')

    // Assert
    expect(result[0].type).toBe('profession')
    expect(result[0].changes.commentary).toEqual({
      from: '',
      to: 'Test comment'
    })
    expect(result[0].changes.status).toEqual({
      from: '',
      to: 'RED'
    })
  })
})

describe('getProjectHistory advanced scenarios', () => {
  test('should handle archived entries filtering', async () => {
    // Arrange
    const mockHistory = [
      { id: '1', archived: false, status: 'GREEN' },
      { id: '2', archived: true, status: 'RED' },
      { id: '3', archived: false, status: 'AMBER' }
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProjectHistory('project-1')

    // Assert
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['1', '3'])
    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        totalEntries: 3,
        activeEntries: 2,
        archivedEntries: 1
      },
      'Filtered project history entries'
    )
  })

  test('should handle token access error', async () => {
    // Arrange
    const mockRequest = {
      auth: {
        get credentials() {
          throw new Error('Token access error')
        }
      }
    }
    const mockAuthedFetch = jest.fn().mockResolvedValue([])
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Act
    await getProjectHistory('project-1', mockRequest)

    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith(
      { error: 'Token access error' },
      '[AUTH_CHECK] Error accessing token'
    )
  })

  test('should handle valid token access', async () => {
    // Arrange
    const mockRequest = {
      auth: {
        credentials: {
          token: 'valid-token-123'
        }
      }
    }
    const mockAuthedFetch = jest.fn().mockResolvedValue([])
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Act
    await getProjectHistory('project-1', mockRequest)

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[AUTH_CHECK] Token found directly in credentials, length: 15'
    )
  })

  test('should filter out null entries', async () => {
    // Arrange
    const mockHistory = [
      { id: '1', archived: false },
      null,
      { id: '2', archived: false },
      undefined
    ]
    mockFetch.mockResolvedValue(mockHistory)

    // Act
    const result = await getProjectHistory('project-1')

    // Assert
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['1', '2'])
  })
})

describe('getAssessment 404 handling', () => {
  test('should handle 404 Not Found error gracefully', async () => {
    // Arrange
    const notFoundError = new Error('Not Found')
    notFoundError.status = 404
    mockFetch.mockRejectedValue(notFoundError)

    // Act
    const result = await getAssessment('project-1', 'std-1', 'prof-1')

    // Assert
    expect(result).toBeNull()
    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        endpoint:
          '/api/v1.0/projects/project-1/standards/std-1/professions/prof-1/assessment'
      },
      'Assessment not found - will create new one'
    )
  })

  test('should handle error message containing "Not Found"', async () => {
    // Arrange
    const notFoundError = new Error('Resource Not Found on server')
    mockFetch.mockRejectedValue(notFoundError)

    // Act
    const result = await getAssessment('project-1', 'std-1', 'prof-1')

    // Assert
    expect(result).toBeNull()
  })

  test('should re-throw non-404 errors', async () => {
    // Arrange
    const serverError = new Error('Internal Server Error')
    serverError.status = 500
    mockFetch.mockRejectedValue(serverError)

    // Act & Assert
    await expect(getAssessment('project-1', 'std-1', 'prof-1')).rejects.toThrow(
      'Internal Server Error'
    )
  })
})

describe('getAssessmentHistory 404 handling', () => {
  test('should handle 404 error and return empty array', async () => {
    // Arrange
    const notFoundError = new Error('Not Found')
    notFoundError.status = 404
    mockFetch.mockRejectedValue(notFoundError)

    // Act
    const result = await getAssessmentHistory('project-1', 'std-1', 'prof-1')

    // Assert
    expect(result).toEqual([])
    expect(mockLogger.info).toHaveBeenCalledWith(
      { projectId: 'project-1', standardId: 'std-1', professionId: 'prof-1' },
      'Assessment history endpoint not available yet - returning empty array'
    )
  })

  test('should handle error message containing "Not Found"', async () => {
    // Arrange
    const notFoundError = new Error('Endpoint Not Found')
    mockFetch.mockRejectedValue(notFoundError)

    // Act
    const result = await getAssessmentHistory('project-1', 'std-1', 'prof-1')

    // Assert
    expect(result).toEqual([])
  })

  test('should re-throw non-404 errors', async () => {
    // Arrange
    const serverError = new Error('Database connection failed')
    mockFetch.mockRejectedValue(serverError)

    // Act & Assert
    await expect(
      getAssessmentHistory('project-1', 'std-1', 'prof-1')
    ).rejects.toThrow('Database connection failed')
  })
})

describe('archiveAssessmentHistoryEntry 404 handling', () => {
  test('should handle 404 error and throw specific message', async () => {
    // Arrange
    const notFoundError = new Error('Not Found')
    notFoundError.status = 404
    mockFetch.mockRejectedValue(notFoundError)

    // Act & Assert
    await expect(
      archiveAssessmentHistoryEntry('project-1', 'std-1', 'prof-1', 'hist-1')
    ).rejects.toThrow(
      'Archive functionality is not yet available on the backend'
    )

    expect(mockLogger.warn).toHaveBeenCalledWith(
      {
        projectId: 'project-1',
        standardId: 'std-1',
        professionId: 'prof-1',
        historyId: 'hist-1'
      },
      'Archive assessment endpoint not available yet'
    )
  })

  test('should handle error message containing "Not Found"', async () => {
    // Arrange
    const notFoundError = new Error('Archive endpoint Not Found')
    mockFetch.mockRejectedValue(notFoundError)

    // Act & Assert
    await expect(
      archiveAssessmentHistoryEntry('project-1', 'std-1', 'prof-1', 'hist-1')
    ).rejects.toThrow(
      'Archive functionality is not yet available on the backend'
    )
  })

  test('should re-throw non-404 errors', async () => {
    // Arrange
    const serverError = new Error('Server Error')
    serverError.status = 500
    mockFetch.mockRejectedValue(serverError)

    // Act & Assert
    await expect(
      archiveAssessmentHistoryEntry('project-1', 'std-1', 'prof-1', 'hist-1')
    ).rejects.toThrow('Server Error')
  })
})

describe('updateProject with suppressHistory parameter', () => {
  test('should handle suppressHistory=true', async () => {
    // Arrange
    const currentProject = { id: '1', name: 'Current Project' }
    const updateData = { name: 'Updated Project' }
    const mockAuthedFetch = jest
      .fn()
      .mockResolvedValue({ id: '1', name: 'Updated Project' })
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Mock getProjectById to return current project
    jest.doMock('./projects.js', () => ({
      ...jest.requireActual('./projects.js'),
      getProjectById: jest.fn().mockResolvedValue(currentProject)
    }))

    // Act
    await updateProject(
      '1',
      updateData,
      { auth: { credentials: { token: 'test' } } },
      true
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/1?suppressHistory=true',
      expect.any(Object)
    )
  })
})

describe('edge case scenarios', () => {
  test('should handle getProjects with projects containing non-array standards', async () => {
    // Arrange
    const mockProjects = [
      {
        id: '1',
        standards: null
      }
    ]
    mockFetch.mockResolvedValue(mockProjects)

    // Act
    const result = await getProjects()

    // Assert
    expect(result).toEqual(mockProjects)
    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        sampleProject: {
          id: '1',
          standards: []
        }
      },
      'Sample project structure'
    )
  })

  test('should handle createProject with empty projectData fields', async () => {
    // Arrange
    const projectData = {
      name: '',
      phase: '',
      defCode: '',
      status: '',
      commentary: ''
    }
    mockGetServiceStandards.mockResolvedValue([])
    mockFetch.mockResolvedValue({ id: 'created-project-id' })

    // Act
    const result = await createProject(projectData)

    // Assert
    expect(result.id).toBe('created-project-id')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":""')
      })
    )
  })

  test('should handle getProfessionHistory with empty data array', async () => {
    // Arrange
    mockFetch.mockResolvedValue([])

    // Act
    const result = await getProfessionHistory('project-1', 'prof-1')

    // Assert
    expect(result).toEqual([])
    expect(mockLogger.info).toHaveBeenCalledWith(
      { historyCount: 0 },
      'Profession history retrieved successfully'
    )
  })

  test('should handle getStandardHistory with authenticated request', async () => {
    // Arrange
    const mockHistory = [{ id: '1', status: 'GREEN' }]
    const mockRequest = { auth: { credentials: { token: 'test' } } }
    const mockAuthedFetch = jest.fn().mockResolvedValue(mockHistory)
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Act
    const result = await getStandardHistory('project-1', 'std-1', mockRequest)

    // Assert
    expect(result).toEqual(mockHistory)
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/project-1/standards/std-1/history'
    )
  })
})

describe('replaceAssessment', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should successfully replace an assessment', async () => {
    // Arrange
    const projectId = 'project-1'
    const standardId = 'std-1'
    const professionId = 'prof-1'
    const newAssessmentData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentAssessment = {
      id: 'assessment-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }
    const mockNewAssessment = {
      id: 'assessment-2',
      status: 'GREEN',
      commentary: 'Updated'
    }
    const mockHistory = [
      { id: 'hist-2', archived: false }, // New assessment (most recent)
      { id: 'hist-1', archived: false } // Old assessment to archive
    ]

    // Mock API calls in sequence
    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentAssessment) // getAssessment call
      .mockResolvedValueOnce(mockNewAssessment) // updateAssessment call
      .mockResolvedValueOnce(mockHistory) // getAssessmentHistory call
      .mockResolvedValueOnce({}) // archiveAssessmentHistoryEntry call

    // Act
    const result = await replaceAssessment(
      projectId,
      standardId,
      professionId,
      newAssessmentData,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
    expect(mockAuthedFetch).toHaveBeenCalledTimes(4)

    // Verify getAssessment call
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      1,
      '/api/v1.0/projects/project-1/standards/std-1/professions/prof-1/assessment'
    )

    // Verify updateAssessment call
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      2,
      '/api/v1.0/projects/project-1/standards/std-1/professions/prof-1/assessment',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssessmentData)
      }
    )

    // Verify getAssessmentHistory call
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      3,
      '/api/v1.0/projects/project-1/standards/std-1/professions/prof-1/history'
    )

    // Verify archiveAssessmentHistoryEntry call
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      4,
      '/api/v1.0/projects/project-1/standards/std-1/professions/prof-1/history/hist-1/archive',
      { method: 'POST' }
    )

    expect(result).toEqual(mockNewAssessment)
  })

  test('should throw error when no existing assessment found', async () => {
    // Arrange
    const projectId = 'project-1'
    const standardId = 'std-1'
    const professionId = 'prof-1'
    const newAssessmentData = { status: 'GREEN', commentary: 'Updated' }

    mockAuthedFetch.mockResolvedValueOnce(null) // getAssessment returns null

    // Act & Assert
    await expect(
      replaceAssessment(
        projectId,
        standardId,
        professionId,
        newAssessmentData,
        mockRequest
      )
    ).rejects.toThrow('No existing assessment found to replace')
  })

  test('should handle empty assessment history', async () => {
    // Arrange
    const projectId = 'project-1'
    const standardId = 'std-1'
    const professionId = 'prof-1'
    const newAssessmentData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentAssessment = {
      id: 'assessment-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }
    const mockNewAssessment = {
      id: 'assessment-2',
      status: 'GREEN',
      commentary: 'Updated'
    }

    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentAssessment) // getAssessment call
      .mockResolvedValueOnce(mockNewAssessment) // updateAssessment call
      .mockResolvedValueOnce([]) // getAssessmentHistory call (empty)

    // Act
    const result = await replaceAssessment(
      projectId,
      standardId,
      professionId,
      newAssessmentData,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledTimes(3) // No archive call when history is empty
    expect(result).toEqual(mockNewAssessment)
  })

  test('should handle history with only one non-archived entry', async () => {
    // Arrange
    const projectId = 'project-1'
    const standardId = 'std-1'
    const professionId = 'prof-1'
    const newAssessmentData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentAssessment = {
      id: 'assessment-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }
    const mockNewAssessment = {
      id: 'assessment-2',
      status: 'GREEN',
      commentary: 'Updated'
    }
    const mockHistory = [
      { id: 'hist-1', archived: false } // Only one entry
    ]

    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentAssessment) // getAssessment call
      .mockResolvedValueOnce(mockNewAssessment) // updateAssessment call
      .mockResolvedValueOnce(mockHistory) // getAssessmentHistory call

    // Act
    const result = await replaceAssessment(
      projectId,
      standardId,
      professionId,
      newAssessmentData,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledTimes(3) // No archive call when only one entry
    expect(result).toEqual(mockNewAssessment)
  })

  test('should handle error during assessment replacement', async () => {
    // Arrange
    const projectId = 'project-1'
    const standardId = 'std-1'
    const professionId = 'prof-1'
    const newAssessmentData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentAssessment = {
      id: 'assessment-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }

    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentAssessment) // getAssessment call
      .mockRejectedValueOnce(new Error('Update failed')) // updateAssessment fails

    // Act & Assert
    await expect(
      replaceAssessment(
        projectId,
        standardId,
        professionId,
        newAssessmentData,
        mockRequest
      )
    ).rejects.toThrow('Update failed')
  })

  test('should handle error during history archiving', async () => {
    // Arrange
    const projectId = 'project-1'
    const standardId = 'std-1'
    const professionId = 'prof-1'
    const newAssessmentData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentAssessment = {
      id: 'assessment-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }
    const mockNewAssessment = {
      id: 'assessment-2',
      status: 'GREEN',
      commentary: 'Updated'
    }
    const mockHistory = [
      { id: 'hist-2', archived: false }, // New assessment
      { id: 'hist-1', archived: false } // Old assessment to archive
    ]

    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentAssessment) // getAssessment call
      .mockResolvedValueOnce(mockNewAssessment) // updateAssessment call
      .mockResolvedValueOnce(mockHistory) // getAssessmentHistory call
      .mockRejectedValueOnce(new Error('Archive failed')) // archiveAssessmentHistoryEntry fails

    // Act & Assert
    await expect(
      replaceAssessment(
        projectId,
        standardId,
        professionId,
        newAssessmentData,
        mockRequest
      )
    ).rejects.toThrow('Archive failed')
  })

  test('should handle history with archived entries', async () => {
    // Arrange
    const projectId = 'project-1'
    const standardId = 'std-1'
    const professionId = 'prof-1'
    const newAssessmentData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentAssessment = {
      id: 'assessment-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }
    const mockNewAssessment = {
      id: 'assessment-2',
      status: 'GREEN',
      commentary: 'Updated'
    }
    const mockHistory = [
      { id: 'hist-3', archived: false }, // New assessment (most recent)
      { id: 'hist-2', archived: false }, // Old assessment to archive
      { id: 'hist-1', archived: true } // Already archived
    ]

    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentAssessment) // getAssessment call
      .mockResolvedValueOnce(mockNewAssessment) // updateAssessment call
      .mockResolvedValueOnce(mockHistory) // getAssessmentHistory call
      .mockResolvedValueOnce({}) // archiveAssessmentHistoryEntry call

    // Act
    const result = await replaceAssessment(
      projectId,
      standardId,
      professionId,
      newAssessmentData,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      4,
      '/api/v1.0/projects/project-1/standards/std-1/professions/prof-1/history/hist-2/archive',
      { method: 'POST' }
    )
    expect(result).toEqual(mockNewAssessment)
  })
})

describe('replaceProjectStatus', () => {
  const mockRequest = {
    auth: { credentials: { token: 'test-token' } },
    logger: { info: jest.fn(), error: jest.fn() }
  }
  const mockAuthedFetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
  })

  test('should successfully replace a project status', async () => {
    // Arrange
    const projectId = 'project-1'
    const newProjectData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentProject = {
      id: 'project-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }
    const mockUpdatedProject = {
      id: 'project-1',
      status: 'GREEN',
      commentary: 'Updated'
    }
    const mockHistory = [
      { id: 'hist-2', archived: false }, // New status (most recent)
      { id: 'hist-1', archived: false } // Old status to archive
    ]

    // Mock API calls in sequence
    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentProject) // getProjectById call
      .mockResolvedValueOnce(mockCurrentProject) // getProjectById call in updateProject
      .mockResolvedValueOnce(mockUpdatedProject) // updateProject call
      .mockResolvedValueOnce(mockHistory) // getProjectHistory call
      .mockResolvedValueOnce({}) // archiveProjectHistoryEntry call

    // Act
    const result = await replaceProjectStatus(
      projectId,
      newProjectData,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
    expect(mockAuthedFetch).toHaveBeenCalledTimes(5)

    // Verify getProjectById call
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      1,
      '/api/v1.0/projects/project-1'
    )

    // Verify updateProject call (which includes its own getProjectById)
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      3,
      '/api/v1.0/projects/project-1',
      {
        method: 'PUT',
        body: expect.stringContaining('"status":"GREEN"')
      }
    )

    // Verify getProjectHistory call
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      4,
      '/api/v1.0/projects/project-1/history'
    )

    // Verify archiveProjectHistoryEntry call
    expect(mockAuthedFetch).toHaveBeenNthCalledWith(
      5,
      '/api/v1.0/projects/project-1/history/hist-1/archive',
      { method: 'PUT' }
    )

    expect(result).toEqual(mockUpdatedProject)
  })

  test('should throw error when no existing project found', async () => {
    // Arrange
    const projectId = 'project-1'
    const newProjectData = { status: 'GREEN', commentary: 'Updated' }

    mockAuthedFetch.mockResolvedValueOnce(null) // getProjectById returns null

    // Act & Assert
    await expect(
      replaceProjectStatus(projectId, newProjectData, mockRequest)
    ).rejects.toThrow('No existing project found to replace')
  })

  test('should handle empty project history', async () => {
    // Arrange
    const projectId = 'project-1'
    const newProjectData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentProject = {
      id: 'project-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }
    const mockUpdatedProject = {
      id: 'project-1',
      status: 'GREEN',
      commentary: 'Updated'
    }

    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentProject) // getProjectById call
      .mockResolvedValueOnce(mockCurrentProject) // getProjectById call in updateProject
      .mockResolvedValueOnce(mockUpdatedProject) // updateProject call
      .mockResolvedValueOnce([]) // getProjectHistory call (empty)

    // Act
    const result = await replaceProjectStatus(
      projectId,
      newProjectData,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledTimes(4) // No archive call when history is empty
    expect(result).toEqual(mockUpdatedProject)
  })

  test('should handle error during project status replacement', async () => {
    // Arrange
    const projectId = 'project-1'
    const newProjectData = { status: 'GREEN', commentary: 'Updated' }

    const mockCurrentProject = {
      id: 'project-1',
      status: 'AMBER',
      commentary: 'Old comment'
    }

    mockAuthedFetch
      .mockResolvedValueOnce(mockCurrentProject) // getProjectById call
      .mockResolvedValueOnce(mockCurrentProject) // getProjectById call in updateProject
      .mockRejectedValueOnce(new Error('Update failed')) // updateProject fails

    // Act & Assert
    await expect(
      replaceProjectStatus(projectId, newProjectData, mockRequest)
    ).rejects.toThrow('Update failed')
  })
})

// Additional tests for improved coverage
describe('getProjects edge cases and options', () => {
  let mockAuthedFetch
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock authed fetch
    mockAuthedFetch = jest.fn()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Create mock request
    mockRequest = {
      logger: mockLogger
    }
  })

  test('should handle all query parameter options', async () => {
    // Arrange
    const options = {
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      tag: 'important'
    }
    const mockProjects = [{ id: 'test-project', name: 'Test Project' }]
    mockAuthedFetch.mockResolvedValue(mockProjects)

    // Act
    const result = await getProjects(mockRequest, options)

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects?start_date=2023-01-01&end_date=2023-12-31&tag=important'
    )
    expect(result).toEqual(mockProjects)
  })

  test('should handle delivery partner filtering warning', async () => {
    // Arrange
    const options = {
      deliveryPartnerIds: ['partner-1', 'partner-2']
    }
    const mockProjects = [{ id: 'test-project', name: 'Test Project' }]
    mockAuthedFetch.mockResolvedValue(mockProjects)

    // Act
    const result = await getProjects(mockRequest, options)

    // Assert
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { deliveryPartnerIds: options.deliveryPartnerIds },
      'Delivery partner filtering requested but not yet supported by backend - ignoring filter'
    )
    expect(result).toEqual(mockProjects)
  })

  test('should handle null data response', async () => {
    // Arrange
    mockAuthedFetch.mockResolvedValue(null)

    // Act
    const result = await getProjects(mockRequest)

    // Assert
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Invalid data returned from API',
      { data: null }
    )
    expect(result).toEqual([])
  })

  test('should handle non-array data response', async () => {
    // Arrange
    const invalidData = { error: 'Something went wrong' }
    mockAuthedFetch.mockResolvedValue(invalidData)

    // Act
    const result = await getProjects(mockRequest)

    // Assert
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Invalid data returned from API',
      { data: invalidData }
    )
    expect(result).toEqual([])
  })

  test('should use unauthenticated fetcher when no request provided', async () => {
    // Arrange
    const mockProjects = [{ id: 'test-project', name: 'Test Project' }]
    mockFetch.mockResolvedValue(mockProjects)

    // Act
    const result = await getProjects(null)

    // Assert
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[API_AUTH] No request context provided, using unauthenticated fetcher'
    )
    expect(mockFetch).toHaveBeenCalledWith('/api/v1.0/projects')
    expect(result).toEqual(mockProjects)
  })

  test('should handle empty options object', async () => {
    // Arrange
    const mockProjects = [{ id: 'test-project', name: 'Test Project' }]
    mockAuthedFetch.mockResolvedValue(mockProjects)

    // Act
    const result = await getProjects(mockRequest, {})

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith('/api/v1.0/projects')
    expect(result).toEqual(mockProjects)
  })

  test('should log project count when data returned', async () => {
    // Arrange
    const mockProjects = [
      { id: 'project-1', name: 'Project 1' },
      { id: 'project-2', name: 'Project 2' }
    ]
    mockAuthedFetch.mockResolvedValue(mockProjects)

    // Act
    const result = await getProjects(mockRequest)

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      { count: 2 },
      'Projects retrieved successfully'
    )
    expect(result).toEqual(mockProjects)
  })
})

describe('getProjectsByDeliveryGroup', () => {
  const mockAuthedFetch = jest.fn()
  const mockFetcher = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthedFetch.mockReset()
    mockFetcher.mockReset()
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)
    mockFetch.mockImplementation(mockFetcher)

    // Reset config mock for this describe block
    mockConfig.get.mockImplementation((key) => {
      if (key === 'api.version') {
        return 'v1.0'
      }
      return undefined
    })
  })

  it('should fetch projects for a delivery group with authenticated request', async () => {
    // Arrange
    const deliveryGroupId = 'test-delivery-group'
    const mockProjects = [
      { id: 'project1', name: 'Project 1', status: 'GREEN' },
      { id: 'project2', name: 'Project 2', status: 'AMBER' }
    ]
    const mockRequest = {
      logger: {
        info: jest.fn(),
        error: jest.fn()
      }
    }

    mockAuthedFetch.mockResolvedValue(mockProjects)

    // Act
    const result = await getProjectsByDeliveryGroup(
      deliveryGroupId,
      mockRequest
    )

    // Assert
    expect(mockAuthedFetchJsonDecorator).toHaveBeenCalledWith(mockRequest)
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/bydeliverygroup/test-delivery-group'
    )
    expect(mockRequest.logger.info).toHaveBeenCalledWith(
      {
        deliveryGroupId: 'test-delivery-group',
        endpoint: '/api/v1.0/projects/bydeliverygroup/test-delivery-group'
      },
      'Fetching projects by delivery group'
    )
    expect(mockRequest.logger.info).toHaveBeenCalledWith(
      { deliveryGroupId: 'test-delivery-group', projectCount: 2 },
      'Successfully fetched projects by delivery group'
    )
    expect(result).toEqual(mockProjects)
  })

  it('should use unauthenticated fetcher when no request provided', async () => {
    // Arrange
    const deliveryGroupId = 'test-delivery-group'
    const mockProjects = [
      { id: 'project-1', name: 'Project 1' },
      { id: 'project-2', name: 'Project 2' }
    ]

    mockFetcher.mockResolvedValue(mockProjects)

    // Act - pass undefined instead of null to match the function's logic
    const result = await getProjectsByDeliveryGroup(deliveryGroupId, undefined)

    // Assert
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[API_AUTH] No request context provided, using unauthenticated fetcher'
    )
    expect(mockFetcher).toHaveBeenCalledWith(
      '/api/v1.0/projects/bydeliverygroup/test-delivery-group'
    )
    expect(result).toEqual(mockProjects)
  })

  it('should return empty array when response is null', async () => {
    // Arrange
    const deliveryGroupId = 'test-delivery-group'
    const mockRequest = {
      logger: {
        info: jest.fn(),
        error: jest.fn()
      }
    }

    mockAuthedFetch.mockResolvedValue(null)

    // Act
    const result = await getProjectsByDeliveryGroup(
      deliveryGroupId,
      mockRequest
    )

    // Assert
    expect(result).toEqual([])
  })

  it('should handle errors and log them', async () => {
    // Arrange
    const deliveryGroupId = 'test-delivery-group'
    const mockError = new Error('API Error')
    const mockRequest = {
      logger: {
        info: jest.fn(),
        error: jest.fn()
      }
    }

    mockAuthedFetch.mockRejectedValue(mockError)

    // Act & Assert
    await expect(
      getProjectsByDeliveryGroup(deliveryGroupId, mockRequest)
    ).rejects.toThrow('API Error')
    expect(mockRequest.logger.error).toHaveBeenCalledWith(
      { error: mockError, deliveryGroupId: 'test-delivery-group' },
      'Failed to fetch projects by delivery group'
    )
  })
})

describe('getProjectDeliveryPartners', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock the dynamic import of delivery-partners.js
    jest.doMock('./delivery-partners.js', () => ({
      getAllDeliveryPartners: jest.fn()
    }))
  })

  afterEach(() => {
    jest.dontMock('./delivery-partners.js')
  })

  it('should successfully fetch and enrich project delivery partners', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockRequest = {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    }

    const mockProjectPartnerData = [
      {
        Id: 'rel-1',
        DeliveryPartnerId: 'partner-1',
        EngagementManager: 'John Doe',
        EngagementStarted: '2023-01-01',
        EngagementEnded: null
      },
      {
        Id: 'rel-2',
        deliveryPartnerId: 'partner-2', // Test camelCase
        engagementManager: 'Jane Smith',
        engagementStarted: '2023-02-01',
        engagementEnded: '2023-12-01' // This should be filtered out
      }
    ]

    const mockAllDeliveryPartners = [
      { id: 'partner-1', name: 'Partner One' },
      { id: 'partner-2', name: 'Partner Two' }
    ]

    const mockAuthedFetch = jest.fn().mockResolvedValue(mockProjectPartnerData)
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Mock the dynamic import
    const { getAllDeliveryPartners } = await import('./delivery-partners.js')
    getAllDeliveryPartners.mockResolvedValue(mockAllDeliveryPartners)

    // Act
    const result = await getProjectDeliveryPartners(projectId, mockRequest)

    // Assert
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/test-project-123/deliverypartners'
    )
    expect(getAllDeliveryPartners).toHaveBeenCalledWith(mockRequest)

    // Should only return active partnerships (engagementEnded is null)
    expect(result).toEqual([
      {
        id: 'partner-1',
        name: 'Partner One',
        engagementManager: 'John Doe',
        engagementStarted: '2023-01-01',
        engagementEnded: null,
        relationshipId: 'rel-1'
      }
    ])

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'test-project-123',
        count: 1,
        partnerNames: ['Partner One']
      }),
      'Project delivery partners retrieved and enriched successfully - FINAL RESULT'
    )
  })

  it('should return empty array when no project partner data', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockRequest = {
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    }

    const mockAuthedFetch = jest.fn().mockResolvedValue([])
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Act
    const result = await getProjectDeliveryPartners(projectId, mockRequest)

    // Assert
    expect(result).toEqual([])
    expect(mockLogger.info).toHaveBeenCalledWith(
      { projectId: 'test-project-123' },
      'No delivery partners assigned to project'
    )
  })

  it('should return empty array when invalid data returned from API', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockRequest = {
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    }

    const mockAuthedFetch = jest.fn().mockResolvedValue(null)
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Act
    const result = await getProjectDeliveryPartners(projectId, mockRequest)

    // Assert
    expect(result).toEqual([])
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Invalid data returned from API',
      { data: null }
    )
  })

  it('should handle missing partner details gracefully', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockRequest = {
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    }

    const mockProjectPartnerData = [
      {
        Id: 'rel-1',
        DeliveryPartnerId: 'unknown-partner',
        EngagementManager: 'John Doe',
        EngagementStarted: '2023-01-01'
      }
    ]

    const mockAllDeliveryPartners = [] // Empty partners list

    const mockAuthedFetch = jest.fn().mockResolvedValue(mockProjectPartnerData)
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    const { getAllDeliveryPartners } = await import('./delivery-partners.js')
    getAllDeliveryPartners.mockResolvedValue(mockAllDeliveryPartners)

    // Act
    const result = await getProjectDeliveryPartners(projectId, mockRequest)

    // Assert
    expect(result).toEqual([
      {
        id: 'unknown-partner',
        name: 'Unknown Partner', // Fallback name
        engagementManager: 'John Doe',
        engagementStarted: '2023-01-01',
        engagementEnded: null,
        relationshipId: 'rel-1'
      }
    ])
  })

  it('should use unauthenticated fetcher when no request provided', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockProjectPartnerData = []

    mockFetch.mockResolvedValue(mockProjectPartnerData)

    // Act
    const result = await getProjectDeliveryPartners(projectId, null)

    // Assert
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '[API_AUTH] No request context provided, using unauthenticated fetcher'
    )
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1.0/projects/test-project-123/deliverypartners'
    )
    expect(result).toEqual([])
  })

  it('should handle different field name formats (snake_case)', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockRequest = {
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    }

    const mockProjectPartnerData = [
      {
        id: 'rel-1',
        delivery_partner_id: 'partner-1', // snake_case
        engagement_manager: 'John Doe',
        engagementStarted: '2023-01-01'
      }
    ]

    const mockAllDeliveryPartners = [{ id: 'partner-1', name: 'Partner One' }]

    const mockAuthedFetch = jest.fn().mockResolvedValue(mockProjectPartnerData)
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    const { getAllDeliveryPartners } = await import('./delivery-partners.js')
    getAllDeliveryPartners.mockResolvedValue(mockAllDeliveryPartners)

    // Act
    const result = await getProjectDeliveryPartners(projectId, mockRequest)

    // Assert
    expect(result).toEqual([
      {
        id: 'partner-1',
        name: 'Partner One',
        engagementManager: 'John Doe',
        engagementStarted: '2023-01-01',
        engagementEnded: null,
        relationshipId: 'rel-1'
      }
    ])
  })

  it('should return empty array on API error to prevent blocking other data', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockRequest = {
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    }
    const mockError = new Error('API Error')

    const mockAuthedFetch = jest.fn().mockRejectedValue(mockError)
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Act
    const result = await getProjectDeliveryPartners(projectId, mockRequest)

    // Assert
    expect(result).toEqual([])
    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        error: 'API Error',
        stack: mockError.stack,
        code: mockError.code,
        projectId: 'test-project-123'
      },
      'Failed to fetch project delivery partners - returning empty array to prevent blocking other data'
    )
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { projectId: 'test-project-123' },
      'Returning empty delivery partners array due to API error'
    )
  })

  it('should filter out terminated partnerships', async () => {
    // Arrange
    const projectId = 'test-project-123'
    const mockRequest = {
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    }

    const mockProjectPartnerData = [
      {
        Id: 'rel-1',
        DeliveryPartnerId: 'partner-1',
        EngagementManager: 'John Doe',
        EngagementStarted: '2023-01-01',
        EngagementEnded: null // Active
      },
      {
        Id: 'rel-2',
        DeliveryPartnerId: 'partner-2',
        EngagementManager: 'Jane Smith',
        EngagementStarted: '2023-02-01',
        EngagementEnded: '2023-12-01' // Terminated
      }
    ]

    const mockAllDeliveryPartners = [
      { id: 'partner-1', name: 'Partner One' },
      { id: 'partner-2', name: 'Partner Two' }
    ]

    const mockAuthedFetch = jest.fn().mockResolvedValue(mockProjectPartnerData)
    mockAuthedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    const { getAllDeliveryPartners } = await import('./delivery-partners.js')
    getAllDeliveryPartners.mockResolvedValue(mockAllDeliveryPartners)

    // Act
    const result = await getProjectDeliveryPartners(projectId, mockRequest)

    // Assert - should only return the active partnership
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('partner-1')
    expect(result[0].engagementEnded).toBeNull()
  })
})
