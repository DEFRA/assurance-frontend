import { professionsController } from './controller.js'
import Boom from '@hapi/boom'

// Mocking dependencies
const mockGetProfessions = jest.fn()
const mockGetProjects = jest.fn()
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}

jest.mock('~/src/server/services/professions.js', () => ({
  getProfessions: (...args) => mockGetProfessions(...args)
}))

jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args)
}))

// Mock Boom to check error handling
jest.mock('@hapi/boom', () => ({
  boomify: jest.fn((error, options) => {
    return {
      ...error,
      isBoom: true,
      statusCode: options?.statusCode || 500
    }
  })
}))

describe('Professions Controller', () => {
  // Sample test data
  const sampleProfessions = [
    {
      id: 'prof-1',
      name: 'delivery management',
      description: 'Delivery Management professionals'
    },
    {
      id: 'prof-2',
      name: 'software engineering',
      description: 'Software Engineering professionals'
    },
    {
      id: 'test-profession-id',
      name: 'test profession',
      description: 'Test profession for testing'
    }
  ]

  const sampleProjects = [
    {
      id: 'project-1',
      name: 'Project 1',
      status: 'GREEN',
      lastUpdated: '2023-01-01',
      professions: [
        {
          professionId: 'test-profession-id',
          status: 'RED',
          commentary: 'Needs attention'
        },
        {
          professionId: 'prof-2',
          status: 'AMBER',
          commentary: 'Some engineering challenges'
        }
      ]
    },
    {
      id: 'project-2',
      name: 'Project 2',
      status: 'AMBER',
      lastUpdated: '2023-01-02',
      professions: [
        {
          professionId: 'test-profession-id',
          status: 'AMBER_RED',
          commentary: 'Some delivery issues'
        }
      ]
    },
    {
      id: 'project-3',
      name: 'Project 3',
      status: 'RED',
      lastUpdated: '2023-01-03',
      professions: [
        {
          professionId: 'test-profession-id',
          status: 'AMBER',
          commentary: 'Minor issues'
        }
      ]
    }
  ]

  // Common test objects
  let mockH
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Set up response toolkit mock with chainable methods
    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    // Set up request mock
    mockRequest = {
      logger: mockLogger,
      auth: { isAuthenticated: true },
      params: { id: 'test-profession-id' }
    }

    // Default mock implementations
    mockGetProfessions.mockResolvedValue(sampleProfessions)
    mockGetProjects.mockResolvedValue(sampleProjects)
  })

  describe('getAll', () => {
    it('should return all professions with formatted display names', async () => {
      // Act
      await professionsController.getAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/index',
        expect.objectContaining({
          professions: expect.arrayContaining([
            expect.objectContaining({
              id: 'prof-1',
              name: 'delivery management',
              displayName: 'Delivery Management'
            }),
            expect.objectContaining({
              id: 'prof-2',
              name: 'software engineering',
              displayName: 'Software Engineering'
            })
          ])
        })
      )
    })

    it('should handle empty professions list', async () => {
      // Arrange
      mockGetProfessions.mockResolvedValue([])

      // Act
      await professionsController.getAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/index',
        expect.objectContaining({
          professions: [],
          message: expect.stringContaining('No professions found')
        })
      )
    })

    it('should handle null professions response', async () => {
      // Arrange
      mockGetProfessions.mockResolvedValue(null)

      // Act
      await professionsController.getAll(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/index',
        expect.objectContaining({
          professions: [],
          message: expect.stringContaining('No professions found')
        })
      )
    })

    it('should handle API errors', async () => {
      // Arrange
      const testError = new Error('API failure')
      mockGetProfessions.mockRejectedValue(testError)

      // Act & Assert
      await expect(
        professionsController.getAll(mockRequest, mockH)
      ).rejects.toHaveProperty('isBoom', true)

      expect(mockLogger.error).toHaveBeenCalled()
      expect(Boom.boomify).toHaveBeenCalledWith(testError, { statusCode: 500 })
    })
  })

  describe('get', () => {
    it('should return profession details with projects', async () => {
      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'professions/detail',
        expect.objectContaining({
          pageTitle: 'Test Profession overview',
          heading: 'Test Profession',
          profession: expect.objectContaining({
            id: 'test-profession-id',
            name: 'test profession',
            displayName: 'Test Profession'
          }),
          projects: expect.arrayContaining([
            expect.objectContaining({
              id: 'project-1',
              name: 'Project 1',
              professionAssessment: expect.objectContaining({
                status: 'RED',
                commentary: 'Needs attention'
              })
            })
          ]),
          summary: expect.objectContaining({
            total: 3,
            red: 1,
            amberRed: 1,
            amber: 1,
            amberGreen: 0,
            green: 0,
            notUpdated: 0
          })
        })
      )
    })

    it('should sort projects based on the profession status', async () => {
      // Arrange - projects should be sorted by status (RED first, then AMBER_RED, etc.)
      const expectedOrder = [
        expect.objectContaining({
          id: 'project-1',
          professionAssessment: expect.objectContaining({ status: 'RED' })
        }),
        expect.objectContaining({
          id: 'project-2',
          professionAssessment: expect.objectContaining({ status: 'AMBER_RED' })
        }),
        expect.objectContaining({
          id: 'project-3',
          professionAssessment: expect.objectContaining({ status: 'AMBER' })
        })
      ]

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toEqual(expectedOrder)
    })

    it('should handle profession not found', async () => {
      // Arrange
      mockGetProfessions.mockResolvedValue([])

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('errors/not-found', {
        pageTitle: 'Profession Not Found'
      })
      expect(mockH.view().code).toHaveBeenCalledWith(404)
    })

    it('should handle projects with missing professions array', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue([
        { id: 'project-1', name: 'Project 1' } // No professions array
      ])

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toEqual([])
    })

    it('should handle projects with no matching profession assessments', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue([
        {
          id: 'project-1',
          name: 'Project 1',
          professions: [
            { professionId: 'different-profession-id', status: 'GREEN' }
          ]
        }
      ])

      // Act
      await professionsController.get(mockRequest, mockH)

      // Assert
      // Get the arguments from the view call
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toEqual([])
    })

    it('should handle API errors', async () => {
      // Arrange
      const testError = new Error('API Error')
      mockGetProfessions.mockRejectedValue(testError)

      // Act & Assert
      await expect(
        professionsController.get(mockRequest, mockH)
      ).rejects.toHaveProperty('isBoom', true)

      expect(mockLogger.error).toHaveBeenCalled()
      expect(Boom.boomify).toHaveBeenCalledWith(testError, { statusCode: 500 })
    })

    it('should handle errors when fetching projects', async () => {
      // Arrange
      mockGetProjects.mockRejectedValue(new Error('Projects API Error'))

      // Act & Assert
      await expect(
        professionsController.get(mockRequest, mockH)
      ).rejects.toHaveProperty('isBoom', true)

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('Helper functions and edge cases', () => {
    describe('formatDisplayName', () => {
      it('should handle null or undefined names', async () => {
        // This tests the formatDisplayName function indirectly
        mockGetProfessions.mockResolvedValue([
          { id: 'prof-1', name: null },
          { id: 'prof-2', name: undefined },
          { id: 'prof-3', name: '' }
        ])

        // Act
        await professionsController.getAll(mockRequest, mockH)

        // Assert - should handle null/undefined names gracefully
        expect(mockH.view).toHaveBeenCalledWith(
          'professions/index',
          expect.objectContaining({
            professions: expect.arrayContaining([
              expect.objectContaining({
                id: 'prof-1',
                displayName: 'Unknown'
              }),
              expect.objectContaining({
                id: 'prof-2',
                displayName: 'Unknown'
              })
            ])
          })
        )
      })
    })

    describe('processProfessionAssessments', () => {
      it('should handle projects with null professions array', async () => {
        // Arrange
        const projectsWithNullProfessions = [
          { id: 'project-1', name: 'Project 1', professions: null },
          { id: 'project-2', name: 'Project 2', professions: undefined }
        ]
        mockGetProjects.mockResolvedValue(projectsWithNullProfessions)

        // Act
        await professionsController.get(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.projects).toEqual([])
        expect(viewArgs.summary.total).toBe(0)
      })

      it('should handle professions with different status values', async () => {
        // Arrange
        const projectsWithVariousStatuses = [
          {
            id: 'project-1',
            name: 'Project 1',
            professions: [
              { professionId: 'test-profession-id', status: 'GREEN' }
            ]
          },
          {
            id: 'project-2',
            name: 'Project 2',
            professions: [
              { professionId: 'test-profession-id', status: 'GREEN_AMBER' }
            ]
          },
          {
            id: 'project-3',
            name: 'Project 3',
            professions: [
              { professionId: 'test-profession-id', status: 'UNKNOWN_STATUS' }
            ]
          }
        ]
        mockGetProjects.mockResolvedValue(projectsWithVariousStatuses)

        // Act
        await professionsController.get(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.summary).toEqual({
          total: 3,
          red: 0,
          amberRed: 0,
          amber: 0,
          amberGreen: 1,
          green: 1,
          notUpdated: 1 // UNKNOWN_STATUS falls into this category
        })
      })
    })

    describe('buildRelevantProjects sorting', () => {
      it('should sort projects by status priority correctly', async () => {
        // Arrange
        const projectsForSorting = [
          {
            id: 'project-green',
            name: 'Green Project',
            professions: [
              { professionId: 'test-profession-id', status: 'GREEN' }
            ]
          },
          {
            id: 'project-red',
            name: 'Red Project',
            professions: [{ professionId: 'test-profession-id', status: 'RED' }]
          },
          {
            id: 'project-amber',
            name: 'Amber Project',
            professions: [
              { professionId: 'test-profession-id', status: 'AMBER' }
            ]
          },
          {
            id: 'project-tbc',
            name: 'TBC Project',
            professions: [{ professionId: 'test-profession-id', status: 'TBC' }]
          }
        ]
        mockGetProjects.mockResolvedValue(projectsForSorting)

        // Act
        await professionsController.get(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        const projectOrder = viewArgs.projects.map((p) => p.id)

        // Should be sorted: RED (0), AMBER (2), GREEN (4), TBC (5)
        expect(projectOrder).toEqual([
          'project-red',
          'project-amber',
          'project-green',
          'project-tbc'
        ])
      })
    })

    describe('Authentication scenarios', () => {
      it('should handle unauthenticated users in getAll', async () => {
        // Arrange
        const unauthenticatedRequest = {
          ...mockRequest,
          auth: { isAuthenticated: false }
        }

        // Act
        await professionsController.getAll(unauthenticatedRequest, mockH)

        // Assert
        expect(mockH.view).toHaveBeenCalledWith(
          'professions/index',
          expect.objectContaining({
            isAuthenticated: false
          })
        )
      })

      it('should handle unauthenticated users in get', async () => {
        // Arrange
        const unauthenticatedRequest = {
          ...mockRequest,
          auth: { isAuthenticated: false }
        }

        // Act
        await professionsController.get(unauthenticatedRequest, mockH)

        // Assert
        expect(mockH.view).toHaveBeenCalledWith(
          'professions/detail',
          expect.objectContaining({
            isAuthenticated: false
          })
        )
      })
    })

    describe('Error boundary cases', () => {
      it('should handle malformed profession data', async () => {
        // Arrange
        const malformedProfessions = [
          { id: 'prof-1' }, // Missing name
          { name: 'test profession' }, // Missing id
          { id: 'prof-3', name: 'valid profession' }
        ]
        mockGetProfessions.mockResolvedValue(malformedProfessions)

        // Act
        await professionsController.getAll(mockRequest, mockH)

        // Assert - should not crash and handle gracefully
        expect(mockH.view).toHaveBeenCalled()
      })

      it('should handle concurrent API failures', async () => {
        // Arrange
        mockGetProfessions.mockRejectedValue(new Error('Professions API Error'))
        mockGetProjects.mockRejectedValue(new Error('Projects API Error'))

        // Act & Assert
        await expect(
          professionsController.get(mockRequest, mockH)
        ).rejects.toHaveProperty('isBoom', true)

        // Should log the error from the profession fetch failure
        expect(mockLogger.error).toHaveBeenCalled()
      })

      it('should handle large datasets efficiently', async () => {
        // Arrange
        const largeProfessionsList = Array.from({ length: 100 }, (_, i) => ({
          id: `prof-${i}`,
          name: `profession ${i}`,
          description: `Description for profession ${i}`
        }))
        mockGetProfessions.mockResolvedValue(largeProfessionsList)

        // Act
        await professionsController.getAll(mockRequest, mockH)

        // Assert
        expect(mockH.view).toHaveBeenCalledWith(
          'professions/index',
          expect.objectContaining({
            professions: expect.arrayContaining([
              expect.objectContaining({
                displayName: expect.any(String)
              })
            ])
          })
        )

        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.professions).toHaveLength(100)
      })
    })

    describe('Complex project scenarios', () => {
      it('should handle projects with multiple professions including target', async () => {
        // Arrange
        const complexProjects = [
          {
            id: 'multi-prof-project',
            name: 'Multi Profession Project',
            professions: [
              {
                professionId: 'test-profession-id',
                status: 'RED',
                commentary: 'Target profession'
              },
              {
                professionId: 'other-prof-1',
                status: 'GREEN',
                commentary: 'Other profession 1'
              },
              {
                professionId: 'other-prof-2',
                status: 'AMBER',
                commentary: 'Other profession 2'
              }
            ]
          }
        ]
        mockGetProjects.mockResolvedValue(complexProjects)

        // Act
        await professionsController.get(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.projects).toHaveLength(1)
        expect(viewArgs.projects[0].professionAssessment).toEqual({
          professionId: 'test-profession-id',
          status: 'RED',
          commentary: 'Target profession'
        })
        expect(viewArgs.summary.total).toBe(1)
        expect(viewArgs.summary.red).toBe(1)
      })

      it('should handle projects with empty profession assessment', async () => {
        // Arrange
        const projectsWithEmptyAssessments = [
          {
            id: 'empty-project',
            name: 'Empty Assessment Project',
            professions: [
              { professionId: 'test-profession-id', status: '', commentary: '' }
            ]
          }
        ]
        mockGetProjects.mockResolvedValue(projectsWithEmptyAssessments)

        // Act
        await professionsController.get(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.summary.notUpdated).toBe(1)
      })
    })
  })
})
