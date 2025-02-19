import { projectsController } from './controller.js'

const mockGetProjectById = jest.fn()
const mockGetServiceStandards = jest.fn()
const mockUpdateProject = jest.fn()
const mockGetStandardHistory = jest.fn()
const mockGetProjectHistory = jest.fn()

jest.mock('~/src/server/services/projects.js', () => ({
  getProjectById: (...args) => mockGetProjectById(...args),
  updateProject: (...args) => mockUpdateProject(...args),
  getStandardHistory: (...args) => mockGetStandardHistory(...args),
  getProjectHistory: (...args) => mockGetProjectHistory(...args)
}))

jest.mock('~/src/server/services/service-standards.js', () => ({
  getServiceStandards: (...args) => mockGetServiceStandards(...args)
}))

describe('Projects controller', () => {
  const mockH = {
    view: jest.fn(),
    redirect: jest.fn()
  }
  const mockRequest = {
    params: { id: '1' },
    logger: {
      error: jest.fn(),
      info: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('get', () => {
    test('should return project details view', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '1', status: 'GREEN' }]
      }
      const mockStandards = [{ number: 1, name: 'Standard 1' }]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      // Act
      await projectsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/detail/index', {
        pageTitle: 'Test Project | DDTS Assurance',
        heading: 'Test Project',
        project: {
          ...mockProject,
          standards: [
            {
              standardId: '1',
              status: 'GREEN',
              number: 1,
              name: 'Standard 1'
            }
          ]
        }
      })
    })

    test('should redirect if project not found', async () => {
      // Arrange
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await projectsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project not found'
      )
    })

    test('should handle errors', async () => {
      // Arrange
      mockGetProjectById.mockRejectedValue(new Error('Test error'))

      // Act & Assert
      await expect(projectsController.get(mockRequest, mockH)).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    test('should handle missing standards data', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '1', status: 'GREEN' }]
      }
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetServiceStandards.mockResolvedValue([]) // No standards returned

      // Act
      await projectsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/detail/index', {
        pageTitle: 'Test Project | DDTS Assurance',
        heading: 'Test Project',
        project: {
          ...mockProject,
          standards: [
            {
              standardId: '1',
              status: 'GREEN',
              number: 1 // Defaults to standardId when no matching standard found
            }
          ]
        }
      })
    })

    test('should sort standards by number', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [
          { standardId: '2', status: 'GREEN' },
          { standardId: '1', status: 'AMBER' }
        ]
      }
      const mockStandards = [
        { number: 1, name: 'First Standard' },
        { number: 2, name: 'Second Standard' }
      ]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      // Act
      await projectsController.get({ params: { id: '1' } }, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/index',
        expect.objectContaining({
          project: expect.objectContaining({
            standards: [
              expect.objectContaining({ number: 1, standardId: '1' }),
              expect.objectContaining({ number: 2, standardId: '2' })
            ]
          })
        })
      )
    })

    test('should handle missing standard details', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '999', status: 'GREEN' }]
      }
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetServiceStandards.mockResolvedValue([])

      // Act
      await projectsController.get({ params: { id: '1' } }, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/index',
        expect.objectContaining({
          project: expect.objectContaining({
            standards: [expect.objectContaining({ number: 999 })]
          })
        })
      )
    })

    test('should handle project not found', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '999' },
        logger: {
          error: jest.fn()
        }
      }
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await projectsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project not found'
      )
    })

    test('should handle getProjectById error', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1' },
        logger: {
          error: jest.fn()
        }
      }
      const error = new Error('Database error')
      mockGetProjectById.mockRejectedValue(error)

      // Act & Assert
      await expect(
        projectsController.get(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500
        }
      })
      expect(mockRequest.logger.error).toHaveBeenCalledWith(error)
    })

    test('should handle getServiceStandards error', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1' },
        logger: {
          error: jest.fn()
        }
      }
      mockGetProjectById.mockResolvedValue({
        id: '1',
        name: 'Test Project',
        standards: []
      })
      mockGetServiceStandards.mockRejectedValue(new Error('Standards error'))

      // Act & Assert
      await expect(
        projectsController.get(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: {
          statusCode: 500
        }
      })
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })

  describe('getEdit', () => {
    test('should return edit view with project data', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '1', status: 'GREEN' }]
      }
      const mockStandards = [{ number: 1, name: 'Standard 1' }]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      // Act
      await projectsController.getEdit(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/detail/edit', {
        pageTitle: 'Edit Test Project | DDTS Assurance',
        heading: 'Edit Test Project',
        project: {
          ...mockProject,
          standards: [
            {
              standardId: '1',
              status: 'GREEN',
              number: 1,
              name: 'Standard 1'
            }
          ]
        },
        statusOptions: [
          { value: 'RED', text: 'Red' },
          { value: 'AMBER', text: 'Amber' },
          { value: 'GREEN', text: 'Green' }
        ]
      })
    })
  })

  describe('postEdit', () => {
    test('should update project and redirect', async () => {
      // Arrange
      const mockPayload = {
        status: 'GREEN',
        commentary: 'Updated',
        tags: 'Tag1, Tag2',
        'standards.1.status': 'GREEN',
        'standards.1.commentary': 'Standard met'
      }
      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: {
          error: jest.fn(),
          info: jest.fn()
        }
      }
      mockUpdateProject.mockResolvedValue({ success: true })

      // Act
      await projectsController.postEdit(mockRequest, mockH)

      // Assert
      expect(mockUpdateProject).toHaveBeenCalledWith('1', {
        status: 'GREEN',
        commentary: 'Updated',
        tags: ['Tag1', 'Tag2'],
        standards: [
          {
            standardId: '1',
            status: 'GREEN',
            commentary: 'Standard met'
          }
        ]
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1?notification=Project updated successfully'
      )
    })

    test('should handle update errors', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1' },
        payload: {
          status: 'GREEN',
          commentary: 'Updated',
          tags: 'Tag1, Tag2'
        },
        logger: {
          error: jest.fn(),
          info: jest.fn()
        }
      }
      mockUpdateProject.mockRejectedValue(new Error('Update failed'))
      mockGetProjectById.mockResolvedValue({
        id: '1',
        name: 'Test Project',
        standards: []
      })
      mockGetServiceStandards.mockResolvedValue([])

      // Act
      await projectsController.postEdit(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/edit',
        expect.objectContaining({
          errorMessage: 'Failed to update project. Please try again.'
        })
      )
    })

    test('should process comma-separated tags', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1' },
        payload: {
          status: 'GREEN',
          commentary: 'Updated',
          tags: 'Tag1, Tag2,Tag3'
        },
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockGetProjectById.mockResolvedValue({ id: '1', name: 'Test Project' })
      mockUpdateProject.mockResolvedValue({ success: true })

      // Act
      await projectsController.postEdit(mockRequest, mockH)

      // Assert
      expect(mockUpdateProject).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          tags: ['Tag1', 'Tag2', 'Tag3']
        })
      )
    })

    test('should handle empty tags', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1' },
        payload: {
          status: 'GREEN',
          commentary: 'Updated',
          tags: ''
        },
        logger: {
          info: jest.fn(),
          error: jest.fn()
        }
      }
      mockGetProjectById.mockResolvedValue({ id: '1', name: 'Test Project' })
      mockUpdateProject.mockResolvedValue({ success: true })

      // Act
      await projectsController.postEdit(mockRequest, mockH)

      // Assert
      expect(mockUpdateProject).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          tags: []
        })
      )
    })
  })

  describe('getStandardHistory', () => {
    test('should return standard history view', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1', standardId: '2' },
        logger: { error: jest.fn() }
      }
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '2', status: 'GREEN' }]
      }
      const mockHistory = [
        { timestamp: '2024-02-15', changes: { status: { to: 'GREEN' } } }
      ]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetStandardHistory.mockResolvedValue(mockHistory)

      // Act
      await projectsController.getStandardHistory(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/standard-history',
        {
          pageTitle: 'Standard 2 History | Test Project',
          heading: 'Standard 2 History',
          project: mockProject,
          standard: mockProject.standards[0],
          history: mockHistory
        }
      )
    })

    test('should handle standard not found', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1', standardId: '999' },
        logger: { error: jest.fn() }
      }
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '1', status: 'GREEN' }]
      }
      mockGetProjectById.mockResolvedValue(mockProject)

      // Act
      await projectsController.getStandardHistory(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1?notification=Standard not found'
      )
    })

    test('should handle project not found', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '1', standardId: '1' },
        logger: { error: jest.fn() }
      }
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await projectsController.getStandardHistory(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project not found'
      )
    })

    test('should handle missing standard', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: []
      }
      mockGetProjectById.mockResolvedValue(mockProject)

      // Act
      await projectsController.getStandardHistory(
        { params: { id: '1', standardId: '999' } },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1?notification=Standard not found'
      )
    })

    test('should handle error in getStandardHistory', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '1', status: 'GREEN' }]
      }
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetStandardHistory.mockRejectedValue(new Error('History error'))

      // Act & Assert
      const mockRequest = {
        params: { id: '1', standardId: '1' },
        logger: {
          error: jest.fn()
        }
      }
      await expect(
        projectsController.getStandardHistory(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 500 }
      })
    })
  })

  describe('getProjectHistory', () => {
    test('should return project history view', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project'
      }
      const mockHistory = [
        { timestamp: '2024-02-15', changes: { status: { to: 'GREEN' } } }
      ]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetProjectHistory.mockResolvedValue(mockHistory)

      // Act
      await projectsController.getProjectHistory(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/detail/project-history',
        {
          pageTitle: 'Project History | Test Project',
          heading: 'Project History',
          project: mockProject,
          history: mockHistory
        }
      )
    })

    test('should handle project not found', async () => {
      // Arrange
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await projectsController.getProjectHistory(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project not found'
      )
    })

    test('should handle errors', async () => {
      // Arrange
      mockGetProjectById.mockResolvedValue({
        id: '1',
        name: 'Test Project'
      })
      mockGetProjectHistory.mockRejectedValue(new Error('History error'))

      // Act & Assert
      await expect(
        projectsController.getProjectHistory(mockRequest, mockH)
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })

    test('should handle error in getProjectHistory', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project'
      }
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetProjectHistory.mockRejectedValue(new Error('History error'))

      // Act & Assert
      const mockRequest = {
        params: { id: '1' },
        logger: {
          error: jest.fn()
        }
      }
      await expect(
        projectsController.getProjectHistory(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        output: { statusCode: 500 }
      })
    })
  })

  describe('getStandards', () => {
    test('should return standards view', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standards: [{ standardId: '1', status: 'GREEN' }]
      }
      const mockStandards = [{ number: 1, name: 'Standard 1' }]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      // Act
      await projectsController.getStandards(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/detail/standards', {
        pageTitle: 'Standards Progress | Test Project',
        project: {
          ...mockProject,
          standards: [
            {
              standardId: '1',
              status: 'GREEN',
              number: 1,
              name: 'Standard 1'
            }
          ]
        }
      })
    })

    test('should handle project not found', async () => {
      // Arrange
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await projectsController.getStandards(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project not found'
      )
    })

    test('should handle errors', async () => {
      // Arrange
      mockGetProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        projectsController.getStandards(mockRequest, mockH)
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalled()
    })
  })
})
