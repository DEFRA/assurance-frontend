import { standardsController } from './controller.js'
import {
  getProjectById,
  getStandardHistory,
  updateAssessment,
  getAssessmentHistory,
  archiveAssessmentHistoryEntry
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
})
