import { homeController } from './controller.js'

// Mocks
const mockGetProjects = jest.fn()
const mockGetProjectHistory = jest.fn()
const mockGetAssessmentHistory = jest.fn()
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}

// Mock dependencies
jest.mock('~/src/server/services/projects.js', () => ({
  getProjects: (...args) => mockGetProjects(...args),
  getProjectHistory: (...args) => mockGetProjectHistory(...args),
  getAssessmentHistory: (...args) => mockGetAssessmentHistory(...args)
}))

jest.mock('~/src/server/common/helpers/analytics.js', () => ({
  analytics: {
    trackProjectSearch: jest.fn().mockResolvedValue(undefined)
  },
  trackProjectSearch: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: mockLogger
}))

// Skip actual server creation
jest.mock('~/src/server/index.js', () => ({
  createServer: jest.fn().mockResolvedValue({
    initialize: jest.fn().mockResolvedValue({}),
    stop: jest.fn().mockResolvedValue({})
  })
}))

describe('Home Controller', () => {
  // Test data setup
  const sampleProjects = [
    {
      id: 'project-1',
      name: 'Project 1',
      status: 'RED',
      lastUpdated: '2023-01-01',
      tags: ['Portfolio: Future Farming', 'Type: Development'],
      standardsSummary: [
        {
          standardId: 'standard-1',
          professions: [
            { professionId: 'architecture' },
            { professionId: 'user-research' }
          ]
        },
        {
          standardId: 'standard-2',
          professions: [{ professionId: 'architecture' }]
        }
      ]
    },
    {
      id: 'project-2',
      name: 'Project 2',
      status: 'AMBER',
      lastUpdated: '2023-01-02',
      tags: ['Portfolio: Environmental Protection'],
      standardsSummary: [
        {
          standardId: 'standard-1',
          professions: [{ professionId: 'architecture' }]
        }
      ]
    },
    {
      id: 'project-3',
      name: 'Different Project',
      status: 'GREEN',
      lastUpdated: '2023-01-03',
      tags: ['Portfolio: Other'],
      standardsSummary: []
    },
    {
      id: 'project-4',
      name: 'TBC Project',
      status: 'TBC',
      lastUpdated: '2023-01-04',
      tags: ['Portfolio: Future Farming', 'Type: Development'],
      standardsSummary: [
        {
          standardId: 'standard-3',
          professions: [{ professionId: 'user-research' }]
        }
      ]
    }
  ]

  // Common test objects
  let mockH
  let mockRequest

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup response toolkit mock
    mockH = {
      view: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis()
    }

    // Setup request mock with defaults
    mockRequest = {
      query: {},
      auth: {
        isAuthenticated: false
      },
      logger: mockLogger
    }

    // Default mock implementations
    mockGetProjects.mockResolvedValue(sampleProjects)
    mockGetProjectHistory.mockResolvedValue([])
    mockGetAssessmentHistory.mockResolvedValue([])
  })

  afterAll(() => {
    jest.resetModules()
  })

  describe('handler', () => {
    it('should return all projects when no search query is provided', async () => {
      // Arrange - unauthenticated user by default
      mockGetProjects.mockResolvedValue(sampleProjects)

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert - Focus on key behaviors, not implementation details
      expect(mockH.view).toHaveBeenCalledWith(
        'home/index',
        expect.objectContaining({
          projects: expect.any(Array),
          projectNames: expect.arrayContaining([
            'Project 1',
            'Project 2',
            'Different Project'
          ])
        })
      )
      // Verify expected number of projects (3 for unauthenticated users - TBC hidden)
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.projects).toHaveLength(3)

      // Should not include TBC project for unauthenticated users
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(false)
    })

    it('should filter projects by name when search term is provided', async () => {
      // Arrange - Setup request with search query
      mockRequest.query = { search: 'Project 1' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Check behavior without over-specifying
      expect(viewArgs.projects).toHaveLength(1)
      expect(viewArgs.projects[0].name).toBe('Project 1')
      expect(viewArgs.searchTerm).toBe('Project 1')
      // All project names should still be available for autocomplete
      expect(viewArgs.projectNames).toHaveLength(3)
    })

    it('should perform case-insensitive search', async () => {
      // Arrange - Use lowercase search term
      mockRequest.query = { search: 'project' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // All projects with 'project' in name (case-insensitive) should be included
      // This includes "Project 1", "Project 2", and "Different Project"
      expect(viewArgs.projects).toHaveLength(3)

      // Verify all projects with "project" in their name are found
      const projectNames = viewArgs.projects.map((p) => p.name)
      expect(projectNames).toContain('Project 1')
      expect(projectNames).toContain('Project 2')
      expect(projectNames).toContain('Different Project')

      // Verify search was case-insensitive
      expect(viewArgs.searchTerm).toBe('project')
    })

    it('should return partial matches within project names', async () => {
      // Arrange - Use partial term that appears in some project names
      mockRequest.query = { search: 'Diff' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      expect(viewArgs.projects).toHaveLength(1)
      expect(viewArgs.projects[0].name).toBe('Different Project')
    })

    it('should return empty projects array when no matches found', async () => {
      // Arrange
      mockRequest.query = { search: 'non-existent-project' }

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      expect(viewArgs.projects).toEqual([])
      // Project names for autocomplete should still be available
      expect(viewArgs.projectNames).toHaveLength(3)
    })

    it('should handle authenticated users correctly', async () => {
      // Arrange
      mockRequest.auth.isAuthenticated = true

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]
      expect(viewArgs.isAuthenticated).toBe(true)
    })

    describe('error handling', () => {
      it('should throw Boom error when API fails', async () => {
        // Arrange
        const testError = new Error('API unavailable')
        mockGetProjects.mockRejectedValue(testError)

        // Act & Assert
        await expect(
          homeController.handler(mockRequest, mockH)
        ).rejects.toThrow()
        expect(mockLogger.error).toHaveBeenCalled()
      })

      it('should throw error when API returns unexpected response format', async () => {
        // Arrange - API returns null instead of array
        mockGetProjects.mockResolvedValue(null)

        // Act & Assert
        await expect(
          homeController.handler(mockRequest, mockH)
        ).rejects.toThrow()
        expect(mockLogger.error).toHaveBeenCalled()
      })

      it('should handle empty API response', async () => {
        // Arrange - API returns empty array
        mockGetProjects.mockResolvedValue([])

        // Act
        await homeController.handler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]

        expect(viewArgs.projects).toEqual([])
        expect(viewArgs.projectNames).toEqual([])
      })
    })
  })

  describe('insightsHandler', () => {
    beforeEach(() => {
      // For insights handler, user is always authenticated
      mockRequest.auth.isAuthenticated = true
    })

    it('should return all projects with analytics data when no search query is provided', async () => {
      // Arrange - Add ProjectStatus to sample projects to match real API
      const projectsWithStatus = sampleProjects.map((project) => ({
        ...project,
        projectStatus: {
          numberOfStandardsCompleted: 8,
          percentageAcrossAllStandards: 57.14,
          percentageAcrossCompletedStandards: 75.0,
          calculatedRag: 'GREEN',
          lowestRag: 'AMBER'
        },
        standardsSummary: [
          { standardId: 'std-1', aggregatedStatus: 'GREEN' },
          { standardId: 'std-2', aggregatedStatus: 'AMBER' },
          { standardId: 'std-3', aggregatedStatus: 'RED' }
        ]
      }))
      mockGetProjects.mockResolvedValue(projectsWithStatus)

      // Act
      await homeController.insightsHandler(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'home/insights',
        expect.objectContaining({
          pageTitle: 'Project Insights | Defra Digital Assurance',
          heading: 'Project Insights',
          projects: expect.any(Array),
          projectChangesByProject: expect.any(Object),
          serviceStandardChangesByProject: expect.any(Object),
          statusCounts: expect.objectContaining({
            RED: expect.any(Number),
            AMBER_RED: expect.any(Number),
            AMBER: expect.any(Number),
            GREEN_AMBER: expect.any(Number),
            GREEN: expect.any(Number),
            TBC: expect.any(Number),
            OTHER: expect.any(Number)
          }),
          isAuthenticated: true
        })
      )

      const viewArgs = mockH.view.mock.calls[0][1]

      // Should include all projects (including TBC for authenticated users)
      expect(viewArgs.projects).toHaveLength(4)

      // Check that status counts are calculated correctly
      // Based on sampleProjects: RED, AMBER, GREEN, TBC
      expect(viewArgs.statusCounts).toEqual({
        RED: 1,
        AMBER_RED: 0,
        AMBER: 1,
        GREEN_AMBER: 0,
        GREEN: 1,
        TBC: 1,
        PENDING: 0, // New status
        EXCLUDED: 0, // New status
        OTHER: 0
      })

      // Check that ProjectStatus data structure is present
      viewArgs.projects.forEach((project) => {
        expect(project).toHaveProperty('projectStatus')
        expect(project.projectStatus).toHaveProperty(
          'numberOfStandardsCompleted'
        )
        expect(project.projectStatus).toHaveProperty(
          'percentageAcrossAllStandards'
        )
        expect(project.projectStatus).toHaveProperty(
          'percentageAcrossCompletedStandards'
        )
        expect(project.projectStatus).toHaveProperty('lowestRag')
        expect(project).toHaveProperty('standardsSummary')
      })
    })

    it('should return all projects regardless of search term (search not supported on insights)', async () => {
      // Arrange
      const projectsWithStatus = sampleProjects.map((project) => ({
        ...project,
        projectStatus: {
          numberOfStandardsCompleted: 3,
          percentageAcrossAllStandards: 21.43,
          percentageAcrossCompletedStandards: 66.67,
          calculatedRag: 'AMBER',
          lowestRag: 'RED'
        },
        standardsSummary: [
          { standardId: 'std-1', aggregatedStatus: 'RED' },
          { standardId: 'std-2', aggregatedStatus: 'AMBER' },
          { standardId: 'std-3', aggregatedStatus: 'AMBER' }
        ]
      }))
      mockGetProjects.mockResolvedValue(projectsWithStatus)
      mockRequest.query = { search: 'Different' }

      // Act
      await homeController.insightsHandler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Search is not supported on insights page - should show all projects
      expect(viewArgs.projects).toHaveLength(4)
      expect(viewArgs.projects.map((p) => p.name)).toEqual([
        'Project 1',
        'Project 2',
        'Different Project',
        'TBC Project'
      ])

      // Should calculate status counts for all projects, not just filtered ones
      expect(viewArgs.statusCounts).toEqual({
        RED: 1, // Project 1 has RED status
        AMBER_RED: 0,
        AMBER: 1, // Project 2 has AMBER status
        GREEN_AMBER: 0,
        GREEN: 1, // Project 3 has GREEN status
        TBC: 1, // Project 4 has TBC status
        PENDING: 0, // New status
        EXCLUDED: 0, // New status
        OTHER: 0
      })
    })

    it('should handle projects without ProjectStatus gracefully', async () => {
      // Arrange - Projects without ProjectStatus (for backward compatibility)
      mockGetProjects.mockResolvedValue(sampleProjects)

      // Act
      await homeController.insightsHandler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should still return projects, even without ProjectStatus
      expect(viewArgs.projects).toHaveLength(4)

      // Should still calculate status counts
      expect(viewArgs.statusCounts).toEqual({
        RED: 1,
        AMBER_RED: 0,
        AMBER: 1,
        GREEN_AMBER: 0,
        GREEN: 1,
        TBC: 1,
        PENDING: 0, // New status
        EXCLUDED: 0, // New status
        OTHER: 0
      })

      // Projects should not have ProjectStatus in this test scenario
      expect(viewArgs.projects[0]).not.toHaveProperty('projectStatus')
    })

    describe('error handling', () => {
      it('should throw Boom error when API fails', async () => {
        // Arrange
        const testError = new Error('API unavailable')
        mockGetProjects.mockRejectedValue(testError)

        // Act & Assert
        await expect(
          homeController.insightsHandler(mockRequest, mockH)
        ).rejects.toThrow()
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error fetching projects for insights page'
        )
      })

      it('should handle project history fetch failures gracefully', async () => {
        // Arrange
        mockGetProjects.mockResolvedValue(sampleProjects)
        mockGetProjectHistory.mockRejectedValue(new Error('History API error'))
        mockGetAssessmentHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.projectChangesByProject).toEqual({})
        // The error is now caught and logged at the fetchAllProjectHistory level
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringMatching(/Error fetching project history for project/),
          expect.any(Error)
        )
      })

      it('should handle assessment history fetch failures gracefully', async () => {
        // Arrange
        mockGetProjects.mockResolvedValue(sampleProjects)
        mockGetProjectHistory.mockResolvedValue([])
        mockGetAssessmentHistory.mockRejectedValue(
          new Error('Assessment API error')
        )

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.serviceStandardChangesByProject).toEqual({})
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringMatching(/Error fetching assessment history/),
          expect.any(Error)
        )
      })

      it('should handle empty project history gracefully', async () => {
        // Arrange
        mockGetProjects.mockResolvedValue(sampleProjects)
        mockGetProjectHistory.mockResolvedValue([])
        mockGetAssessmentHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.projectChangesByProject).toEqual({})
        expect(viewArgs.serviceStandardChangesByProject).toEqual({})
      })

      it('should handle projects with no standards summary', async () => {
        // Arrange
        const projectsWithoutStandards = [
          {
            id: 'project-1',
            name: 'Project 1',
            status: 'RED',
            standardsSummary: []
          }
        ]
        mockGetProjects.mockResolvedValue(projectsWithoutStandards)
        mockGetProjectHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.projects).toEqual(projectsWithoutStandards)
        expect(viewArgs.serviceStandardChangesByProject).toEqual({})
      })

      it('should handle malformed history entries', async () => {
        // Arrange - Use recent dates that will pass the 7-day filter
        const now = new Date()
        const malformedHistory = [
          {
            id: '1',
            timestamp: new Date(
              now.getTime() - 3 * 24 * 60 * 60 * 1000
            ).toISOString()
          }, // No changes
          {
            id: '2',
            timestamp: new Date(
              now.getTime() - 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
            changes: {}
          }, // Empty changes
          {
            id: '3',
            timestamp: new Date(
              now.getTime() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
            changes: { status: { from: 'RED', to: 'GREEN' } }
          } // Valid
        ]
        mockGetProjects.mockResolvedValue(sampleProjects)
        mockGetProjectHistory.mockResolvedValue(malformedHistory)
        mockGetAssessmentHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        // Should only process the valid entry
        Object.values(viewArgs.projectChangesByProject).forEach((project) => {
          expect(project.changes).toHaveLength(1)
          expect(project.changes[0].changes.status).toEqual({
            from: 'RED',
            to: 'GREEN'
          })
        })
      })

      it('should handle mixed valid and invalid status values', async () => {
        // Arrange
        const projectsWithMixedStatuses = [
          { id: '1', name: 'Project 1', status: 'RED' },
          { id: '2', name: 'Project 2', status: 'INVALID_STATUS' },
          { id: '3', name: 'Project 3', status: null },
          { id: '4', name: 'Project 4', status: 'GREEN' }
        ]
        mockGetProjects.mockResolvedValue(projectsWithMixedStatuses)
        mockGetProjectHistory.mockResolvedValue([])
        mockGetAssessmentHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.statusCounts).toEqual({
          RED: 1,
          AMBER_RED: 0,
          AMBER: 0,
          GREEN_AMBER: 0,
          GREEN: 1,
          TBC: 0,
          PENDING: 0, // New status
          EXCLUDED: 0, // New status
          OTHER: 2 // INVALID_STATUS and null
        })
      })

      it('should properly limit timeline entries to 2 most recent', async () => {
        // Arrange - Use recent dates that will pass the 7-day filter
        const now = new Date()
        const multipleHistoryEntries = [
          {
            id: '1',
            timestamp: new Date(
              now.getTime() - 5 * 24 * 60 * 60 * 1000
            ).toISOString(), // 5 days ago
            changes: { status: { from: 'RED', to: 'AMBER' } }
          },
          {
            id: '2',
            timestamp: new Date(
              now.getTime() - 4 * 24 * 60 * 60 * 1000
            ).toISOString(), // 4 days ago
            changes: { status: { from: 'AMBER', to: 'GREEN' } }
          },
          {
            id: '3',
            timestamp: new Date(
              now.getTime() - 3 * 24 * 60 * 60 * 1000
            ).toISOString(), // 3 days ago
            changes: { commentary: { to: 'Updated comment' } }
          },
          {
            id: '4',
            timestamp: new Date(
              now.getTime() - 2 * 24 * 60 * 60 * 1000
            ).toISOString(), // 2 days ago
            changes: { name: { from: 'Old Name', to: 'New Name' } }
          },
          {
            id: '5',
            timestamp: new Date(
              now.getTime() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
            changes: { phase: { from: 'Alpha', to: 'Beta' } }
          }
        ]
        mockGetProjects.mockResolvedValue(sampleProjects.slice(0, 1)) // Just one project
        mockGetProjectHistory.mockResolvedValue(multipleHistoryEntries)
        mockGetAssessmentHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        const projectChanges = Object.values(
          viewArgs.projectChangesByProject
        )[0]
        expect(projectChanges.changes).toHaveLength(2)
        // Should be the 2 most recent (latest first)
        expect(projectChanges.changes[0].changes.phase).toEqual({
          from: 'Alpha',
          to: 'Beta'
        })
        expect(projectChanges.changes[1].changes.name).toEqual({
          from: 'Old Name',
          to: 'New Name'
        })
      })

      it('should handle assessment history with missing changes', async () => {
        // Arrange - Use recent dates that will pass the 7-day filter
        const now = new Date()
        const assessmentHistoryWithMissingChanges = [
          {
            id: '1',
            timestamp: new Date(
              now.getTime() - 3 * 24 * 60 * 60 * 1000
            ).toISOString()
          }, // No changes
          {
            id: '2',
            timestamp: new Date(
              now.getTime() - 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
            changes: null
          }, // Null changes
          {
            id: '3',
            timestamp: new Date(
              now.getTime() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
            changes: { status: { from: 'RED', to: 'GREEN' } }
          } // Valid
        ]
        mockGetProjects.mockResolvedValue(sampleProjects.slice(0, 1))
        mockGetProjectHistory.mockResolvedValue([])
        mockGetAssessmentHistory.mockResolvedValue(
          assessmentHistoryWithMissingChanges
        )

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        const serviceStandardChanges = Object.values(
          viewArgs.serviceStandardChangesByProject
        )[0]

        // Should have service standard changes
        expect(serviceStandardChanges).toBeDefined()

        const standardChanges = Object.values(
          serviceStandardChanges.standardChanges
        )[0]
        expect(standardChanges.changes).toHaveLength(1)
        expect(standardChanges.changes[0].changes.status).toEqual({
          from: 'RED',
          to: 'GREEN'
        })
      })

      it('should handle projects with standards but no professions', async () => {
        // Arrange
        const projectWithStandardsNoProfessions = [
          {
            id: 'project-1',
            name: 'Project 1',
            status: 'RED',
            standardsSummary: [
              {
                standardId: 'standard-1',
                professions: [] // Empty professions array
              },
              {
                standardId: 'standard-2'
                // Missing professions property
              }
            ]
          }
        ]
        mockGetProjects.mockResolvedValue(projectWithStandardsNoProfessions)
        mockGetProjectHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        expect(viewArgs.serviceStandardChangesByProject).toEqual({})
      })

      it('should handle complex timeline entries with all change types', async () => {
        // Arrange - Use recent date that will pass the 7-day filter
        const now = new Date()
        const complexHistoryEntry = {
          id: 'complex-1',
          timestamp: new Date(
            now.getTime() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(), // 1 day ago
          changedBy: 'test-user',
          changes: {
            status: { from: 'RED', to: 'GREEN' },
            commentary: { to: 'New commentary' },
            name: { from: 'Old Project', to: 'New Project' },
            phase: { from: 'Alpha', to: 'Beta' },
            tags: { from: ['old-tag'], to: ['new-tag'] }
          }
        }
        mockGetProjects.mockResolvedValue(sampleProjects.slice(0, 1))
        mockGetProjectHistory.mockResolvedValue([complexHistoryEntry])
        mockGetAssessmentHistory.mockResolvedValue([])

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        const projectChanges = Object.values(
          viewArgs.projectChangesByProject
        )[0]
        expect(projectChanges.changes).toHaveLength(1)

        const change = projectChanges.changes[0]
        expect(change.changes.status).toEqual({ from: 'RED', to: 'GREEN' })
        expect(change.changes.commentary).toEqual({ to: 'New commentary' })
        expect(change.changes.name).toEqual({
          from: 'Old Project',
          to: 'New Project'
        })
        expect(change.changes.phase).toEqual({ from: 'Alpha', to: 'Beta' })
        expect(change.changes.tags).toEqual({
          from: ['old-tag'],
          to: ['new-tag']
        })
        expect(change.changedBy).toBe('test-user')
      })

      it('should handle assessment history with both status and commentary changes', async () => {
        // Arrange - Use recent date that will pass the 7-day filter
        const now = new Date()
        const assessmentWithBothChanges = [
          {
            id: 'assessment-1',
            timestamp: new Date(
              now.getTime() - 1 * 24 * 60 * 60 * 1000
            ).toISOString(), // 1 day ago
            changedBy: 'assessor',
            changes: {
              status: { from: 'RED', to: 'AMBER' },
              commentary: { to: 'Assessment updated with new findings' }
            }
          }
        ]
        mockGetProjects.mockResolvedValue(sampleProjects.slice(0, 1))
        mockGetProjectHistory.mockResolvedValue([])
        mockGetAssessmentHistory.mockResolvedValue(assessmentWithBothChanges)

        // Act
        await homeController.insightsHandler(mockRequest, mockH)

        // Assert
        const viewArgs = mockH.view.mock.calls[0][1]
        const serviceStandardChanges = Object.values(
          viewArgs.serviceStandardChangesByProject
        )[0]
        expect(serviceStandardChanges).toBeDefined()

        const standardChanges = Object.values(
          serviceStandardChanges.standardChanges
        )[0]
        expect(standardChanges.changes).toHaveLength(1)

        const change = standardChanges.changes[0]
        expect(change.changes.status).toEqual({ from: 'RED', to: 'AMBER' })
        expect(change.changes.commentary).toEqual({
          to: 'Assessment updated with new findings'
        })
        expect(change.changedBy).toBe('assessor')
      })
    })
  })

  describe('TBC project filtering', () => {
    it('should hide TBC projects from unauthenticated users', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = false

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should not include the TBC project
      expect(viewArgs.projects).toHaveLength(3)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(false)

      // Project names should also exclude TBC project
      expect(viewArgs.projectNames).toEqual([
        'Project 1',
        'Project 2',
        'Different Project'
      ])
    })

    it('should show TBC projects to authenticated users', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = true

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should include all projects including TBC
      expect(viewArgs.projects).toHaveLength(4)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3',
        'project-4'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(true)

      // Project names should include TBC project
      expect(viewArgs.projectNames).toEqual([
        'Project 1',
        'Project 2',
        'Different Project',
        'TBC Project'
      ])
    })

    it('should filter TBC projects correctly when searching as unauthenticated user', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = false
      mockRequest.query.search = 'project' // Should match projects 1, 2, 3 but not TBC project

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should match only visible (non-TBC) projects
      expect(viewArgs.projects).toHaveLength(3)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(false)
    })

    it('should include TBC projects in search results for authenticated users', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = true
      mockRequest.query.search = 'project' // Should match all projects including TBC

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should match all projects including TBC
      expect(viewArgs.projects).toHaveLength(4)
      expect(viewArgs.projects.map((p) => p.id)).toEqual([
        'project-1',
        'project-2',
        'project-3',
        'project-4'
      ])
      expect(viewArgs.projects.some((p) => p.status === 'TBC')).toBe(true)
    })

    it('should handle search for TBC project name as unauthenticated user', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = false
      mockRequest.query.search = 'TBC Project' // Searching specifically for TBC project

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should return empty results since TBC projects are hidden
      expect(viewArgs.projects).toHaveLength(0)
    })

    it('should handle search for TBC project name as authenticated user', async () => {
      // Arrange
      mockGetProjects.mockResolvedValue(sampleProjects)
      mockRequest.auth.isAuthenticated = true
      mockRequest.query.search = 'TBC Project' // Searching specifically for TBC project

      // Act
      await homeController.handler(mockRequest, mockH)

      // Assert
      const viewArgs = mockH.view.mock.calls[0][1]

      // Should return the TBC project since user is authenticated
      expect(viewArgs.projects).toHaveLength(1)
      expect(viewArgs.projects[0].id).toBe('project-4')
      expect(viewArgs.projects[0].status).toBe('TBC')
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
