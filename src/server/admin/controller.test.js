import { adminController } from './controller.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import {
  getProjects,
  getProjectById,
  deleteProject
} from '~/src/server/services/projects.js'
import { getProfessions } from '~/src/server/services/professions.js'
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
jest.mock('~/src/config/config.js')
jest.mock('~/src/server/common/helpers/fetch/authed-fetch-json.js')

describe('Admin controller', () => {
  let mockRequest
  let mockH
  let mockAuthedFetch

  // Mock projects data for testing
  const mockProjects = [
    { id: 'project-1', name: 'Test Project 1', phase: 'Discovery' },
    { id: 'project-2', name: 'Test Project 2', phase: 'Alpha' }
  ]

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock request object
    mockRequest = {
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      },
      query: {
        notification: 'Test notification'
      },
      auth: {
        credentials: {
          token: 'test-token'
        }
      }
    }

    // Mock response object
    mockH = {
      view: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    }

    // Mock authedFetchJsonDecorator
    mockAuthedFetch = jest.fn().mockResolvedValue({ ok: true })
    authedFetchJsonDecorator.mockReturnValue(mockAuthedFetch)

    // Mock config
    config.get = jest.fn().mockReturnValue('test')
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
        notification: 'Test notification',
        isTestEnvironment: true,
        isDevelopment: false
      })
    })

    it('should handle API errors gracefully', async () => {
      // Arrange
      getServiceStandards.mockRejectedValue(new Error('API Error'))
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
        notification: 'Test notification',
        isTestEnvironment: true,
        isDevelopment: false
      })
    })
  })

  describe('deleteProfessions', () => {
    it('should delete all professions and redirect', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.deleteProfessions(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/deleteAll', {
        method: 'POST'
      })
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
      expect(mockAuthedFetch).toHaveBeenCalledWith('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify([])
      })
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
        pageTitle: 'Confirm Project Deletion',
        heading: 'Delete Project',
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
        pageTitle: 'Confirm Project Deletion',
        heading: 'Delete Project',
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
        pageTitle: 'Confirm Project Deletion',
        heading: 'Delete Project',
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
        '/admin?notification=Project deleted successfully'
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
      config.get.mockReturnValue('development') // Override the default 'test' value
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.seedProfessions(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/seed', {
        method: 'POST',
        body: JSON.stringify(defaultProfessions)
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions seeded (dev only)'
      )
    })

    it('should handle errors', async () => {
      // Arrange
      config.get.mockReturnValue('development') // Override the default 'test' value
      mockAuthedFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.seedProfessions(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed professions (dev only)'
      )
    })
  })
})
