import { adminController } from './controller.js'
import {
  getServiceStandards,
  getAllServiceStandards,
  getServiceStandardById,
  createServiceStandard,
  updateServiceStandard,
  deleteServiceStandard,
  restoreServiceStandard
} from '~/src/server/services/service-standards.js'
import {
  getProjects,
  getProjectById,
  deleteProject
} from '~/src/server/services/projects.js'
import {
  getProfessions,
  getAllProfessions,
  getProfessionById,
  createProfession,
  updateProfession,
  deleteProfession,
  restoreProfession
} from '~/src/server/services/professions.js'
import {
  getDeliveryGroups,
  getAllDeliveryGroups,
  getDeliveryGroupById,
  createDeliveryGroup,
  updateDeliveryGroup,
  deleteDeliveryGroup,
  restoreDeliveryGroup
} from '~/src/server/services/delivery-groups.js'
import {
  getDeliveryPartners,
  getAllDeliveryPartners,
  getDeliveryPartnerById,
  createDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  restoreDeliveryPartner
} from '~/src/server/services/delivery-partners.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProfessions } from '~/src/server/data/professions.js'
import { config } from '~/src/config/config.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'

// Mock logger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

// Mock dependencies
jest.mock('~/src/server/services/service-standards.js')
jest.mock('~/src/server/services/projects.js')
jest.mock('~/src/server/services/professions.js')
jest.mock('~/src/server/services/delivery-groups.js')
jest.mock('~/src/server/services/delivery-partners.js')
jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js')
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

