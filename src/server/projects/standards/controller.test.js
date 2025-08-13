import { standardsController } from './controller.js'
import {
  getProjectById,
  getStandardHistory,
  updateAssessment,
  getAssessment,
  getAssessmentHistory,
  archiveAssessmentHistoryEntry,
  replaceAssessment
} from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProfessions } from '~/src/server/services/professions.js'
import {
  filterStandardsByProfessionAndPhase,
  PROFESSION_STANDARD_MATRIX
} from '~/src/server/services/profession-standard-matrix.js'
import {
  NOTIFICATIONS,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'

jest.mock('~/src/server/services/projects.js')
jest.mock('~/src/server/services/service-standards.js')
jest.mock('~/src/server/services/professions.js')
jest.mock('~/src/server/services/profession-standard-matrix.js')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      if (key === 'api.version') return 'v1.0'
      if (key === 'log') return { enabled: true, redact: [] }
      return undefined
    })
  }
}))

describe('Standards Controller', () => {
  let mockRequest
  let mockH
  let mockProject
  let mockProfessions
  let mockServiceStandards
  let mockStandardHistory
  let mockAssessmentHistory

  beforeEach(() => {
    mockRequest = {
      params: {
        id: 'project-123',
        standardId: 'std-1',
        professionId: 'prof-1',
        historyId: 'hist-1'
      },
      payload: {},
      query: {},
      auth: { isAuthenticated: true },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    }

    mockH = {
      view: jest.fn().mockImplementation(() => ({
        code: jest.fn().mockReturnValue('view-with-code-response')
      })),
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

    mockStandardHistory = [
      {
        id: 'hist-1',
        standardId: 'std-1',
        professionId: 'prof-1',
        status: 'RED',
        commentary: 'Historical comment',
        updatedAt: '2023-01-01'
      }
    ]

    mockAssessmentHistory = [
      {
        id: 'hist-1',
        standardId: 'std-1',
        professionId: 'prof-1',
        status: 'RED',
        commentary: 'Assessment comment',
        updatedAt: '2023-01-01',
        archived: false
      }
    ]

    filterStandardsByProfessionAndPhase.mockReturnValue(mockServiceStandards)

    jest.clearAllMocks()
  })

  describe('getStandards', () => {
    test('should return standards list page', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      const result = await standardsController.getStandards(mockRequest, mockH)

      // Assert
      expect(getProjectById).toHaveBeenCalledWith('project-123', mockRequest)
      expect(getServiceStandards).toHaveBeenCalledWith(mockRequest)
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_LIST,
        {
          pageTitle: `Standards Progress | ${mockProject.name}`,
          project: mockProject,
          standards: mockServiceStandards
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should redirect when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await standardsController.getStandards(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle errors and throw Boom error', async () => {
      // Arrange
      const error = new Error('Database error')
      getProjectById.mockRejectedValue(error)

      // Act & Assert
      await expect(
        standardsController.getStandards(mockRequest, mockH)
      ).rejects.toThrow()
      expect(mockRequest.logger.error).toHaveBeenCalledWith(error)
    })
  })

  describe('getStandardDetail', () => {
    test('should return standard detail page with assessments', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getStandardDetail(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_DETAIL,
        expect.objectContaining({
          pageTitle: `Standard 1 | ${mockProject.name}`,
          project: mockProject,
          standard: expect.objectContaining({
            id: 'std-1',
            number: '1',
            name: 'Standard 1'
          }),
          assessments: expect.arrayContaining([
            expect.objectContaining({
              professionId: 'prof-1',
              professionName: 'Software Engineer',
              status: 'RED',
              commentary: 'Needs improvement'
            })
          ]),
          isAuthenticated: true
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await standardsController.getStandardDetail(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/not-found', {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })

    test('should redirect when standard not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue([]) // No standards

      // Act
      const result = await standardsController.getStandardDetail(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle error when fetching assessment history for archive link', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: [
          {
            standardId: 'std-1',
            professions: [
              {
                professionId: 'prof-1',
                status: 'GREEN',
                commentary: 'Test'
              }
            ]
          }
        ]
      }

      const mockProfessions = [{ id: 'prof-1', name: 'Test Profession' }]
      const mockServiceStandards = [
        { id: 'std-1', number: 1, name: 'Test Standard' }
      ]

      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Mock getAssessmentHistory to throw error
      getAssessmentHistory.mockRejectedValue(new Error('History fetch failed'))

      const mockRequest = {
        params: { id: '1', standardId: 'std-1' },
        query: {},
        auth: { isAuthenticated: true },
        logger: { warn: jest.fn(), error: jest.fn() }
      }

      // Act
      await standardsController.getStandardDetail(mockRequest, mockH)

      // Assert
      expect(mockRequest.logger.warn).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Could not fetch assessment history for archive link'
      )
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/detail',
        expect.objectContaining({
          assessments: expect.arrayContaining([
            expect.objectContaining({
              professionId: 'prof-1',
              mostRecentHistoryId: null
            })
          ])
        })
      )
    })

    test('should handle standard with case-sensitive StandardId field', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: [
          {
            StandardId: 'std-1', // Note the capital S
            professions: []
          }
        ]
      }

      getProjectById.mockResolvedValue(mockProject)

      const mockRequest = {
        params: { id: '1', standardId: 'std-1' },
        query: {},
        logger: { error: jest.fn() }
      }

      // Act
      await standardsController.getStandardHistory(mockRequest, mockH)

      // Assert
      expect(getStandardHistory).toHaveBeenCalledWith('1', 'std-1', mockRequest)
    })

    test('should handle error when fetching standard detail data', async () => {
      // Arrange
      getProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        standardsController.getStandardDetail(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true
      })
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Error loading standard detail'
      )
    })
  })

  describe('getStandardHistory', () => {
    test('should return standard history page', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getStandardHistory.mockResolvedValue(mockStandardHistory)

      // Act
      const result = await standardsController.getStandardHistory(
        mockRequest,
        mockH
      )

      // Assert
      expect(getStandardHistory).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        mockRequest
      )
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_HISTORY,
        {
          pageTitle: `Standard std-1 History | ${mockProject.name}`,
          heading: `Standard std-1 History`,
          project: mockProject,
          standard: expect.objectContaining({ standardId: 'std-1' }),
          history: mockStandardHistory
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should redirect when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await standardsController.getStandardHistory(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should redirect when standard not found in project', async () => {
      // Arrange
      const projectWithoutStandard = { ...mockProject, standardsSummary: [] }
      getProjectById.mockResolvedValue(projectWithoutStandard)

      // Act
      const result = await standardsController.getStandardHistory(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle error when fetching standard history data', async () => {
      // Arrange
      getProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        standardsController.getStandardHistory(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true
      })
      expect(mockRequest.logger.error).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('getAssessmentScreen', () => {
    test('should return assessment screen with dropdowns', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      const result = await standardsController.getAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          pageTitle: `Assess Standards | ${mockProject.name}`,
          project: mockProject,
          projectId: mockProject.id,
          projectPhase: mockProject.phase,
          professionItems: expect.arrayContaining([
            expect.objectContaining({ text: 'Choose a profession', value: '' })
          ]),
          standardItems: expect.arrayContaining([
            expect.objectContaining({
              text: 'Choose a service standard',
              value: ''
            })
          ]),
          statusOptions: expect.arrayContaining([
            expect.objectContaining({ text: 'Choose a status', value: '' })
          ]),
          professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX)
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should pre-select values from query parameters in add mode', async () => {
      // Arrange
      mockRequest.query = {
        standardId: 'std-2',
        professionId: 'prof-2'
      }
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          selectedValues: expect.objectContaining({
            standardId: 'std-2',
            professionId: 'prof-2'
          }),
          isEditMode: false
        })
      )
    })

    test('should pre-select only standardId when only standardId provided in query', async () => {
      // Arrange
      mockRequest.query = {
        standardId: 'std-1'
      }
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          selectedValues: expect.objectContaining({
            standardId: 'std-1'
          }),
          isEditMode: false
        })
      )
    })

    test('should pre-select only professionId when only professionId provided in query', async () => {
      // Arrange
      mockRequest.query = {
        professionId: 'prof-1'
      }
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          selectedValues: expect.objectContaining({
            professionId: 'prof-1'
          }),
          isEditMode: false
        })
      )
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await standardsController.getAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/not-found', {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })

    test('should handle error when fetching project data', async () => {
      // Arrange
      getProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        standardsController.getAssessmentScreen(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true
      })
    })

    test('should handle missing professions data', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([])
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          professionItems: [{ value: '', text: 'Choose a profession' }]
        })
      )
    })

    test('should handle missing standards data', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue([])

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          standardItems: [{ value: '', text: 'Choose a service standard' }],
          allStandards: '[]'
        })
      )
    })

    test('should handle null service standards response', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(null)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          allStandards: '[]'
        })
      )
    })

    test('should handle edit mode', async () => {
      // Arrange
      mockRequest.query = {
        edit: 'true',
        standardId: 'std-1',
        professionId: 'prof-1'
      }
      const mockExistingAssessment = {
        status: 'AMBER',
        commentary: 'Existing commentary'
      }
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessment.mockResolvedValue(mockExistingAssessment)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(getAssessment).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        mockRequest
      )
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          isEditMode: true,
          existingAssessment: mockExistingAssessment,
          selectedValues: expect.objectContaining({
            professionId: 'prof-1',
            standardId: 'std-1',
            status: 'AMBER',
            commentary: 'Existing commentary'
          })
        })
      )
    })

    test('should redirect when assessment not found in edit mode', async () => {
      // Arrange
      mockRequest.query = {
        edit: 'true',
        standardId: 'std-1',
        professionId: 'prof-1'
      }
      getProjectById.mockResolvedValue(mockProject)
      getAssessment.mockResolvedValue(null) // Assessment not found
      mockH.redirect.mockImplementation(() => ({
        takeover: jest.fn().mockReturnValue({ message: jest.fn() })
      }))

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/project-123/standards/std-1'
      )
    })

    test('should handle error fetching existing assessment in edit mode', async () => {
      // Arrange
      mockRequest.query = {
        edit: 'true',
        standardId: 'std-1',
        professionId: 'prof-1'
      }
      getProjectById.mockResolvedValue(mockProject)
      getAssessment.mockRejectedValue(new Error('Fetch failed'))
      mockH.redirect.mockImplementation(() => ({
        takeover: jest.fn().mockReturnValue({ message: jest.fn() })
      }))

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Error fetching existing assessment for edit'
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/project-123/standards/std-1'
      )
    })
  })

  describe('postAssessmentScreen', () => {
    test('should save assessment successfully', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'All good'
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockResolvedValue({})

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(updateAssessment).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        { status: 'GREEN', commentary: 'All good' },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.ASSESSMENT_SAVED_SUCCESSFULLY}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should show validation errors for missing required fields', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: '',
        standardId: '',
        status: '',
        commentary: ''
      }
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          error: 'Please select a profession, service standard, and status',
          selectedValues: expect.objectContaining({
            professionId: '',
            standardId: '',
            status: '',
            commentary: ''
          })
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should validate profession-standard combination', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-2',
        status: 'GREEN',
        commentary: 'Test'
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      // Mock filter to return empty array (invalid combination)
      filterStandardsByProfessionAndPhase.mockReturnValue([])

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(filterStandardsByProfessionAndPhase).toHaveBeenCalledWith(
        mockServiceStandards,
        mockProject.phase,
        'prof-1'
      )
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          error: expect.stringContaining(
            'This profession cannot assess the selected standard'
          )
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should handle assessment save errors', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'All good'
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockRejectedValue(new Error('Save failed'))
      getProfessions.mockResolvedValue(mockProfessions)

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          error: NOTIFICATIONS.FAILED_TO_SAVE_ASSESSMENT
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should handle Internal Server Error specifically', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'All good'
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockRejectedValue(new Error('Internal Server Error'))
      getProfessions.mockResolvedValue(mockProfessions)

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          error:
            'Unable to update existing assessment - this is a known backend issue. New assessments work correctly.'
        })
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'All good'
      }
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/not-found', {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })

    test('should handle error when project cannot be loaded for error handling', async () => {
      // Arrange
      const mockPayload = {
        professionId: 'prof-1',
        standardId: '1',
        status: 'GREEN',
        commentary: 'Test'
      }

      // First call fails (the main processing)
      // Second call fails (the error handling attempt)
      getProjectById
        .mockRejectedValueOnce(new Error('Initial database error'))
        .mockRejectedValueOnce(new Error('Error handling failed'))

      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: { error: jest.fn(), info: jest.fn() }
      }

      // Act & Assert
      await expect(
        standardsController.postAssessmentScreen(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true
      })
    })

    test('should handle update assessment failure with project loaded', async () => {
      // Arrange
      const mockPayload = {
        professionId: 'prof-1',
        standardId: '1',
        status: 'GREEN',
        commentary: 'Test'
      }

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockRejectedValue(new Error('Update failed'))

      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: { error: jest.fn(), info: jest.fn() }
      }

      // Act
      await standardsController.postAssessmentScreen(mockRequest, mockH)

      // Assert - should show error view instead of throwing
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          error: 'Failed to save assessment. Please try again.'
        })
      )
    })

    test('should handle general assessment save errors', async () => {
      // Arrange
      const mockPayload = {
        professionId: 'prof-1',
        standardId: '1',
        status: 'GREEN',
        commentary: 'Test'
      }

      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockRejectedValue(new Error('Internal error'))

      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: { error: jest.fn(), info: jest.fn() }
      }

      // Act
      await standardsController.postAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          error: 'Failed to save assessment. Please try again.'
        })
      )
    })

    test('should handle project loading failure during error handling', async () => {
      // Arrange
      const mockPayload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'Test'
      }

      // First call fails (no project loaded)
      getProjectById
        .mockRejectedValueOnce(new Error('Initial project load failed'))
        .mockRejectedValueOnce(new Error('Error recovery project load failed'))

      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: { error: jest.fn(), info: jest.fn() }
      }

      // Act & Assert
      await expect(
        standardsController.postAssessmentScreen(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true
      })

      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { projectError: expect.any(Error) },
        'Failed to load project for error handling'
      )
    })

    test('should handle Internal Server Error specifically in assessment save', async () => {
      // Arrange
      const mockProject = { id: '1', phase: 'Live' }
      const mockPayload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'Test'
      }

      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([])
      getServiceStandards.mockResolvedValue([])

      // Mock updateAssessment to throw Internal Server Error
      updateAssessment.mockRejectedValue(new Error('Internal Server Error'))

      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: { error: jest.fn(), info: jest.fn() }
      }

      // Act
      await standardsController.postAssessmentScreen(mockRequest, mockH)

      // Assert - should call handleAssessmentError which shows specific error for 500 errors
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          error:
            'Unable to update existing assessment - this is a known backend issue. New assessments work correctly.'
        })
      )
    })

    test('should handle 500 status error in assessment save', async () => {
      // Arrange
      const mockProject = { id: '1', phase: 'Live' }
      const mockPayload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'Test'
      }

      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([])
      getServiceStandards.mockResolvedValue([])

      // Mock updateAssessment to throw 500 error
      updateAssessment.mockRejectedValue(new Error('500'))

      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: { error: jest.fn(), info: jest.fn() }
      }

      // Act
      await standardsController.postAssessmentScreen(mockRequest, mockH)

      // Assert - should show specific 500 error message
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          error:
            'Unable to update existing assessment - this is a known backend issue. New assessments work correctly.'
        })
      )
    })

    test('should handle error when project returns null during error recovery', async () => {
      // Arrange
      const mockPayload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'Test'
      }

      // First call succeeds but updateAssessment fails
      // Second call for error recovery returns null
      getProjectById
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(null) // Project returns null during error recovery

      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockRejectedValue(new Error('Update failed'))

      const mockRequest = {
        params: { id: '1' },
        payload: mockPayload,
        logger: { error: jest.fn(), info: jest.fn() }
      }

      // Act & Assert
      await expect(
        standardsController.postAssessmentScreen(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true
      })
    })

    test('should handle edit mode successfully with replaceAssessment', async () => {
      // Arrange
      mockRequest.query = { edit: 'true' }
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'Updated commentary'
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      replaceAssessment.mockResolvedValue({ id: 'new-assessment' })

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(replaceAssessment).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        { status: 'GREEN', commentary: 'Updated commentary' },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/project-123/standards/std-1?notification=Assessment updated successfully'
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle error in edit mode when replaceAssessment fails', async () => {
      // Arrange
      mockRequest.query = { edit: 'true' }
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'Test'
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getProfessions.mockResolvedValue(mockProfessions)
      replaceAssessment.mockRejectedValue(new Error('Replace failed'))

      // Act
      await standardsController.postAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Error updating assessment'
      )
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          error: NOTIFICATIONS.FAILED_TO_SAVE_ASSESSMENT
        })
      )
    })
  })

  describe('getAssessmentHistory', () => {
    test('should return assessment history page', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getAssessmentHistory(
        mockRequest,
        mockH
      )

      // Assert
      expect(getAssessmentHistory).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        mockRequest
      )
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT_HISTORY,
        {
          pageTitle: `Software Engineer Assessment History | Standard 1 | ${mockProject.name}`,
          project: mockProject,
          standard: expect.objectContaining({ id: 'std-1' }),
          profession: expect.objectContaining({ id: 'prof-1' }),
          history: mockAssessmentHistory
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await standardsController.getAssessmentHistory(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/not-found', {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })

    test('should redirect when standard not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue([]) // No standards
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getAssessmentHistory(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should redirect when profession not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([]) // No professions
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getAssessmentHistory(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.PROFESSION_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle error when fetching assessment history data', async () => {
      // Arrange
      getProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        standardsController.getAssessmentHistory(
          {
            params: { id: '1', standardId: '1', professionId: 'prof-1' },
            logger: { error: jest.fn() }
          },
          mockH
        )
      ).rejects.toMatchObject({
        isBoom: true
      })
    })

    test('should handle null professions response', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(null)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessmentHistory.mockResolvedValue([])

      // Act
      await standardsController.getAssessmentHistory(
        {
          params: { id: '1', standardId: '1', professionId: 'prof-1' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1?notification=Standard not found'
      )
    })

    test('should handle null service standards response', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(null)
      getAssessmentHistory.mockResolvedValue([])

      // Act
      await standardsController.getAssessmentHistory(
        {
          params: { id: '1', standardId: '1', professionId: 'prof-1' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1?notification=Standard not found'
      )
    })
  })

  describe('getArchiveAssessment', () => {
    test('should return archive assessment page', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ARCHIVE_ASSESSMENT,
        {
          pageTitle: `Archive Assessment | Software Engineer | Standard 1 | ${mockProject.name}`,
          project: mockProject,
          standard: expect.objectContaining({ id: 'std-1' }),
          profession: expect.objectContaining({ id: 'prof-1' }),
          historyEntry: expect.objectContaining({ id: 'hist-1' })
        }
      )
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('function')
    })

    test('should return 404 when project not found in getArchiveAssessment', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      const result = await standardsController.getArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/not-found', {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      expect(result).toBe('view-with-code-response')
    })

    test('should redirect when history entry not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessmentHistory.mockResolvedValue([]) // No history entries

      // Act
      const result = await standardsController.getArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123/standards/std-1/professions/prof-1/history?notification=${NOTIFICATIONS.HISTORY_ENTRY_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle error when fetching archive assessment data', async () => {
      // Arrange
      getProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        standardsController.getArchiveAssessment(
          {
            params: {
              id: '1',
              standardId: '1',
              professionId: 'prof-1',
              historyId: 'hist-1'
            },
            logger: { error: jest.fn() }
          },
          mockH
        )
      ).rejects.toMatchObject({
        isBoom: true
      })
    })

    test('should redirect when neither standard nor profession found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([]) // No professions
      getServiceStandards.mockResolvedValue([]) // No standards
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.STANDARD_OR_PROFESSION_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should redirect when standard found but profession not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([]) // No professions
      getServiceStandards.mockResolvedValue(mockServiceStandards) // Standards exist
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.STANDARD_OR_PROFESSION_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should redirect when profession found but standard not found', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions) // Professions exist
      getServiceStandards.mockResolvedValue([]) // No standards
      getAssessmentHistory.mockResolvedValue(mockAssessmentHistory)

      // Act
      const result = await standardsController.getArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123?notification=${NOTIFICATIONS.STANDARD_OR_PROFESSION_NOT_FOUND}`
      )
      expect(result).toBe('redirect-response')
    })
  })

  describe('postArchiveAssessment', () => {
    test('should archive assessment and redirect to history page', async () => {
      // Arrange
      archiveAssessmentHistoryEntry.mockResolvedValue({})

      // Act
      const result = await standardsController.postArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(archiveAssessmentHistoryEntry).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        'hist-1',
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123/standards/std-1/professions/prof-1/history?notification=${NOTIFICATIONS.ASSESSMENT_ARCHIVED_SUCCESSFULLY}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should redirect to detail page when returnTo is detail', async () => {
      // Arrange
      mockRequest.query = { returnTo: 'detail' }
      archiveAssessmentHistoryEntry.mockResolvedValue({})

      // Act
      const result = await standardsController.postArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123/standards/std-1?notification=${NOTIFICATIONS.ASSESSMENT_ARCHIVED_SUCCESSFULLY}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle archive errors', async () => {
      // Arrange
      archiveAssessmentHistoryEntry.mockRejectedValue(
        new Error('Archive failed')
      )

      // Act
      const result = await standardsController.postArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Error archiving assessment entry'
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        `/projects/project-123/standards/std-1/professions/prof-1/history?notification=${NOTIFICATIONS.FAILED_TO_ARCHIVE_ASSESSMENT}`
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle archive errors with returnTo detail', async () => {
      // Arrange
      archiveAssessmentHistoryEntry.mockRejectedValue(
        new Error('Archive failed')
      )

      // Act
      const result = await standardsController.postArchiveAssessment(
        {
          params: {
            id: 'project-123',
            standardId: 'std-1',
            professionId: 'prof-1',
            historyId: 'hist-1'
          },
          query: { returnTo: 'detail' },
          logger: { error: jest.fn(), info: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/project-123/standards/std-1?notification=Failed to archive assessment entry'
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle archive failure with returnTo detail', async () => {
      // Arrange
      archiveAssessmentHistoryEntry.mockRejectedValue(
        new Error('Archive failed')
      )

      // Act
      await standardsController.postArchiveAssessment(
        {
          params: {
            id: '1',
            standardId: '1',
            professionId: 'prof-1',
            historyId: 'hist-1'
          },
          query: { returnTo: 'detail' },
          logger: { error: jest.fn(), info: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1/standards/1?notification=Failed to archive assessment entry'
      )
    })

    test('should handle archive failure with returnTo history (default)', async () => {
      // Arrange
      archiveAssessmentHistoryEntry.mockRejectedValue(
        new Error('Archive failed')
      )

      // Act
      await standardsController.postArchiveAssessment(
        {
          params: {
            id: '1',
            standardId: '1',
            professionId: 'prof-1',
            historyId: 'hist-1'
          },
          query: {},
          logger: { error: jest.fn(), info: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1/standards/1/professions/prof-1/history?notification=Failed to archive assessment entry'
      )
    })
  })

  describe('Additional edge cases for better coverage', () => {
    test('should handle validation when no selected standard found', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'non-existent-standard',
        status: 'GREEN',
        commentary: 'Test'
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue([]) // No standards
      getProfessions.mockResolvedValue(mockProfessions)

      // Act
      await standardsController.postAssessmentScreen(mockRequest, mockH)

      // Assert - should not validate profession-standard combination when no standard found
      expect(mockH.view).toHaveBeenCalled()
    })

    test('should handle validation when project has no phase', async () => {
      // Arrange
      const projectWithoutPhase = { ...mockProject, phase: null }
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: 'Test'
      }
      getProjectById.mockResolvedValue(projectWithoutPhase)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockResolvedValue({})

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert - should skip profession-standard validation when no phase
      expect(updateAssessment).toHaveBeenCalled()
      expect(result).toBe('redirect-response')
    })

    test('should handle null professions in createProfessionItems helper', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(null)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          professionItems: [{ value: '', text: 'Choose a profession' }]
        })
      )
    })

    test('should handle null standards in createStandardItems helper', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(null)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          standardItems: [{ value: '', text: 'Choose a service standard' }]
        })
      )
    })

    test('should handle empty commentary in assessment payload', async () => {
      // Arrange
      mockRequest.payload = {
        professionId: 'prof-1',
        standardId: 'std-1',
        status: 'GREEN',
        commentary: null // Null commentary
      }
      getProjectById.mockResolvedValue(mockProject)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      updateAssessment.mockResolvedValue({})

      // Act
      const result = await standardsController.postAssessmentScreen(
        mockRequest,
        mockH
      )

      // Assert
      expect(updateAssessment).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        { status: 'GREEN', commentary: '' }, // Should default to empty string
        mockRequest
      )
      expect(result).toBe('redirect-response')
    })

    test('should handle assessment with undefined commentary in edit mode', async () => {
      // Arrange
      mockRequest.query = {
        edit: 'true',
        standardId: 'std-1',
        professionId: 'prof-1'
      }
      const mockExistingAssessment = {
        status: 'AMBER',
        commentary: undefined // Undefined commentary
      }
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)
      getAssessment.mockResolvedValue(mockExistingAssessment)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          selectedValues: expect.objectContaining({
            commentary: '' // Should default to empty string
          })
        })
      )
    })

    test('should handle project with missing phase in createAssessmentViewData', async () => {
      // Arrange
      const projectWithoutPhase = { ...mockProject, phase: undefined }
      getProjectById.mockResolvedValue(projectWithoutPhase)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          projectPhase: '' // Should default to empty string
        })
      )
    })

    test('should handle non-edit mode in getAssessmentScreen', async () => {
      // Arrange
      mockRequest.query = {} // No edit mode
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue(mockProfessions)
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT,
        expect.objectContaining({
          isEditMode: false,
          selectedValues: {},
          existingAssessment: null
        })
      )
    })

    test('should use PROJECT_ASSESSMENT_HISTORY route pattern in redirects', async () => {
      // This test ensures the ROUTE_PATTERNS.PROJECT_ASSESSMENT_HISTORY constant is used
      // when redirects happen in postArchiveAssessment

      // Arrange
      archiveAssessmentHistoryEntry.mockResolvedValue({})

      // Act
      const result = await standardsController.postArchiveAssessment(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        expect.stringContaining(
          '/projects/project-123/standards/std-1/professions/prof-1/history'
        )
      )
      expect(result).toBe('redirect-response')
    })
  })

  describe('Helper functions edge cases', () => {
    test('should handle empty professions array in helper', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([])
      getServiceStandards.mockResolvedValue(mockServiceStandards)

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          professionItems: expect.arrayContaining([
            { value: '', text: 'Choose a profession' }
          ])
        })
      )
    })

    test('should handle empty standards array in helper', async () => {
      // Arrange
      getProjectById.mockResolvedValue(mockProject)
      getProfessions.mockResolvedValue([])
      getServiceStandards.mockResolvedValue([])

      // Act
      await standardsController.getAssessmentScreen(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/assessment',
        expect.objectContaining({
          standardItems: expect.arrayContaining([
            { value: '', text: 'Choose a service standard' }
          ])
        })
      )
    })
  })

  describe('getAssessmentData', () => {
    let mockResponseObject

    beforeEach(() => {
      // Mock response object that has code() method
      mockResponseObject = {
        code: jest.fn().mockReturnThis()
      }

      // Mock h.response() to return the response object
      mockH.response = jest.fn().mockReturnValue(mockResponseObject)
    })

    test('should return assessment data as JSON when assessment exists', async () => {
      // Arrange
      const mockAssessment = {
        id: 'assessment-123',
        projectId: 'project-123',
        standardId: 'std-1',
        professionId: 'prof-1',
        status: 'RED',
        commentary: 'Needs improvement\n\nPath to green: Fix security issues',
        lastUpdated: '2023-01-01T10:00:00Z'
      }

      getAssessment.mockResolvedValue(mockAssessment)

      // Act
      const result = await standardsController.getAssessmentData(
        mockRequest,
        mockH
      )

      // Assert
      expect(getAssessment).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        mockRequest
      )
      expect(mockH.response).toHaveBeenCalledWith(mockAssessment)
      expect(mockResponseObject.code).toHaveBeenCalledWith(200)
      expect(result).toBe(mockResponseObject)
    })

    test('should return 404 when assessment does not exist', async () => {
      // Arrange
      getAssessment.mockResolvedValue(null)

      // Act
      const result = await standardsController.getAssessmentData(
        mockRequest,
        mockH
      )

      // Assert
      expect(getAssessment).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        mockRequest
      )
      expect(mockH.response).toHaveBeenCalledWith()
      expect(mockResponseObject.code).toHaveBeenCalledWith(404)
      expect(result).toBe(mockResponseObject)
    })

    test('should return 500 when service throws error', async () => {
      // Arrange
      const error = new Error('Database connection failed')
      getAssessment.mockRejectedValue(error)

      // Act
      const result = await standardsController.getAssessmentData(
        mockRequest,
        mockH
      )

      // Assert
      expect(getAssessment).toHaveBeenCalledWith(
        'project-123',
        'std-1',
        'prof-1',
        mockRequest
      )
      expect(mockRequest.logger.error).toHaveBeenCalledWith(
        {
          error,
          projectId: 'project-123',
          standardId: 'std-1',
          professionId: 'prof-1'
        },
        'Error fetching assessment data'
      )
      expect(mockH.response).toHaveBeenCalledWith()
      expect(mockResponseObject.code).toHaveBeenCalledWith(500)
      expect(result).toBe(mockResponseObject)
    })

    test('should handle different parameter formats', async () => {
      // Arrange
      const customRequest = {
        ...mockRequest,
        params: {
          id: 'different-project-id',
          standardId: 'different-standard',
          professionId: 'different-profession'
        }
      }

      const mockAssessment = {
        id: 'assessment-456',
        status: 'GREEN',
        commentary: 'All good!',
        lastUpdated: '2023-02-01T15:30:00Z'
      }

      getAssessment.mockResolvedValue(mockAssessment)

      // Act
      const result = await standardsController.getAssessmentData(
        customRequest,
        mockH
      )

      // Assert
      expect(getAssessment).toHaveBeenCalledWith(
        'different-project-id',
        'different-standard',
        'different-profession',
        customRequest
      )
      expect(mockH.response).toHaveBeenCalledWith(mockAssessment)
      expect(mockResponseObject.code).toHaveBeenCalledWith(200)
      expect(result).toBe(mockResponseObject)
    })

    test('should handle assessment with empty commentary', async () => {
      // Arrange
      const mockAssessment = {
        id: 'assessment-789',
        projectId: 'project-123',
        standardId: 'std-1',
        professionId: 'prof-1',
        status: 'TBC',
        commentary: '',
        lastUpdated: '2023-03-01T12:00:00Z'
      }

      getAssessment.mockResolvedValue(mockAssessment)

      // Act
      const result = await standardsController.getAssessmentData(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.response).toHaveBeenCalledWith(mockAssessment)
      expect(mockResponseObject.code).toHaveBeenCalledWith(200)
      expect(result).toBe(mockResponseObject)
    })

    test('should handle assessment with null commentary', async () => {
      // Arrange
      const mockAssessment = {
        id: 'assessment-999',
        projectId: 'project-123',
        standardId: 'std-1',
        professionId: 'prof-1',
        status: 'AMBER',
        commentary: null,
        lastUpdated: '2023-04-01T09:15:00Z'
      }

      getAssessment.mockResolvedValue(mockAssessment)

      // Act
      const result = await standardsController.getAssessmentData(
        mockRequest,
        mockH
      )

      // Assert
      expect(mockH.response).toHaveBeenCalledWith(mockAssessment)
      expect(mockResponseObject.code).toHaveBeenCalledWith(200)
      expect(result).toBe(mockResponseObject)
    })
  })
})
