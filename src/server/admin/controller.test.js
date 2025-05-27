import { adminController } from './controller.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProjects } from '~/src/server/services/projects.js'
import { getProfessions } from '~/src/server/services/professions.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProjects } from '~/src/server/data/projects.js'
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
      getProjects.mockResolvedValue(defaultProjects)
      getProfessions.mockResolvedValue(defaultProfessions)

      // Act
      await adminController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: defaultServiceStandards.length,
        projectsCount: defaultProjects.length,
        professionsCount: defaultProfessions.length,
        projects: defaultProjects,
        notification: 'Test notification',
        isTestEnvironment: true,
        isDevelopment: false
      })
    })

    it('should handle API errors gracefully', async () => {
      // Arrange
      getServiceStandards.mockRejectedValue(new Error('API Error'))
      getProjects.mockResolvedValue(defaultProjects)
      getProfessions.mockResolvedValue(defaultProfessions)

      // Act
      await adminController.get(mockRequest, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: defaultServiceStandards.length,
        projectsCount: defaultProjects.length,
        professionsCount: defaultProfessions.length,
        projects: defaultProjects,
        notification: 'Test notification',
        isTestEnvironment: true,
        isDevelopment: false
      })
    })
  })

  describe('seedProfessionsDev', () => {
    it('should seed professions and redirect', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ ok: true })

      // Act
      await adminController.seedProfessionsDev(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/deleteAll', {
        method: 'POST'
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Professions seeded (dev only)'
      )
    })

    it('should handle errors', async () => {
      // Arrange
      mockAuthedFetch.mockRejectedValue(new Error('API Error'))

      // Act
      await adminController.seedProfessionsDev(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed professions (dev only)'
      )
    })
  })

  describe('seedProjectsDev', () => {
    it('should seed projects with history and redirect', async () => {
      // Arrange
      mockAuthedFetch.mockResolvedValue({ ok: true })
      getProfessions.mockResolvedValue(defaultProfessions)

      // Act
      await adminController.seedProjectsDev(mockRequest, mockH)

      // Assert
      expect(mockAuthedFetch).toHaveBeenCalledWith('/professions/deleteAll', {
        method: 'POST'
      })
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Projects and history seeded (dev only)'
      )
    })

    it('should handle errors', async () => {
      // Arrange
      mockAuthedFetch.mockRejectedValue(new Error('API Error'))
      mockH.redirect.mockClear()

      // Act
      await adminController.seedProjectsDev(mockRequest, mockH)

      // Assert
      expect(mockH.redirect).toHaveBeenCalledWith(
        '/admin?notification=Failed to seed professions (dev only)'
      )
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
})
