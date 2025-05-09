import { getProjectHistoryController } from './controller.js'

// Mock dependencies
const mockGetProjectById = jest.fn()
const mockGetProjectHistory = jest.fn()

jest.mock('~/src/server/services/projects.js', () => ({
  getProjectById: (...args) => mockGetProjectById(...args),
  getProjectHistory: (...args) => mockGetProjectHistory(...args)
}))

describe('Project Detail Controllers', () => {
  const mockRequest = {
    params: { id: '1' },
    logger: {
      error: jest.fn(),
      info: jest.fn()
    }
  }

  const mockH = {
    view: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProjectHistoryController', () => {
    test('should render project history when project exists', async () => {
      // Arrange
      const mockProject = { id: '1', name: 'Test Project' }
      const mockHistory = [
        { timestamp: '2023-01-01', changes: { status: { to: 'GREEN' } } },
        { timestamp: '2023-01-02', changes: { status: { to: 'AMBER' } } }
      ]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetProjectHistory.mockResolvedValue(mockHistory)

      // Act
      await getProjectHistoryController(mockRequest, mockH)

      // Assert
      expect(mockGetProjectById).toHaveBeenCalledWith('1', mockRequest)
      expect(mockGetProjectHistory).toHaveBeenCalledWith('1', mockRequest)
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/project-history',
        {
          pageTitle: 'Project History: Test Project',
          project: mockProject,
          history: mockHistory
        }
      )
    })

    test('should handle empty history', async () => {
      // Arrange
      const mockProject = { id: '1', name: 'Test Project' }
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetProjectHistory.mockResolvedValue([])

      // Act
      await getProjectHistoryController(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/project-history',
        {
          pageTitle: 'Project History: Test Project',
          project: mockProject,
          history: []
        }
      )
    })

    test('should handle null history', async () => {
      // Arrange
      const mockProject = { id: '1', name: 'Test Project' }
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetProjectHistory.mockResolvedValue(null)

      // Act
      await getProjectHistoryController(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/project-history',
        {
          pageTitle: 'Project History: Test Project',
          project: mockProject,
          history: []
        }
      )
    })

    test('should handle project not found', async () => {
      // Arrange
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await getProjectHistoryController(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/not-found', {
        title: 'Project Not Found'
      })
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    test('should handle errors when fetching project', async () => {
      // Arrange
      mockGetProjectById.mockRejectedValue(new Error('Failed to fetch project'))

      // Act
      await getProjectHistoryController(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Error Retrieving Project History',
        message: 'There was a problem retrieving the project history.'
      })
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    test('should handle errors when fetching history', async () => {
      // Arrange
      const mockProject = { id: '1', name: 'Test Project' }
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetProjectHistory.mockRejectedValue(
        new Error('Failed to fetch history')
      )

      // Act
      await getProjectHistoryController(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Error Retrieving Project History',
        message: 'There was a problem retrieving the project history.'
      })
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })
})
