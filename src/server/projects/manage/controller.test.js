import { manageController } from './controller.js'
import {
  getProjectById,
  updateProject
} from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProfessions } from '~/src/server/services/professions.js'
import {
  NOTIFICATIONS,
  VIEW_TEMPLATES,
  MANAGE_NOTIFICATIONS
} from '~/src/server/constants/notifications.js'

jest.mock('~/src/server/services/projects.js')
jest.mock('~/src/server/services/service-standards.js')
jest.mock('~/src/server/services/professions.js')

describe('Manage Controller', () => {
  let mockRequest
  let mockH
  let mockProject
  let mockProfessions
  let mockServiceStandards

  beforeEach(() => {
    mockRequest = {
      params: { id: 'project-123' },
      payload: {},
      logger: {
        info: jest.fn(),
        error: jest.fn()
      }
    }

    const createMockResponse = () => {
      const response = {
        code: jest.fn().mockReturnValue('view-with-code-response')
      }
      return response
    }

    mockH = {
      view: jest.fn().mockImplementation(() => createMockResponse()),
      redirect: jest.fn().mockReturnValue('redirect-response')
    }

    mockProject = {
      id: 'project-123',
      name: 'Test Project',
      phase: 'Discovery',
      status: 'GREEN',
      standardsSummary: [
        {
          standardId: 'std-1',
          aggregatedStatus: 'RED',
          lastUpdated: '2023-01-01',
          professions: [
            {
              professionId: 'prof-1',
              status: 'RED',
              commentary: 'Needs improvement',
              lastUpdated: '2023-01-01'
            }
          ]
        }
      ]
    }

    mockProfessions = [
      { id: 'prof-1', name: 'Software Engineer' },
      { id: 'prof-2', name: 'Product Manager' }
    ]

    mockServiceStandards = [
      {
        id: 'std-1',
        number: '1',
        name: 'Standard 1',
        description: 'Description 1'
      },
      {
        id: 'std-2',
        number: '2',
        name: 'Standard 2',
        description: 'Description 2'
      }
    ]

    jest.clearAllMocks()
  })

  describe('getManageProject', () => {
    test('should return manage project selection page', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.getManageProject(mockRequest, mockH)

      // Assert
      expect(getProjectById).toHaveBeenCalledWith('project-123', mockRequest)
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_SELECT,
        {
          pageTitle: `Manage ${mockProject.name}`,
          project: mockProject,
          values: {},
          errors: {}
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await manageController.getManageProject(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })

    test('should handle errors and throw Boom error', async () => {
      // Arrange
      const error = new Error('Database error')
      getProjectById.mockRejectedValue(error)

      // Act & Assert
      await expect(
        manageController.getManageProject(mockRequest, mockH)
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error, id: 'project-123' },
        'Error loading manage project selection'
      )
    })
  })

  describe('postManageProject', () => {
    test('should redirect to status management when updateType is status', async () => {
      // Arrange
      mockRequest.payload = { updateType: 'status' }
      getProjectById.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.postManageProject(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/project-123/manage/status'
      )
      expect(result).toBe('redirect-response')
    })

    test('should redirect to details management when updateType is details', async () => {
      // Arrange
      mockRequest.payload = { updateType: 'details' }
      getProjectById.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.postManageProject(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/project-123/manage/details'
      )
      expect(result).toBe('redirect-response')
    })

    test('should show validation error when no updateType selected', async () => {
      // Arrange
      mockRequest.payload = {}
      getProjectById.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.postManageProject(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_SELECT,
        {
          pageTitle: `Manage ${mockProject.name}`,
          project: mockProject,
          values: mockRequest.payload,
          errors: {
            updateType: { text: 'Select what you would like to update' }
          },
          errorMessage: 'Select what you would like to update'
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should show validation error for invalid updateType', async () => {
      // Arrange
      mockRequest.payload = { updateType: 'invalid' }
      getProjectById.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.postManageProject(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_SELECT,
        {
          pageTitle: `Manage ${mockProject.name}`,
          project: mockProject,
          values: mockRequest.payload,
          errors: {
            updateType: { text: 'Select a valid option' }
          },
          errorMessage: 'Select a valid option'
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      mockRequest.payload = { updateType: 'status' }
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await manageController.postManageProject(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })
  })

  describe('getManageProjectStatus', () => {
    test('should return project status management page with standards at risk', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      // Act
      const result = await manageController.getManageProjectStatus(
        mockRequest,
        mockH
      )

      // Assert
      expect(getProjectById).toHaveBeenCalledWith('project-123', mockRequest)
      expect(getServiceStandards).toHaveBeenCalledWith(mockRequest)
      expect(getProfessions).toHaveBeenCalledWith(mockRequest)

      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS,
        expect.objectContaining({
          pageTitle: `Update Status and Commentary | ${mockProject.name}`,
          project: mockProject,
          statusOptions: expect.arrayContaining([
            expect.objectContaining({ text: 'Select status', value: '' })
          ]),
          standardsAtRisk: expect.any(Array),
          professionMap: expect.objectContaining({
            'prof-1': 'Software Engineer',
            'prof-2': 'Product Manager'
          }),
          values: {},
          errors: {}
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await manageController.getManageProjectStatus(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })
  })

  describe('postManageProjectStatus', () => {
    test('should update project status and commentary successfully', async () => {
      // Arrange
      mockRequest.payload = { status: 'AMBER', commentary: 'Updated status' }
      getProjectById.mockResolvedValue(mockProject)
      updateProject.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.postManageProjectStatus(
        mockRequest,
        mockH
      )

      // Assert
      expect(updateProject).toHaveBeenCalledWith(
        'project-123',
        { status: 'AMBER', commentary: 'Updated status' },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${MANAGE_NOTIFICATIONS.PROJECT_STATUS_UPDATED_SUCCESSFULLY}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should show validation errors for missing required fields', async () => {
      // Arrange
      mockRequest.payload = { status: '', commentary: '' }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      // Act
      const result = await manageController.postManageProjectStatus(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS,
        expect.objectContaining({
          values: mockRequest.payload,
          errors: {
            status: true,
            commentary: true
          },
          errorMessage: NOTIFICATIONS.FAILED_TO_UPDATE_PROJECT
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should handle update project errors', async () => {
      // Arrange
      mockRequest.payload = { status: 'AMBER', commentary: 'Updated status' }
      getProjectById.mockResolvedValue(mockProject)
      updateProject.mockRejectedValue(new Error('Update failed'))
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      // Act
      const result = await manageController.postManageProjectStatus(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS,
        expect.objectContaining({
          values: mockRequest.payload,
          errors: {},
          errorMessage: NOTIFICATIONS.FAILED_TO_UPDATE_PROJECT
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })
  })

  describe('getManageProjectDetails', () => {
    test('should return project details management page', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.getManageProjectDetails(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_DETAILS,
        {
          pageTitle: `Update Project Details | ${mockProject.name}`,
          project: mockProject,
          phaseOptions: expect.arrayContaining([
            expect.objectContaining({ text: 'Select phase', value: '' })
          ]),
          values: {},
          errors: {}
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await manageController.getManageProjectDetails(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })
  })

  describe('postManageProjectDetails', () => {
    test('should update project details successfully', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Updated Project',
        phase: 'Alpha',
        defCode: 'UPD001'
      }
      getProjectById.mockResolvedValue(mockProject)
      updateProject.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.postManageProjectDetails(
        mockRequest,
        mockH
      )

      // Assert
      expect(updateProject).toHaveBeenCalledWith(
        'project-123',
        { name: 'Updated Project', phase: 'Alpha', defCode: 'UPD001' },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${MANAGE_NOTIFICATIONS.PROJECT_DETAILS_UPDATED_SUCCESSFULLY}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should show validation errors for missing required fields', async () => {
      // Arrange
      mockRequest.payload = { name: '', phase: '', defCode: '' }
      getProjectById.mockResolvedValue(mockProject)

      // Act
      const result = await manageController.postManageProjectDetails(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_DETAILS,
        expect.objectContaining({
          values: mockRequest.payload,
          errors: {
            name: true,
            phase: true
          },
          errorMessage: 'Please fill in all required fields'
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should handle update project details errors', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Updated Project',
        phase: 'Alpha',
        defCode: 'UPD001'
      }
      getProjectById.mockResolvedValue(mockProject)
      updateProject.mockRejectedValue(new Error('Update failed'))

      // Act
      const result = await manageController.postManageProjectDetails(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_DETAILS,
        expect.objectContaining({
          values: mockRequest.payload,
          errors: {},
          errorMessage: NOTIFICATIONS.FAILED_TO_UPDATE_PROJECT
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Updated Project',
        phase: 'Alpha',
        defCode: 'UPD001'
      }
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await manageController.postManageProjectDetails(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })
  })

  describe('Helper functions', () => {
    test('should handle projects with no standardsSummary', async () => {
      // Arrange
      const projectWithoutStandards = { ...mockProject, standardsSummary: null }
      getProjectById.mockResolvedValue(projectWithoutStandards)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      // Act
      const result = await manageController.getManageProjectStatus(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS,
        expect.objectContaining({
          standardsAtRisk: []
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should handle empty professions array', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue([])

      // Act
      const result = await manageController.getManageProjectStatus(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS,
        expect.objectContaining({
          professionMap: {}
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })
  })

  describe('Helper functions advanced scenarios', () => {
    test('should handle projects with missing standardsSummary via getManageProjectStatus', async () => {
      // Arrange
      const mockProject = { id: '1', name: 'Test Project' } // no standardsSummary
      const mockServiceStandards = [
        { id: 'std-1', number: 1, name: 'Test Standard' }
      ]
      const mockProfessions = [{ id: 'prof-1', name: 'Test Profession' }]

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      const mockRequest = {
        params: { id: '1' },
        logger: { error: jest.fn() }
      }

      // Act
      await manageController.getManageProjectStatus(mockRequest, mockH)

      // Assert - should handle missing standardsSummary gracefully
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/manage/views/status',
        expect.objectContaining({
          standardsAtRisk: [] // Empty array when no standardsSummary
        })
      )
    })

    test('should handle null serviceStandards via getManageProjectStatus', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: [
          {
            standardId: 'std-1',
            aggregatedStatus: 'RED',
            professions: []
          }
        ]
      }
      const mockProfessions = [{ id: 'prof-1', name: 'Test Profession' }]

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(null) // null serviceStandards
      getProfessions.mockResolvedValue(mockProfessions)

      const mockRequest = {
        params: { id: '1' },
        logger: { error: jest.fn() }
      }

      // Act
      await manageController.getManageProjectStatus(mockRequest, mockH)

      // Assert - should handle null serviceStandards gracefully
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/manage/views/status',
        expect.objectContaining({
          standardsAtRisk: [] // Empty array when serviceStandards is null
        })
      )
    })

    test('should create placeholder for missing service standard via getManageProjectStatus', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: [
          {
            standardId: 'missing-std',
            aggregatedStatus: 'RED',
            professions: [
              {
                professionId: 'prof-1',
                commentary: 'Test comment',
                status: 'RED'
              }
            ]
          }
        ]
      }
      const mockServiceStandards = [] // empty array, no matching standard
      const mockProfessions = [{ id: 'prof-1', name: 'Test Profession' }]

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      const mockRequest = {
        params: { id: '1' },
        logger: { error: jest.fn() }
      }

      // Act
      await manageController.getManageProjectStatus(mockRequest, mockH)

      // Assert - should create placeholder for missing standard
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/manage/views/status',
        expect.objectContaining({
          standardsAtRisk: expect.arrayContaining([
            expect.objectContaining({
              id: 'missing-std',
              number: 'Unknown',
              name: 'Unknown Standard',
              status: 'RED'
            })
          ])
        })
      )
    })

    test('should handle profession comments with empty commentary', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: [
          {
            standardId: 'std-1',
            aggregatedStatus: 'RED',
            professions: [
              {
                professionId: 'prof-1',
                commentary: '   ', // whitespace only
                status: 'RED'
              },
              {
                professionId: 'prof-2',
                commentary: '', // empty string
                status: 'AMBER'
              },
              {
                professionId: 'prof-3',
                commentary: 'Valid comment',
                status: 'GREEN'
              }
            ]
          }
        ]
      }
      const mockServiceStandards = [
        { id: 'std-1', number: 1, name: 'Test Standard' }
      ]
      const mockProfessions = [
        { id: 'prof-1', name: 'Profession 1' },
        { id: 'prof-2', name: 'Profession 2' },
        { id: 'prof-3', name: 'Profession 3' }
      ]

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      const mockRequest = {
        params: { id: '1' },
        logger: { error: jest.fn() }
      }

      // Act
      await manageController.getManageProjectStatus(mockRequest, mockH)

      // Assert - should only include prof-3 with non-empty commentary
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/manage/views/status',
        expect.objectContaining({
          standardsAtRisk: expect.arrayContaining([
            expect.objectContaining({
              professionComments: [
                {
                  professionName: 'Profession 3',
                  commentary: 'Valid comment',
                  status: 'GREEN',
                  lastUpdated: undefined
                }
              ]
            })
          ])
        })
      )
    })
  })

  describe('postManageProjectStatus error scenarios', () => {
    test('should handle validation errors and use alternative standards at risk', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: [
          {
            standardId: 'std-1',
            aggregatedStatus: 'RED',
            professions: []
          }
        ]
      }
      const mockServiceStandards = [
        { id: 'std-1', number: 1, name: 'Test Standard' }
      ]
      const mockProfessions = [{ id: 'prof-1', name: 'Test Profession' }]

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      const mockRequest = {
        params: { id: '1' },
        payload: { status: '', commentary: '' }, // Missing required fields
        logger: { error: jest.fn() }
      }

      // Act
      await manageController.postManageProjectStatus(mockRequest, mockH)

      // Assert - should show validation error view with alternative standards
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/manage/views/status',
        expect.objectContaining({
          project: mockProject,
          values: mockRequest.payload,
          errors: {
            status: true,
            commentary: true
          },
          errorMessage: 'Failed to update project. Please try again.',
          standardsAtRisk: expect.any(Array)
        })
      )
    })

    test('should handle project fetch failure in status update', async () => {
      // Arrange
      getProjectById.mockRejectedValue(new Error('Project fetch failed'))

      const mockRequest = {
        params: { id: '1' },
        payload: { status: 'GREEN', commentary: 'Test' },
        logger: { error: jest.fn() }
      }

      // Act & Assert
      await expect(
        manageController.postManageProjectStatus(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true
      })
    })
  })

  describe('getManageProjectStatus with empty data scenarios', () => {
    test('should handle empty professions array gracefully', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        status: 'GREEN',
        standardsSummary: []
      }
      const mockServiceStandards = []
      const mockProfessions = [] // Empty professions

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)

      const mockRequest = {
        params: { id: '1' },
        logger: { error: jest.fn() }
      }

      // Act
      await manageController.getManageProjectStatus(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/manage/views/status',
        expect.objectContaining({
          project: mockProject,
          professionMap: {}, // Empty profession map
          standardsAtRisk: []
        })
      )
    })

    test('should handle null professions response', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        status: 'GREEN',
        standardsSummary: []
      }

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue([])
      getProfessions.mockResolvedValue(null) // Null professions

      const mockRequest = {
        params: { id: '1' },
        logger: { error: jest.fn() }
      }

      // Act
      await manageController.getManageProjectStatus(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/manage/views/status',
        expect.objectContaining({
          professionMap: {} // Should handle null professions gracefully
        })
      )
    })
  })
})