describe('Admin controller', () => {
  let mockRequest
  let mockH
  let mockAuthedFetch

  // Mock projects data for testing
  const mockProjects = [
    { id: 'project-1', name: 'Test Project 1', phase: 'Discovery' },
    { id: 'project-2', name: 'Test Project 2', phase: 'Alpha' }
  ]

  // Mock delivery groups data for testing
  const mockDeliveryGroups = [
    {
      id: 'delivery-group-3',
      name: 'DevOps and Infrastructure',
      isActive: false,
      createdAt: '2024-01-17T14:15:00.000Z',
      updatedAt: '2024-01-18T09:20:00.000Z'
    },
    {
      id: 'delivery-group-2',
      name: 'Backend Services Team',
      isActive: true,
      createdAt: '2024-01-16T10:30:00.000Z',
      updatedAt: '2024-01-16T10:30:00.000Z'
    },
    {
      id: 'delivery-group-1',
      name: 'Frontend Development Team',
      isActive: true,
      createdAt: '2024-01-15T09:00:00.000Z',
      updatedAt: '2024-01-15T09:00:00.000Z'
    }
  ]

  // Mock delivery partners data for testing
  const mockDeliveryPartners = [
    {
      id: 'delivery-partner-4',
      name: 'CloudFirst Technologies',
      isActive: true,
      createdAt: '2024-01-18T13:10:00.000Z',
      updatedAt: '2024-01-18T13:10:00.000Z'
    },
    {
      id: 'delivery-partner-3',
      name: 'Digital Solutions Partnership',
      isActive: false,
      createdAt: '2024-01-14T16:20:00.000Z',
      updatedAt: '2024-01-19T10:15:00.000Z'
    },
    {
      id: 'delivery-partner-2',
      name: 'TechFlow Consulting',
      isActive: true,
      createdAt: '2024-01-12T11:45:00.000Z',
      updatedAt: '2024-01-12T11:45:00.000Z'
    },
    {
      id: 'delivery-partner-1',
      name: 'Acme Solutions Ltd',
      isActive: true,
      createdAt: '2024-01-10T08:30:00.000Z',
      updatedAt: '2024-01-10T08:30:00.000Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock request and response objects
    mockRequest = {
      query: { notification: 'Test notification' },
      payload: {},
      params: {},
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      }
    }

    mockH = {
      view: jest.fn(),
      redirect: jest.fn()
    }

    // Set up default config mock
    config.get.mockImplementation((key) => {
      switch (key) {
        case 'api.version':
          return 'v1.0'
        case 'env':
          return 'test'
        default:
          return undefined
      }
    })

    // Mock authed fetch decorator
    mockAuthedFetch = jest.fn()
    authedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Mock service functions
    getServiceStandards.mockResolvedValue(defaultServiceStandards)
    getAllServiceStandards.mockResolvedValue(defaultServiceStandards)
    getServiceStandardById.mockResolvedValue(null)
    createServiceStandard.mockResolvedValue({})
    updateServiceStandard.mockResolvedValue({})
    deleteServiceStandard.mockResolvedValue(true)
    restoreServiceStandard.mockResolvedValue(true)

    getProjects.mockResolvedValue(mockProjects)
    getProjectById.mockResolvedValue(null)
    deleteProject.mockResolvedValue(true)

    getProfessions.mockResolvedValue(defaultProfessions)
    getAllProfessions.mockResolvedValue(defaultProfessions)
    getProfessionById.mockResolvedValue(null)
    createProfession.mockResolvedValue({})
    updateProfession.mockResolvedValue({})
    deleteProfession.mockResolvedValue(true)
    restoreProfession.mockResolvedValue(true)

    getDeliveryGroups.mockResolvedValue(mockDeliveryGroups)
    getAllDeliveryGroups.mockResolvedValue(mockDeliveryGroups)
    getDeliveryGroupById.mockResolvedValue(null)
    createDeliveryGroup.mockResolvedValue({})
    updateDeliveryGroup.mockResolvedValue({})
    deleteDeliveryGroup.mockResolvedValue(true)
    restoreDeliveryGroup.mockResolvedValue(true)

    getDeliveryPartners.mockResolvedValue(mockDeliveryPartners)
    getAllDeliveryPartners.mockResolvedValue(mockDeliveryPartners)
    getDeliveryPartnerById.mockResolvedValue(null)
    createDeliveryPartner.mockResolvedValue({})
    updateDeliveryPartner.mockResolvedValue({})
    deleteDeliveryPartner.mockResolvedValue(true)
    restoreDeliveryPartner.mockResolvedValue(true)
  })

  // Add tests for helper functions
  describe('Helper Functions Coverage', () => {
    describe('fetchStandardsData scenarios', () => {
      it('should handle standards API error and return defaults', async () => {
        // Arrange
        getServiceStandards.mockRejectedValue(new Error('Standards API Error'))
        getAllServiceStandards.mockRejectedValue(
          new Error('All Standards API Error')
        )

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert - should render view with default standards despite API errors
        expect(mockH.view).toHaveBeenCalledWith('admin/index', {
          pageTitle: 'Data Management',
          heading: 'Data Management',
          standardsCount: defaultServiceStandards.length,
          projectsCount: mockProjects.length,
          professionsCount: defaultProfessions.length,
          projects: mockProjects,
          standards: defaultServiceStandards,
          professions: defaultProfessions,
          deliveryGroups: mockDeliveryGroups,
          deliveryPartners: mockDeliveryPartners,
          notification: 'Test notification',
          isTestEnvironment: true,
          isDevelopment: false
        })
        expect(mockRequest.logger.warn).toHaveBeenCalledWith(
          { error: expect.any(Error) },
          'Could not fetch standards from API, using defaults'
        )
      })

      it('should handle partial standards API errors', async () => {
        // Arrange
        getServiceStandards.mockResolvedValue([
          { id: 'std-1', name: 'Standard 1' }
        ])
        getAllServiceStandards.mockRejectedValue(
          new Error('All Standards API Error')
        )

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert - should use defaults for allStandards when getAllServiceStandards fails
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            standards: defaultServiceStandards,
            standardsCount: defaultServiceStandards.length, // Uses default when getAllServiceStandards fails
            notification: 'Test notification'
          })
        )
        expect(mockRequest.logger.warn).toHaveBeenCalledWith(
          { error: expect.any(Error) },
          'Could not fetch standards from API, using defaults'
        )
      })
    })

    describe('fetchProjectsData scenarios', () => {
      it('should handle projects API error and throw Boom error', async () => {
        // Arrange
        const projectsError = new Error('Projects API Error')
        getProjects.mockRejectedValue(projectsError)

        // Act & Assert
        await expect(adminController.get(mockRequest, mockH)).rejects.toThrow()
        expect(mockRequest.logger.error).toHaveBeenCalledWith(
          { error: projectsError },
          'Error fetching projects'
        )
      })

      it('should handle null projects response', async () => {
        // Arrange
        getProjects.mockResolvedValue(null)

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert - should handle null gracefully
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            projects: [],
            projectsCount: 0
          })
        )
      })
    })

    describe('fetchProfessionsData scenarios', () => {
      it('should handle professions API error and return defaults', async () => {
        // Arrange
        getProfessions.mockRejectedValue(new Error('Professions API Error'))
        getAllProfessions.mockRejectedValue(
          new Error('All Professions API Error')
        )

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert - should render view with default professions despite API errors
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            professions: defaultProfessions,
            professionsCount: defaultProfessions.length
          })
        )
        expect(mockRequest.logger.error).toHaveBeenCalledWith(
          { error: expect.any(Error) },
          'Error fetching professions'
        )
      })

      it('should handle partial professions API errors', async () => {
        // Arrange
        getProfessions.mockResolvedValue([
          { id: 'prof-1', name: 'Profession 1' }
        ])
        getAllProfessions.mockRejectedValue(
          new Error('All Professions API Error')
        )

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert - should use defaults for allProfessions when getAllProfessions fails
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            professions: defaultProfessions,
            professionsCount: defaultProfessions.length, // Uses default when getAllProfessions fails
            notification: 'Test notification'
          })
        )
        expect(mockRequest.logger.error).toHaveBeenCalledWith(
          { error: expect.any(Error) },
          'Error fetching professions'
        )
      })
    })

    describe('getEnvironmentFlags scenarios', () => {
      it('should handle development environment', async () => {
        // Arrange - temporarily override env for this test
        const originalMock = config.get.getMockImplementation()
        config.get.mockImplementation((key) => {
          if (key === 'env') return 'development'
          if (key === 'api.version') return 'v1.0'
          return undefined
        })

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            isTestEnvironment: false,
            isDevelopment: true
          })
        )

        // Restore original mock
        config.get.mockImplementation(originalMock)
      })

      it('should handle production environment', async () => {
        // Arrange - temporarily override env for this test
        const originalMock = config.get.getMockImplementation()
        config.get.mockImplementation((key) => {
          if (key === 'env') return 'production'
          if (key === 'api.version') return 'v1.0'
          return undefined
        })

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            isTestEnvironment: false,
            isDevelopment: false
          })
        )

        // Restore original mock
        config.get.mockImplementation(originalMock)
      })

      it('should handle test environment', async () => {
        // Arrange - use default test environment from beforeEach

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            isTestEnvironment: true,
            isDevelopment: false
          })
        )
      })

      it('should handle undefined config', async () => {
        // Arrange - temporarily override to return undefined
        const originalMock = config.get.getMockImplementation()
        config.get.mockImplementation((key) => {
          if (key === 'api.version') return 'v1.0'
          return undefined
        })

        // Act
        await adminController.get(mockRequest, mockH)

        // Assert
        expect(mockH.view).toHaveBeenCalledWith(
          'admin/index',
          expect.objectContaining({
            isTestEnvironment: false,
            isDevelopment: false
          })
        )

        // Restore original mock
        config.get.mockImplementation(originalMock)
      })
    })
  })

  describe('get', () => {
    it('should return admin dashboard view with counts', async () => {
      // Arrange
      getServiceStandards.mockResolvedValue(defaultServiceStandards)
      getProjects.mockResolvedValue(mockProjects)
      getProfessions.mockResolvedValue(defaultProfessions)

      // Act
      await adminController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: defaultServiceStandards.length,
        projectsCount: mockProjects.length,
        professionsCount: defaultProfessions.length,
        projects: mockProjects,
        standards: defaultServiceStandards,
        professions: defaultProfessions,
        deliveryGroups: mockDeliveryGroups,
        deliveryPartners: mockDeliveryPartners,
        notification: 'Test notification',
        isTestEnvironment: true,
        isDevelopment: false
      })
    })

    it('should handle API errors gracefully', async () => {
      // Arrange - Set up errors from various services
      getServiceStandards.mockRejectedValue(new Error('Standards API Error'))
      getProjects.mockRejectedValue(new Error('Projects API Error'))
      getProfessions.mockRejectedValue(new Error('Professions API Error'))

      // Act & Assert - Should throw Boom error due to projects API error
      await expect(adminController.get(mockRequest, mockH)).rejects.toThrow()

      // Assert that h.view was never called due to the error
      expect(mockH.view).not.toHaveBeenCalled()
    })
  })

  describe('deleteProfessions', () => {
    it('should delete all professions and redirect', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.deleteProfessions(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/professions/deleteAll',
        {
          method: 'POST'
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions deleted successfully'
      )
    })

    it('should handle errors', async () => {
      // Arrange
      mockAuthedFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.deleteProfessions(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to delete professions'
      )
    })
  })

  describe('deleteStandards', () => {
    it('should delete standards and redirect', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.deleteStandards(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/servicestandards/deleteAll',
        {
          method: 'POST'
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards deleted successfully'
      )
    })

    it('should handle deletion error', async () => {
      // Arrange
      mockAuthedFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.deleteStandards(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to delete standards'
      )
    })
  })

  describe('confirmDeleteProject', () => {
    it('should show confirmation page', async () => {
      // Arrange
      mockRequest.params = { id: '123' }
      mockRequest.method = 'get'
      getProjectById.mockResolvedValue({ name: 'Test Project' })

      // Act
      await adminController.confirmDeleteProject(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/confirm-delete', {
        pageTitle: 'Confirm Delivery Deletion',
        heading: 'Delete Delivery',
        message: 'Are you sure you want to delete the project "Test Project"?',
        confirmUrl: '/admin/projects/123/delete',
        cancelUrl: '/projects/123',
        backLink: '/projects/123'
      })
    })

    it('should handle project not found', async () => {
      // Arrange
      mockRequest.params = { id: '123' }
      mockRequest.method = 'get'
      getProjectById.mockResolvedValue(null)

      // Act
      await adminController.confirmDeleteProject(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/confirm-delete', {
        pageTitle: 'Confirm Delivery Deletion',
        heading: 'Delete Delivery',
        message: 'Are you sure you want to delete the project "this project"?',
        confirmUrl: '/admin/projects/123/delete',
        cancelUrl: '/projects/123',
        backLink: '/projects/123'
      })
    })

    it('should handle fetch error', async () => {
      // Arrange
      mockRequest.params = { id: '123' }
      mockRequest.method = 'get'
      getProjectById.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.confirmDeleteProject(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/confirm-delete', {
        pageTitle: 'Confirm Delivery Deletion',
        heading: 'Delete Delivery',
        message: 'Are you sure you want to delete the project "this project"?',
        confirmUrl: '/admin/projects/123/delete',
        cancelUrl: '/projects/123',
        backLink: '/projects/123'
      })
    })

    it('should proceed with deletion when confirmed', async () => {
      // Arrange
      mockRequest.params = { id: '123' }
      mockRequest.method = 'post'
      mockRequest.payload = { confirmed: 'true' }
      deleteProject.mockResolvedValue(true)

      // Act
      await adminController.confirmDeleteProject(mockRequest, mockH)

      // Assert
      expect(deleteProject).toHaveBeenCalledWith('123', mockRequest)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery deleted successfully'
      )
    })
  })

  describe('confirmDeleteAllStandards', () => {
    it('should show confirmation page', async () => {
      // Arrange
      mockRequest.method = 'get'

      // Act
      await adminController.confirmDeleteAllStandards(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Standards',
        heading: 'Delete All Standards',
        message:
          'Are you sure you want to delete ALL service standards? This will remove all standard definitions from the system.',
        confirmUrl: '/admin/standards/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    })

    it('should proceed with deletion when confirmed', async () => {
      // Arrange
      mockRequest.method = 'post'
      mockRequest.payload = { confirmed: 'true' }
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.confirmDeleteAllStandards(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards deleted successfully'
      )
    })
  })

  describe('confirmDeleteAllProfessions', () => {
    it('should show confirmation page', async () => {
      // Arrange
      mockRequest.method = 'get'

      // Act
      await adminController.confirmDeleteAllProfessions(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Professions',
        heading: 'Delete All Professions',
        message:
          'Are you sure you want to delete ALL professions? This will remove all profession definitions from the system.',
        confirmUrl: '/admin/professions/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    })

    it('should proceed with deletion when confirmed', async () => {
      // Arrange
      mockRequest.method = 'post'
      mockRequest.payload = { confirmed: 'true' }
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.confirmDeleteAllProfessions(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions deleted successfully'
      )
    })
  })

  describe('seedProfessions', () => {
    it('should seed professions and redirect', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.seedProfessions(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/professions/seed',
        {
          method: 'POST',
          body: JSON.stringify(defaultProfessions)
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions seeded successfully'
      )
    })

    it('should handle errors', async () => {
      // Arrange
      mockAuthedFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.seedProfessions(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed professions'
      )
    })
  })

  describe('confirmDeleteProject - edge cases', () => {
    test('should handle failed project fetch for confirmation page', async () => {
      // Arrange
      getProjectById.mockRejectedValue(new Error('Database error'))

      // Act
      await adminController.confirmDeleteProject(
        {
          params: { id: '123' },
          method: 'get',
          logger: { warn: jest.fn(), error: jest.fn() }
        },
        mockH
      )

      // Assert - should continue with generic name
      expect(mockH.view).toHaveBeenCalledWith(
        'admin/confirm-delete',
        expect.objectContaining({
          message: 'Are you sure you want to delete the project "this project"?'
        })
      )
    })

    test('should handle null project for confirmation page', async () => {
      // Arrange
      getProjectById.mockResolvedValue(null)

      // Act
      await adminController.confirmDeleteProject(
        {
          params: { id: '123' },
          method: 'get',
          logger: { warn: jest.fn(), error: jest.fn() }
        },
        mockH
      )

      // Assert - should use fallback name
      expect(mockH.view).toHaveBeenCalledWith(
        'admin/confirm-delete',
        expect.objectContaining({
          message: 'Are you sure you want to delete the project "this project"?'
        })
      )
    })

    test('should handle general error in confirmation flow', async () => {
      // Arrange - simulate a configuration or template error
      mockH.view.mockImplementation(() => {
        throw new Error('Template error')
      })

      // Act
      await adminController.confirmDeleteProject(
        {
          params: { id: '123' },
          method: 'get',
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to show delete confirmation'
      )
    })

    test('should handle POST confirmation with ID missing', async () => {
      // Arrange
      const mockRequest = {
        params: { id: '' }, // Empty ID
        method: 'post',
        payload: { confirmed: 'true' },
        logger: { info: jest.fn(), error: jest.fn() }
      }

      deleteProject.mockResolvedValue(true)

      // Act
      await adminController.confirmDeleteProject(mockRequest, mockH)

      // Assert - should still try to delete with empty ID
      expect(deleteProject).toHaveBeenCalledWith('', mockRequest)
    })
  })

  describe('confirmDeleteAllStandards - POST handling', () => {
    test('should proceed with deletion when confirmed=true', async () => {
      // Arrange
      const mockRequest = {
        method: 'post',
        payload: { confirmed: 'true' },
        logger: { info: jest.fn(), error: jest.fn() }
      }

      const mockAuthedFetch = jest.fn().mockResolvedValue({})
      authedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Act
      await adminController.confirmDeleteAllStandards(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/servicestandards/deleteAll',
        {
          method: 'POST'
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Standards deleted successfully'
      )
    })

    test('should handle errors in confirmDeleteAllStandards', async () => {
      // Arrange - simulate error in view rendering
      mockH.view.mockImplementation(() => {
        throw new Error('View error')
      })

      // Act
      await adminController.confirmDeleteAllStandards(
        {
          method: 'get',
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to show delete confirmation'
      )
    })
  })

  describe('confirmDeleteAllProfessions - POST handling', () => {
    test('should proceed with deletion when confirmed=true', async () => {
      // Arrange
      const mockRequest = {
        method: 'post',
        payload: { confirmed: 'true' },
        logger: { info: jest.fn(), error: jest.fn() }
      }

      const mockAuthedFetch = jest.fn().mockResolvedValue({})
      authedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

      // Act
      await adminController.confirmDeleteAllProfessions(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/professions/deleteAll',
        {
          method: 'POST'
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions deleted successfully'
      )
    })

    test('should handle errors in confirmDeleteAllProfessions', async () => {
      // Arrange - simulate error in view rendering
      mockH.view.mockImplementation(() => {
        throw new Error('View error')
      })

      // Act
      await adminController.confirmDeleteAllProfessions(
        {
          method: 'get',
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to show delete confirmation'
      )
    })
  })

  describe('deleteProject - edge cases', () => {
    test('should handle null result from deleteProject', async () => {
      // Arrange
      deleteProject.mockResolvedValue(null)

      // Act
      await adminController.deleteProject(
        {
          params: { id: '123' },
          logger: { info: jest.fn(), warn: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery not found'
      )
    })

    test('should handle false result from deleteProject', async () => {
      // Arrange
      deleteProject.mockResolvedValue(false)

      // Act
      await adminController.deleteProject(
        {
          params: { id: '123' },
          logger: { info: jest.fn(), warn: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery not found'
      )
    })
  })

  describe('seedProfessions - environment restrictions', () => {
    test('should seed professions in development environment', async () => {
      // Arrange
      config.get.mockImplementation((key) => {
        if (key === 'api.version') {
          return 'v1.0' // Use versioned endpoint for this test
        }
        return 'development'
      })
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.seedProfessions(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/professions/seed',
        {
          method: 'POST',
          body: JSON.stringify(defaultProfessions)
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions seeded successfully'
      )
    })
  })

  describe('get - API error scenarios', () => {
    test('should handle mixed API errors', async () => {
      // Arrange
      getProjects.mockResolvedValue([]) // Don't reject, just return empty
      getProfessions.mockResolvedValue([])
      getServiceStandards.mockResolvedValue([])

      // Act
      await adminController.get(
        {
          query: { notification: 'Test notification' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert - should still render view with fallback data
      expect(mockH.view).toHaveBeenCalledWith(
        'admin/index',
        expect.objectContaining({
          projectsCount: 0,
          professionsCount: 0,
          standardsCount: 0
        })
      )
    })

    test('should handle null responses from all APIs', async () => {
      // Arrange
      getProjects.mockResolvedValue(null)
      getProfessions.mockResolvedValue(null)
      getServiceStandards.mockResolvedValue(null)

      // Act
      await adminController.get(
        {
          query: { notification: 'Test notification' },
          logger: { error: jest.fn() }
        },
        mockH
      )

      // Assert
      expect(mockH.view).toHaveBeenCalledWith(
        'admin/index',
        expect.objectContaining({
          projectsCount: 0,
          professionsCount: 0,
          standardsCount: 0
        })
      )
    })
  })

  describe('createServiceStandard', () => {
    it('should create service standard and redirect', async () => {
      // Arrange
      mockRequest.payload = {
        number: '15',
        name: 'Test Standard',
        description: 'A test service standard'
      }

      // Act
      await adminController.createServiceStandard(mockRequest, mockH)

      // Assert
      expect(createServiceStandard).toHaveBeenCalledWith(
        {
          id: 'standard-15',
          number: 15,
          name: 'Test Standard',
          description: 'A test service standard',
          guidance: ''
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Service standard created successfully&tab=standards'
      )
    })

    it('should handle validation errors', async () => {
      // Arrange
      mockRequest.payload = {
        number: '',
        name: 'Test Standard'
        // description missing
      }

      // Act
      await adminController.createServiceStandard(mockRequest, mockH)

      // Assert
      expect(createServiceStandard).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Number, name and description are required&tab=standards'
      )
    })

    it('should handle creation errors', async () => {
      // Arrange
      mockRequest.payload = {
        number: '15',
        name: 'Test Standard',
        description: 'A test service standard'
      }
      createServiceStandard.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.createServiceStandard(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to create service standard&tab=standards'
      )
    })
  })

  describe('seedStandards', () => {
    it('should seed standards and redirect', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.seedStandards(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith(
        '/api/v1.0/servicestandards/seed',
        {
          method: 'POST',
          body: JSON.stringify(defaultServiceStandards)
        }
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Service standards seeded successfully'
      )
    })

    it('should handle seeding errors', async () => {
      // Arrange
      mockAuthedFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.seedStandards(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed service standards'
      )
    })
  })

  describe('createProfession', () => {
    it('should create profession and redirect', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Test Profession',
        description: 'A test profession'
      }

      // Act
      await adminController.createProfession(mockRequest, mockH)

      // Assert
      expect(createProfession).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: 'test-profession',
          Name: 'Test Profession',
          Description: 'A test profession',
          IsActive: true
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Profession created successfully&tab=professions'
      )
    })

    it('should handle validation errors', async () => {
      // Arrange
      mockRequest.payload = {
        name: '',
        description: 'A test profession'
      }

      // Act
      await adminController.createProfession(mockRequest, mockH)

      // Assert
      expect(createProfession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Name and description are required&tab=professions'
      )
    })

    it('should handle creation errors', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Test Profession',
        description: 'A test profession'
      }
      createProfession.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.createProfession(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to create profession&tab=professions'
      )
    })
  })

  describe('updateProfession', () => {
    it('should update profession and redirect', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'prof-1',
        name: 'Updated Profession'
      }

      // Mock the existing profession
      const existingProfession = {
        Id: 'prof-1',
        Name: 'Original Profession',
        Description: 'Original Description',
        IsActive: true,
        CreatedAt: '2023-01-01T00:00:00.000Z',
        UpdatedAt: '2023-01-01T00:00:00.000Z'
      }
      getProfessionById.mockResolvedValue(existingProfession)

      // Act
      await adminController.updateProfession(mockRequest, mockH)

      // Assert
      expect(getProfessionById).toHaveBeenCalledWith('prof-1', mockRequest)
      expect(updateProfession).toHaveBeenCalledWith(
        'prof-1',
        expect.objectContaining({
          Id: 'prof-1',
          Name: 'Updated Profession',
          Description: 'Original Description',
          IsActive: true
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Profession updated successfully&tab=professions'
      )
    })

    it('should handle validation errors', async () => {
      // Arrange
      mockRequest.payload = {
        id: '',
        name: 'Updated Profession'
      }

      // Act
      await adminController.updateProfession(mockRequest, mockH)

      // Assert
      expect(updateProfession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Please select a profession and enter a new name&tab=professions'
      )
    })

    it('should handle update errors', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'prof-1',
        name: 'Updated Profession'
      }

      // Mock existing profession fetch
      const existingProfession = {
        Id: 'prof-1',
        Name: 'Original Profession',
        Description: 'Original Description',
        IsActive: true
      }
      getProfessionById.mockResolvedValue(existingProfession)
      updateProfession.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.updateProfession(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to update profession&tab=professions'
      )
    })

    it('should handle profession not found', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'prof-1',
        name: 'Updated Profession'
      }

      // Mock profession not found
      getProfessionById.mockResolvedValue(null)

      // Act
      await adminController.updateProfession(mockRequest, mockH)

      // Assert
      expect(getProfessionById).toHaveBeenCalledWith('prof-1', mockRequest)
      expect(updateProfession).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Profession not found&tab=professions'
      )
    })
  })

  describe('archiveProfession', () => {
    it('should archive profession and redirect', async () => {
      // Arrange
      mockRequest.params = { id: 'prof-1' }

      // Act
      await adminController.archiveProfession(mockRequest, mockH)

      // Assert
      expect(deleteProfession).toHaveBeenCalledWith('prof-1', mockRequest)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Profession archived successfully&tab=professions'
      )
    })

    it('should handle archive errors', async () => {
      // Arrange
      mockRequest.params = { id: 'prof-1' }
      deleteProfession.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.archiveProfession(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to archive profession&tab=professions'
      )
    })
  })

  describe('restoreProfession', () => {
    it('should restore profession and redirect', async () => {
      // Arrange
      mockRequest.params = { id: 'prof-1' }

      // Act
      await adminController.restoreProfession(mockRequest, mockH)

      // Assert
      expect(restoreProfession).toHaveBeenCalledWith('prof-1', mockRequest)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Profession restored successfully&tab=professions'
      )
    })

    it('should handle restore errors', async () => {
      // Arrange
      mockRequest.params = { id: 'prof-1' }
      restoreProfession.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.restoreProfession(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to restore profession&tab=professions'
      )
    })
  })

  describe('updateServiceStandard', () => {
    it('should update service standard and redirect', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'std-1',
        name: 'Updated Standard',
        description: 'Updated Description'
      }

      // Mock the existing service standard
      const existingStandard = {
        id: 'std-1',
        number: 1,
        name: 'Original Standard',
        description: 'Original Description',
        guidance: 'Original Guidance',
        isActive: true
      }

      getServiceStandardById.mockResolvedValue(existingStandard)

      // Act
      await adminController.updateServiceStandard(mockRequest, mockH)

      // Assert
      expect(getServiceStandardById).toHaveBeenCalledWith('std-1', mockRequest)
      expect(updateServiceStandard).toHaveBeenCalledWith(
        'std-1',
        expect.objectContaining({
          id: 'std-1',
          number: 1,
          name: 'Updated Standard',
          description: 'Updated Description',
          guidance: 'Original Guidance',
          isActive: true,
          updatedAt: expect.any(String)
        }),
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Service standard updated successfully&tab=standards'
      )
    })

    it('should handle validation errors', async () => {
      // Arrange
      mockRequest.payload = {
        id: '',
        name: 'Updated Standard'
      }

      // Act
      await adminController.updateServiceStandard(mockRequest, mockH)

      // Assert
      expect(getServiceStandardById).not.toHaveBeenCalled()
      expect(updateServiceStandard).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Please select a service standard and enter a new name&tab=standards'
      )
    })

    it('should handle service standard not found', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'std-1',
        name: 'Updated Standard'
      }
      getServiceStandardById.mockResolvedValue(null)

      // Act
      await adminController.updateServiceStandard(mockRequest, mockH)

      // Assert
      expect(getServiceStandardById).toHaveBeenCalledWith('std-1', mockRequest)
      expect(updateServiceStandard).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Service standard not found&tab=standards'
      )
    })

    it('should handle update errors', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'std-1',
        name: 'Updated Standard'
      }

      const existingStandard = {
        id: 'std-1',
        number: 1,
        name: 'Original Standard',
        description: 'Original Description',
        guidance: 'Original Guidance',
        isActive: true
      }

      getServiceStandardById.mockResolvedValue(existingStandard)
      updateServiceStandard.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.updateServiceStandard(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to update service standard&tab=standards'
      )
    })
  })

  describe('archiveServiceStandard', () => {
    it('should archive service standard and redirect', async () => {
      // Arrange
      mockRequest.params = { id: 'std-1' }

      // Act
      await adminController.archiveServiceStandard(mockRequest, mockH)

      // Assert
      expect(deleteServiceStandard).toHaveBeenCalledWith('std-1', mockRequest)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Service standard archived successfully&tab=standards'
      )
    })

    it('should handle archive errors', async () => {
      // Arrange
      mockRequest.params = { id: 'std-1' }
      deleteServiceStandard.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.archiveServiceStandard(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to archive service standard&tab=standards'
      )
    })
  })

  describe('restoreServiceStandard', () => {
    it('should restore service standard and redirect', async () => {
      // Arrange
      mockRequest.params = { id: 'std-1' }

      // Act
      await adminController.restoreServiceStandard(mockRequest, mockH)

      // Assert
      expect(restoreServiceStandard).toHaveBeenCalledWith('std-1', mockRequest)
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Service standard restored successfully&tab=standards'
      )
    })

    it('should handle restore errors', async () => {
      // Arrange
      mockRequest.params = { id: 'std-1' }
      restoreServiceStandard.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.restoreServiceStandard(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to restore service standard&tab=standards'
      )
    })
  })

  // Delivery Groups Tests
  describe('createDeliveryGroup', () => {
    it('should create delivery group successfully and redirect', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Frontend Team',
        lead: 'John Doe'
      }

      // Act
      await adminController.createDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(createDeliveryGroup).toHaveBeenCalledWith(
        {
          Id: 'frontend-team',
          Name: 'Frontend Team',
          Status: 'Pending',
          Lead: 'John Doe',
          Outcome: null,
          RoadmapName: null,
          RoadmapLink: null,
          IsActive: true,
          CreatedAt: expect.any(String),
          UpdatedAt: expect.any(String)
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery group created successfully&tab=delivery-groups'
      )
    })

    it('should handle missing name', async () => {
      // Arrange
      mockRequest.payload = {
        name: '',
        lead: 'John Doe'
      }

      // Act
      await adminController.createDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(createDeliveryGroup).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Name is required&tab=delivery-groups'
      )
    })

    it('should handle missing lead (should still create with empty lead)', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Backend Team'
        // lead is undefined
      }

      // Act
      await adminController.createDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(createDeliveryGroup).toHaveBeenCalledWith(
        {
          Id: 'backend-team',
          Name: 'Backend Team',
          Status: 'Pending',
          Lead: '',
          Outcome: null,
          RoadmapName: null,
          RoadmapLink: null,
          IsActive: true,
          CreatedAt: expect.any(String),
          UpdatedAt: expect.any(String)
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery group created successfully&tab=delivery-groups'
      )
    })

    it('should handle creation errors', async () => {
      // Arrange
      mockRequest.payload = {
        name: 'Test Group',
        lead: 'Test Lead'
      }
      createDeliveryGroup.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.createDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to create delivery group&tab=delivery-groups'
      )
    })
  })

  describe('updateDeliveryGroup', () => {
    it('should update delivery group name and lead successfully', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'frontend-team',
        name: 'Updated Frontend Team',
        lead: 'New Lead'
      }

      // Act
      await adminController.updateDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(updateDeliveryGroup).toHaveBeenCalledWith(
        'frontend-team',
        {
          Name: 'Updated Frontend Team',
          Lead: 'New Lead',
          Outcome: null,
          RoadmapName: null,
          RoadmapLink: null,
          UpdatedAt: expect.any(String)
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery group updated successfully&tab=delivery-groups'
      )
    })

    it('should update delivery group name only', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'frontend-team',
        name: 'Updated Frontend Team',
        lead: '' // Empty lead
      }

      // Act
      await adminController.updateDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(updateDeliveryGroup).toHaveBeenCalledWith(
        'frontend-team',
        {
          Name: 'Updated Frontend Team',
          Lead: '',
          Outcome: null,
          RoadmapName: null,
          RoadmapLink: null,
          UpdatedAt: expect.any(String)
        },
        mockRequest
      )
    })

    it('should update delivery group lead only', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'frontend-team',
        name: '', // Empty name
        lead: 'New Lead'
      }

      // Act
      await adminController.updateDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(updateDeliveryGroup).toHaveBeenCalledWith(
        'frontend-team',
        {
          Name: '',
          Lead: 'New Lead',
          Outcome: null,
          RoadmapName: null,
          RoadmapLink: null,
          UpdatedAt: expect.any(String)
        },
        mockRequest
      )
    })

    it('should handle missing id', async () => {
      // Arrange
      mockRequest.payload = {
        id: '',
        name: 'Updated Name',
        lead: 'Updated Lead'
      }

      // Act
      await adminController.updateDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(updateDeliveryGroup).not.toHaveBeenCalled()
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Please select a delivery group to update&tab=delivery-groups'
      )
    })

    it('should handle missing name and lead (now allows empty values)', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'frontend-team',
        name: '',
        lead: ''
      }

      // Act
      await adminController.updateDeliveryGroup(mockRequest, mockH)

      // Assert - With form pre-population, empty values are now allowed
      expect(updateDeliveryGroup).toHaveBeenCalledWith(
        'frontend-team',
        {
          Name: '',
          Lead: '',
          Outcome: null,
          RoadmapName: null,
          RoadmapLink: null,
          UpdatedAt: expect.any(String)
        },
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery group updated successfully&tab=delivery-groups'
      )
    })

    it('should handle update errors', async () => {
      // Arrange
      mockRequest.payload = {
        id: 'frontend-team',
        name: 'Updated Name',
        lead: 'Updated Lead'
      }
      updateDeliveryGroup.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.updateDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to update delivery group&tab=delivery-groups'
      )
    })
  })

  describe('archiveDeliveryGroup', () => {
    it('should archive delivery group and redirect', async () => {
      // Arrange
      mockRequest.params = { id: 'frontend-team' }

      // Act
      await adminController.archiveDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(deleteDeliveryGroup).toHaveBeenCalledWith(
        'frontend-team',
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery group archived successfully&tab=delivery-groups'
      )
    })

    it('should handle archive errors', async () => {
      // Arrange
      mockRequest.params = { id: 'frontend-team' }
      deleteDeliveryGroup.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.archiveDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to archive delivery group&tab=delivery-groups'
      )
    })
  })

  describe('restoreDeliveryGroup', () => {
    it('should restore delivery group and redirect', async () => {
      // Arrange
      mockRequest.params = { id: 'frontend-team' }

      // Act
      await adminController.restoreDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(restoreDeliveryGroup).toHaveBeenCalledWith(
        'frontend-team',
        mockRequest
      )
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Delivery group restored successfully&tab=delivery-groups'
      )
    })

    it('should handle restore errors', async () => {
      // Arrange
      mockRequest.params = { id: 'frontend-team' }
      restoreDeliveryGroup.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.restoreDeliveryGroup(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to restore delivery group&tab=delivery-groups'
      )
    })
  })
})
