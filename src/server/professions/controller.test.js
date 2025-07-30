import { professionsController } from './controller.js'
import Boom from '@hapi/boom'

let mockGetProfessions,
  mockGetProfessionById,
  mockGetProjects,
  mockGetServiceStandards
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}

jest.mock('~/src/server/services/professions.js', () => ({
  getProfessions: (...args) => mockGetProfessions(...args),
  getProfessionById: (...args) => mockGetProfessionById(...args)
}))
jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args)
}))
jest.mock('~/src/server/services/service-standards.js', () => ({
  getServiceStandards: (...args) => mockGetServiceStandards(...args)
}))

// Use a simple filterStandardsByProfessionAndPhase for tests
jest.mock('~/src/server/services/profession-standard-matrix.js', () => ({
  filterStandardsByProfessionAndPhase: (allStandards) => allStandards
}))

// Mock Boom to check error handling
jest.mock('@hapi/boom', () => ({
  boomify: jest.fn((error, options) => {
    const boomError = new Error(error.message)
    boomError.isBoom = true
    boomError.statusCode = options?.statusCode || 500
    return boomError
  })
}))

describe('Professions Controller', () => {
  let mockH, mockRequest

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProfessions = jest.fn()
    mockGetProfessionById = jest.fn()
    mockGetProjects = jest.fn()
    mockGetServiceStandards = jest.fn()
    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }
    mockRequest = {
      logger: mockLogger,
      auth: { isAuthenticated: true },
      params: { id: 'test-profession-id' }
    }
  })

  describe('getAll', () => {
    it('should return formatted professions with display names', async () => {
      const mockProfessions = [
        { id: '1', name: 'software ENGINEER' },
        { id: '2', name: 'data SCIENTIST' },
        { id: '3', name: 'product MANAGER' }
      ]
      mockGetProfessions.mockResolvedValue(mockProfessions)

      await professionsController.getAll(mockRequest, mockH)

      expect(mockGetProfessions).toHaveBeenCalledWith(mockRequest)
      expect(mockH.view).toHaveBeenCalledWith('professions/index', {
        pageTitle: 'Professions',
        heading: 'Professions',
        professions: [
          {
            id: '1',
            name: 'software ENGINEER',
            displayName: 'Software Engineer'
          },
          { id: '2', name: 'data SCIENTIST', displayName: 'Data Scientist' },
          { id: '3', name: 'product MANAGER', displayName: 'Product Manager' }
        ],
        isAuthenticated: true
      })
    })

    it('should handle empty professions list', async () => {
      mockGetProfessions.mockResolvedValue([])

      await professionsController.getAll(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/index', {
        pageTitle: 'Professions',
        heading: 'Professions',
        professions: [],
        message: 'No professions found. Please contact an administrator.',
        isAuthenticated: true
      })
    })

    it('should handle null professions', async () => {
      mockGetProfessions.mockResolvedValue(null)

      await professionsController.getAll(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/index', {
        pageTitle: 'Professions',
        heading: 'Professions',
        professions: [],
        message: 'No professions found. Please contact an administrator.',
        isAuthenticated: true
      })
    })

    it('should handle profession with no name', async () => {
      const mockProfessions = [
        { id: '1', name: null },
        { id: '2', name: '' },
        { id: '3' } // no name property
      ]
      mockGetProfessions.mockResolvedValue(mockProfessions)

      await professionsController.getAll(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/index', {
        pageTitle: 'Professions',
        heading: 'Professions',
        professions: [
          { id: '1', name: null, displayName: 'Unknown' },
          { id: '2', name: '', displayName: 'Unknown' },
          { id: '3', displayName: 'Unknown' }
        ],
        isAuthenticated: true
      })
    })

    it('should handle unauthenticated users', async () => {
      mockRequest.auth.isAuthenticated = false
      mockGetProfessions.mockResolvedValue([])

      await professionsController.getAll(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/index', {
        pageTitle: 'Professions',
        heading: 'Professions',
        professions: [],
        message: 'No professions found. Please contact an administrator.',
        isAuthenticated: false
      })
    })

    it('should handle API errors', async () => {
      const error = new Error('API Error')
      mockGetProfessions.mockRejectedValue(error)

      await expect(
        professionsController.getAll(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        statusCode: 500
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching professions'
      )
      expect(Boom.boomify).toHaveBeenCalledWith(error, { statusCode: 500 })
    })
  })

  describe('get', () => {
    const mockProfession = {
      id: 'test-profession-id',
      name: 'Software Engineer'
    }
    const mockProjects = [
      {
        id: 'project-1',
        name: 'Project One',
        phase: 'DISCOVERY',
        standardsSummary: [
          {
            standardId: 'standard-1',
            professions: [
              {
                professionId: 'test-profession-id',
                status: 'GREEN',
                commentary: 'All good'
              }
            ]
          },
          {
            standardId: 'standard-2',
            professions: [
              {
                professionId: 'test-profession-id',
                status: 'RED',
                commentary: 'Needs work'
              }
            ]
          }
        ]
      },
      {
        id: 'project-2',
        name: 'Project Two',
        phase: 'ALPHA',
        standardsSummary: [
          {
            standardId: 'standard-1',
            professions: [
              {
                professionId: 'test-profession-id',
                status: 'AMBER',
                commentary: 'In progress'
              }
            ]
          }
        ]
      }
    ]
    const mockStandards = [
      { id: 'standard-1', name: 'Standard One', number: 1 },
      { id: 'standard-2', name: 'Standard Two', number: 2 }
    ]

    it('should return profession details with standards x projects matrix and summary', async () => {
      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(mockProjects)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockGetProfessionById).toHaveBeenCalledWith(
        'test-profession-id',
        mockRequest
      )
      expect(mockGetProjects).toHaveBeenCalledWith(mockRequest)
      expect(mockGetServiceStandards).toHaveBeenCalledWith(mockRequest)

      expect(mockH.view).toHaveBeenCalledWith('professions/detail', {
        pageTitle: 'Software Engineer overview',
        heading: 'Software Engineer',
        profession: mockProfession,
        projects: mockProjects,
        standards: mockStandards,
        matrix: {
          'standard-1': {
            'project-1': { rag: 'GREEN', commentary: 'All good' },
            'project-2': { rag: 'AMBER', commentary: 'In progress' }
          },
          'standard-2': {
            'project-1': { rag: 'RED', commentary: 'Needs work' },
            'project-2': { rag: 'TBC', commentary: '' }
          }
        },
        summaryCounts: { RED: 1, AMBER: 1, GREEN: 1, PENDING: 1 },
        isAuthenticated: true
      })
    })

    it('should handle no standards for profession', async () => {
      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(mockProjects)
      mockGetServiceStandards.mockResolvedValue([])

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/detail', {
        pageTitle: 'Software Engineer overview',
        heading: 'Software Engineer',
        profession: mockProfession,
        projects: mockProjects,
        standards: [],
        matrix: {},
        summaryCounts: { RED: 0, AMBER: 0, GREEN: 0, PENDING: 0 },
        isAuthenticated: true
      })
    })

    it('should handle profession not found', async () => {
      mockGetProfessionById.mockResolvedValue(null)
      mockGetProjects.mockResolvedValue(mockProjects)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await expect(
        professionsController.get(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        statusCode: 404
      })

      expect(mockLogger.error).toHaveBeenCalledWith('Profession not found')
      expect(Boom.boomify).toHaveBeenCalledWith(expect.any(Error), {
        statusCode: 404
      })
    })

    it('should handle API errors', async () => {
      const error = new Error('API Error')
      mockGetProfessionById.mockRejectedValue(error)

      await expect(
        professionsController.get(mockRequest, mockH)
      ).rejects.toMatchObject({
        isBoom: true,
        statusCode: 500
      })

      expect(mockLogger.error).toHaveBeenCalledWith(error)
      expect(Boom.boomify).toHaveBeenCalledWith(error, { statusCode: 500 })
    })

    it('should handle projects with missing standardsSummary', async () => {
      const projectsWithoutSummary = [
        { id: 'project-1', name: 'Project One', phase: 'DISCOVERY' },
        {
          id: 'project-2',
          name: 'Project Two',
          phase: 'ALPHA',
          standardsSummary: null
        },
        {
          id: 'project-3',
          name: 'Project Three',
          phase: 'BETA',
          standardsSummary: 'invalid'
        }
      ]

      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(projectsWithoutSummary)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/detail', {
        pageTitle: 'Software Engineer overview',
        heading: 'Software Engineer',
        profession: mockProfession,
        projects: projectsWithoutSummary,
        standards: mockStandards,
        matrix: {
          'standard-1': {
            'project-1': { rag: 'TBC', commentary: '' },
            'project-2': { rag: 'TBC', commentary: '' },
            'project-3': { rag: 'TBC', commentary: '' }
          },
          'standard-2': {
            'project-1': { rag: 'TBC', commentary: '' },
            'project-2': { rag: 'TBC', commentary: '' },
            'project-3': { rag: 'TBC', commentary: '' }
          }
        },
        summaryCounts: { RED: 0, AMBER: 0, GREEN: 0, PENDING: 6 },
        isAuthenticated: true
      })
    })

    it('should handle standards with missing professions array', async () => {
      const projectsWithInvalidProfessions = [
        {
          id: 'project-1',
          name: 'Project One',
          phase: 'DISCOVERY',
          standardsSummary: [
            {
              standardId: 'standard-1',
              professions: null
            },
            {
              standardId: 'standard-2',
              professions: 'invalid'
            },
            {
              standardId: 'standard-3'
              // no professions property
            }
          ]
        }
      ]

      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(projectsWithInvalidProfessions)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/detail', {
        pageTitle: 'Software Engineer overview',
        heading: 'Software Engineer',
        profession: mockProfession,
        projects: projectsWithInvalidProfessions,
        standards: mockStandards,
        matrix: {
          'standard-1': {
            'project-1': { rag: 'TBC', commentary: '' }
          },
          'standard-2': {
            'project-1': { rag: 'TBC', commentary: '' }
          }
        },
        summaryCounts: { RED: 0, AMBER: 0, GREEN: 0, PENDING: 2 },
        isAuthenticated: true
      })
    })

    it('should handle projects with no matching profession assessments', async () => {
      const projectsWithOtherProfessions = [
        {
          id: 'project-1',
          name: 'Project One',
          phase: 'DISCOVERY',
          standardsSummary: [
            {
              standardId: 'standard-1',
              professions: [
                {
                  professionId: 'other-profession-id',
                  status: 'GREEN',
                  commentary: 'Different profession'
                }
              ]
            }
          ]
        }
      ]

      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(projectsWithOtherProfessions)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith('professions/detail', {
        pageTitle: 'Software Engineer overview',
        heading: 'Software Engineer',
        profession: mockProfession,
        projects: projectsWithOtherProfessions,
        standards: mockStandards,
        matrix: {
          'standard-1': {
            'project-1': { rag: 'TBC', commentary: '' }
          },
          'standard-2': {
            'project-1': { rag: 'TBC', commentary: '' }
          }
        },
        summaryCounts: { RED: 0, AMBER: 0, GREEN: 0, PENDING: 2 },
        isAuthenticated: true
      })
    })

    it('should handle unauthenticated users in get', async () => {
      mockRequest.auth.isAuthenticated = false
      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(mockProjects)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'professions/detail',
        expect.objectContaining({
          isAuthenticated: false
        })
      )
    })

    it('should handle projects with multiple professions including target', async () => {
      const projectsWithMultipleProfessions = [
        {
          id: 'project-1',
          name: 'Project One',
          phase: 'DISCOVERY',
          standardsSummary: [
            {
              standardId: 'standard-1',
              professions: [
                {
                  professionId: 'other-profession-id',
                  status: 'RED',
                  commentary: 'Other profession assessment'
                },
                {
                  professionId: 'test-profession-id',
                  status: 'GREEN',
                  commentary: 'Target profession assessment'
                }
              ]
            }
          ]
        }
      ]

      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(projectsWithMultipleProfessions)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'professions/detail',
        expect.objectContaining({
          matrix: {
            'standard-1': {
              'project-1': {
                rag: 'GREEN',
                commentary: 'Target profession assessment'
              }
            },
            'standard-2': {
              'project-1': { rag: 'TBC', commentary: '' }
            }
          },
          summaryCounts: { RED: 0, AMBER: 0, GREEN: 1, PENDING: 1 }
        })
      )
    })

    it('should handle projects with empty profession assessment', async () => {
      const projectsWithEmptyAssessment = [
        {
          id: 'project-1',
          name: 'Project One',
          phase: 'DISCOVERY',
          standardsSummary: [
            {
              standardId: 'standard-1',
              professions: [
                {
                  professionId: 'test-profession-id'
                  // no status or commentary
                }
              ]
            }
          ]
        }
      ]

      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(projectsWithEmptyAssessment)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'professions/detail',
        expect.objectContaining({
          matrix: {
            'standard-1': {
              'project-1': { rag: 'TBC', commentary: '' }
            },
            'standard-2': {
              'project-1': { rag: 'TBC', commentary: '' }
            }
          },
          summaryCounts: { RED: 0, AMBER: 0, GREEN: 0, PENDING: 2 }
        })
      )
    })

    it('should correctly map 5-RAG system to 3-RAG summary counts', async () => {
      const projectsWith5RagStatuses = [
        {
          id: 'project-1',
          name: 'Project One',
          phase: 'DISCOVERY',
          standardsSummary: [
            {
              standardId: 'standard-1',
              professions: [
                {
                  professionId: 'test-profession-id',
                  status: 'RED',
                  commentary: 'Red status'
                }
              ]
            },
            {
              standardId: 'standard-2',
              professions: [
                {
                  professionId: 'test-profession-id',
                  status: 'AMBER_RED',
                  commentary: 'Amber-red status'
                }
              ]
            }
          ]
        },
        {
          id: 'project-2',
          name: 'Project Two',
          phase: 'ALPHA',
          standardsSummary: [
            {
              standardId: 'standard-1',
              professions: [
                {
                  professionId: 'test-profession-id',
                  status: 'GREEN_AMBER',
                  commentary: 'Green-amber status'
                }
              ]
            },
            {
              standardId: 'standard-2',
              professions: [
                {
                  professionId: 'test-profession-id',
                  status: 'GREEN',
                  commentary: 'Green status'
                }
              ]
            }
          ]
        }
      ]

      mockGetProfessionById.mockResolvedValue(mockProfession)
      mockGetProjects.mockResolvedValue(projectsWith5RagStatuses)
      mockGetServiceStandards.mockResolvedValue(mockStandards)

      await professionsController.get(mockRequest, mockH)

      expect(mockH.view).toHaveBeenCalledWith(
        'professions/detail',
        expect.objectContaining({
          summaryCounts: { RED: 1, AMBER: 2, GREEN: 1, PENDING: 0 }
        })
      )
    })
  })
})
