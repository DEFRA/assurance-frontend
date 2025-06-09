import { authRoutes } from './index.js'
import { authController } from './controller.js'

// Mock the controller
jest.mock('./controller.js', () => ({
  authController: {
    insufficientPermissions: jest.fn()
  }
}))

describe('Auth Routes', () => {
  let mockServer
  let registeredRoutes

  beforeEach(() => {
    jest.clearAllMocks()

    registeredRoutes = []

    mockServer = {
      route: jest.fn((routes) => {
        if (Array.isArray(routes)) {
          registeredRoutes.push(...routes)
        } else {
          registeredRoutes.push(routes)
        }
      })
    }
  })

  describe('plugin registration', () => {
    test('should register auth routes plugin with correct metadata', () => {
      expect(authRoutes.plugin.name).toBe('auth-routes')
      expect(typeof authRoutes.plugin.register).toBe('function')
    })

    test('should register insufficient permissions route', () => {
      // Act
      authRoutes.plugin.register(mockServer)

      // Assert
      expect(mockServer.route).toHaveBeenCalledTimes(1)
      expect(registeredRoutes).toHaveLength(1)

      const route = registeredRoutes[0]
      expect(route.method).toBe('GET')
      expect(route.path).toBe('/auth/insufficient-permissions')
      expect(route.handler).toBe(authController.insufficientPermissions)
      expect(route.options.auth.strategy).toBe('session')
      expect(route.options.auth.mode).toBe('required')
    })

    test('should register route with session authentication required', () => {
      // Act
      authRoutes.plugin.register(mockServer)

      // Assert
      const route = registeredRoutes[0]
      expect(route.options).toEqual({
        auth: {
          strategy: 'session',
          mode: 'required'
        }
      })
    })

    test('should call route registration with array of routes', () => {
      // Act
      authRoutes.plugin.register(mockServer)

      // Assert
      expect(mockServer.route).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'GET',
            path: '/auth/insufficient-permissions'
          })
        ])
      )
    })
  })
})
