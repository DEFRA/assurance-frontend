import { standardsController } from './controller.js'

const mockGetProjectById = jest.fn()
const mockGetServiceStandards = jest.fn()
const mockGetStandardHistory = jest.fn()
const mockUpdateAssessment = jest.fn()
const mockGetAssessmentHistory = jest.fn()
const mockArchiveAssessmentHistoryEntry = jest.fn()
const mockGetProfessions = jest.fn()

jest.mock('~/src/server/services/projects.js', () => ({
  getProjectById: (...args) => mockGetProjectById(...args),
  getStandardHistory: (...args) => mockGetStandardHistory(...args),
  updateAssessment: (...args) => mockUpdateAssessment(...args),
  getAssessmentHistory: (...args) => mockGetAssessmentHistory(...args),
  archiveAssessmentHistoryEntry: (...args) =>
    mockArchiveAssessmentHistoryEntry(...args)
}))

jest.mock('~/src/server/services/service-standards.js', () => ({
  getServiceStandards: (...args) => mockGetServiceStandards(...args)
}))

jest.mock('~/src/server/services/professions.js', () => ({
  getProfessions: (...args) => mockGetProfessions(...args)
}))

jest.mock('~/src/server/services/profession-standard-matrix.js', () => ({
  filterStandardsByProfessionAndPhase: jest.fn(),
  PROFESSION_STANDARD_MATRIX: {}
}))

describe('Standards controller', () => {
  const mockH = {
    view: jest.fn(),
    redirect: jest.fn(),
    response: jest.fn().mockImplementation((payload) => ({
      code: jest.fn().mockReturnValue(payload)
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getStandardHistory', () => {
    it('should render standard history view when project and standard are found', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: [{ standardId: '1', status: 'GREEN' }]
      }
      const mockHistory = [
        { timestamp: '2024-02-15', changes: { status: { to: 'GREEN' } } }
      ]
      mockGetProjectById.mockResolvedValue(mockProject)
      mockGetStandardHistory.mockResolvedValue(mockHistory)

      // Act
      await standardsController.getStandardHistory(
        {
          params: { id: '1', standardId: '1' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'projects/standards/views/history',
        {
          pageTitle: 'Standard 1 History | Test Project',
          heading: 'Standard 1 History',
          project: mockProject,
          standard: mockProject.standardsSummary[0],
          history: mockHistory
        }
      )
    })

    it('should redirect if project not found', async () => {
      // Arrange
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await standardsController.getStandardHistory(
        {
          params: { id: '1', standardId: '1' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project not found'
      )
    })

    it('should redirect if standard not found', async () => {
      // Arrange
      const mockProject = {
        id: '1',
        name: 'Test Project',
        standardsSummary: []
      }
      mockGetProjectById.mockResolvedValue(mockProject)

      // Act
      await standardsController.getStandardHistory(
        {
          params: { id: '1', standardId: '999' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/projects/1?notification=Standard not found'
      )
    })

    it('should handle errors', async () => {
      // Arrange
      mockGetProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        standardsController.getStandardHistory(
          {
            params: { id: '1', standardId: '1' },
            logger: { error: jest.fn() }
          },
          mockH
        )
      ).rejects.toThrow()
    })
  })

  describe('getStandards', () => {
    it('should render standards view with mapped standards', async () => {
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
      await standardsController.getStandards(
        {
          params: { id: '1' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('projects/standards/views/list', {
        pageTitle: 'Standards Progress | Test Project',
        project: mockProject,
        standards: mockStandards
      })
    })

    it('should redirect if project not found', async () => {
      // Arrange
      mockGetProjectById.mockResolvedValue(null)

      // Act
      await standardsController.getStandards(
        {
          params: { id: '1' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/?notification=Project not found'
      )
    })

    it('should handle errors', async () => {
      // Arrange
      mockGetProjectById.mockRejectedValue(new Error('Database error'))

      // Act & Assert
      await expect(
        standardsController.getStandards(
          {
            params: { id: '1' },
            logger: { error: jest.fn() }
          },
          mockH
        )
      ).rejects.toThrow()
    })
  })
})
