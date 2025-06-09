import { plugin } from './plugin.js'
import { Issuer } from 'openid-client'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

// Mock dependencies
jest.mock('openid-client', () => ({
  Issuer: {
    discover: jest.fn()
  },
  generators: {
    state: jest.fn().mockReturnValue('mock-state'),
    codeVerifier: jest.fn().mockReturnValue('mock-code-verifier'),
    codeChallenge: jest.fn().mockReturnValue('mock-code-challenge')
  }
}))

jest.mock('node:crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-session-id')
  })
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      const configValues = {
        'azure.tenantId': 'mock-tenant-id',
        'azure.clientId': 'mock-client-id',
        'azure.clientSecret': 'mock-client-secret',
        'azure.callbackUrl': 'https://example.com/auth',
        'session.cookie.password':
          'mock-password-must-be-at-least-32-characters-long',
        'session.cookie.secure': false,
        'session.cookie.ttl': 86400000
      }
      return configValues[key] || null
    })
  }
}))

describe('Auth Plugin', () => {
  let mockServer
  let mockIssuer
  let mockOidcClient
  let mockSessionCache
  let mockAuthStateCache
  let mockH
  let mockResponse

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Create a mock response object
    mockResponse = {
      state: jest.fn().mockReturnThis(),
      unstate: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    }

    // Mock Issuer
    mockIssuer = {
      Client: jest.fn().mockImplementation(() => mockOidcClient)
    }
    Issuer.discover.mockResolvedValue(mockIssuer)

    // Mock OIDC client
    mockOidcClient = {
      authorizationUrl: jest.fn().mockReturnValue('https://mock-auth-url'),
      callbackParams: jest.fn(),
      callback: jest.fn(),
      endSessionUrl: jest.fn().mockReturnValue('https://mock-logout-url')
    }

    // Mock session cache
    mockSessionCache = {
      get: jest.fn(),
      set: jest.fn(),
      drop: jest.fn()
    }

    // Mock auth state cache
    mockAuthStateCache = {
      get: jest.fn(),
      set: jest.fn(),
      drop: jest.fn()
    }

    // Mock server
    mockServer = {
      register: jest.fn().mockResolvedValue(undefined),
      cache: jest.fn().mockReturnValue(mockAuthStateCache),
      auth: {
        strategy: jest.fn(),
        default: jest.fn()
      },
      route: jest.fn(),
      app: {
        sessionCache: mockSessionCache
      },
      info: {
        protocol: 'https'
      }
    }

    // Mock response toolkit
    mockH = {
      redirect: jest.fn().mockImplementation((url) => {
        mockResponse.redirect(url)
        return mockResponse
      }),
      view: jest
        .fn()
        .mockImplementation((template, context) => ({ template, context })),
      state: jest.fn().mockImplementation((name, value) => {
        mockResponse.state(name, value)
        return mockResponse
      }),
      unstate: jest.fn().mockImplementation((name) => {
        mockResponse.unstate(name)
        return mockResponse
      })
    }
  })

  describe('plugin registration', () => {
    test('should register the plugin and configure auth strategy', async () => {
      // Act
      await plugin.register(mockServer)

      // Assert
      expect(mockServer.register).toHaveBeenCalled()
      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'session',
        'cookie',
        expect.any(Object)
      )
      expect(mockServer.auth.default).toHaveBeenCalled()
      expect(mockServer.route).toHaveBeenCalledTimes(3) // Login, callback, and logout routes
    })

    test('should create OIDC client during initialization', async () => {
      // Act
      await plugin.register(mockServer)

      // Assert
      expect(Issuer.discover).toHaveBeenCalled()
      expect(mockIssuer.Client).toHaveBeenCalledWith({
        client_id: 'mock-client-id',
        client_secret: 'mock-client-secret',
        redirect_uris: ['https://example.com/auth'],
        response_types: ['code']
      })
      expect(mockServer.app.oidcClient).toBeDefined()
    })

    test('should handle OIDC client setup failure', async () => {
      // Arrange
      const error = new Error('OIDC setup failed')
      Issuer.discover.mockRejectedValue(error)

      // Act
      await plugin.register(mockServer)

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to setup OIDC client',
        error
      )
      expect(mockServer.app.oidcClient).toBeUndefined()
    })
  })

  describe('auth strategy validation', () => {
    test('should return invalid for auth logout path', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2] // Third argument contains the config object
      const request = { path: '/auth/logout' }
      const session = { id: 'test-session-id' }

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid for public assets', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = { path: '/public/images/logo.png' }
      const session = { id: 'test-session-id' }

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid when session id is missing', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = { path: '/protected' }
      const session = {} // No id

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid when cached session not found', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = { path: '/protected' }
      const session = { id: 'test-session-id' }

      mockSessionCache.get.mockResolvedValue(null)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid and drop expired session', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = { path: '/protected' }
      const session = { id: 'test-session-id' }

      const expiredSession = {
        user: { id: 'user-1' },
        expires: Date.now() - 1000 // Expired 1 second ago
      }
      mockSessionCache.get.mockResolvedValue(expiredSession)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
      expect(mockSessionCache.drop).toHaveBeenCalledWith('test-session-id')
    })

    test('should return valid for valid session', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = { path: '/protected' }
      const session = { id: 'test-session-id' }

      const validSession = {
        user: { id: 'user-1', email: 'test@example.com', roles: ['admin'] },
        expires: Date.now() + 3600000 // Expires in 1 hour
      }
      mockSessionCache.get.mockResolvedValue(validSession)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({
        isValid: true,
        credentials: {
          ...validSession,
          id: 'test-session-id'
        }
      })
      expect(logger.debug).toHaveBeenCalledWith(
        'Session validation successful',
        {
          sessionId: 'test-session-id',
          userId: 'user-1',
          userEmail: 'test@example.com',
          userRoles: ['admin'],
          path: '/protected'
        }
      )
    })

    test('should handle session validation errors', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = { path: '/protected' }
      const session = { id: 'test-session-id' }

      const error = new Error('Cache error')
      mockSessionCache.get.mockRejectedValue(error)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
      expect(logger.error).toHaveBeenCalledWith('Session validation error:', {
        error: 'Cache error'
      })
    })
  })

  describe('login route handler', () => {
    test('should initiate login by redirecting to auth URL', async () => {
      // Arrange
      await plugin.register(mockServer)
      const loginHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/login'
      )[0].handler

      const request = {
        query: {},
        headers: { referer: 'https://example.com/previous-page' }
      }

      // Act
      await loginHandler(request, mockH)

      // Assert
      expect(mockAuthStateCache.set).toHaveBeenCalledWith('mock-state', {
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/previous-page'
      })
      expect(mockOidcClient.authorizationUrl).toHaveBeenCalledWith({
        scope: expect.stringContaining('openid profile email'),
        state: 'mock-state',
        code_challenge: 'mock-code-challenge',
        code_challenge_method: 'S256'
      })
      expect(mockH.redirect).toHaveBeenCalledWith('https://mock-auth-url')
    })

    test('should use redirectTo query parameter if provided', async () => {
      // Arrange
      await plugin.register(mockServer)
      const loginHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/login'
      )[0].handler

      const request = {
        query: { redirectTo: '/custom-redirect' },
        headers: {}
      }

      // Act
      await loginHandler(request, mockH)

      // Assert
      expect(mockAuthStateCache.set).toHaveBeenCalledWith('mock-state', {
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/custom-redirect'
      })
    })

    test('should default to home path when on auth pages', async () => {
      // Arrange
      await plugin.register(mockServer)
      const loginHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/login'
      )[0].handler

      const request = {
        query: {},
        headers: { referer: 'https://example.com/auth/login' }
      }

      // Act
      await loginHandler(request, mockH)

      // Assert
      expect(mockAuthStateCache.set).toHaveBeenCalledWith('mock-state', {
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/'
      })
    })

    test('should handle missing OIDC client', async () => {
      // Arrange - Make OIDC client setup fail
      Issuer.discover.mockRejectedValueOnce(new Error('OIDC setup failed'))
      await plugin.register(mockServer)

      const loginHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/login'
      )[0].handler

      const request = { query: {}, headers: {} }

      // Act
      await loginHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: 'OIDC client is not properly configured'
      })
    })

    test('should handle login initialization errors', async () => {
      // Arrange
      await plugin.register(mockServer)
      const loginHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/login'
      )[0].handler

      const request = { query: {}, headers: {} }
      const error = new Error('Auth URL generation failed')
      mockOidcClient.authorizationUrl.mockImplementation(() => {
        throw error
      })

      // Act
      await loginHandler(request, mockH)

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Login initialization error:',
        error
      )
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message:
          'There was a problem initiating login: Auth URL generation failed'
      })
    })
  })

  describe('auth callback handler', () => {
    test('should handle auth callback and create session', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code', state: 'mock-state' },
        raw: { req: {} }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      mockAuthStateCache.get.mockResolvedValue({
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/dashboard'
      })

      mockOidcClient.callback.mockResolvedValue({
        id_token: 'mock-id-token',
        access_token: 'mock-access-token',
        expires_in: 3600,
        claims: () => ({
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['admin']
        })
      })

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'mock-session-id',
        expect.objectContaining({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            roles: ['admin']
          },
          token: 'mock-access-token'
        })
      )
      expect(mockAuthStateCache.drop).toHaveBeenCalledWith('mock-state')
      expect(mockH.redirect).toHaveBeenCalledWith('/dashboard')
    })

    test('should handle missing state parameter', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code' }, // Missing state
        raw: { req: {} }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code'
        // No state
      })

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: expect.stringContaining('There was a problem signing you in')
      })
      expect(logger.error).toHaveBeenCalledWith(
        'Missing state parameter',
        expect.any(Object)
      )
    })

    test('should handle invalid state parameter', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code', state: 'invalid-state' },
        raw: { req: {} }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'invalid-state'
      })

      mockAuthStateCache.get.mockResolvedValue(null) // Invalid state

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: expect.stringContaining('There was a problem signing you in')
      })
    })

    test('should handle missing OIDC client in callback', async () => {
      // Arrange - Make OIDC client setup fail
      Issuer.discover.mockRejectedValueOnce(new Error('OIDC setup failed'))
      await plugin.register(mockServer)

      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = { query: {}, raw: { req: {} } }

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: 'OIDC client is not properly configured'
      })
    })

    test('should handle token exchange errors', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code', state: 'mock-state' },
        raw: { req: {} }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      mockAuthStateCache.get.mockResolvedValue({
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/dashboard'
      })

      const tokenError = new Error('Token exchange failed')
      mockOidcClient.callback.mockRejectedValue(tokenError)

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Token exchange error',
        expect.objectContaining({
          error: 'Token exchange failed'
        })
      )
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: expect.stringContaining('There was a problem signing you in')
      })
    })

    test('should handle roles as string in token claims', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code', state: 'mock-state' },
        raw: { req: {} }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      mockAuthStateCache.get.mockResolvedValue({
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/dashboard'
      })

      mockOidcClient.callback.mockResolvedValue({
        id_token: 'mock-id-token',
        access_token: 'mock-access-token',
        expires_in: 3600,
        claims: () => ({
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: 'admin' // String instead of array
        })
      })

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'mock-session-id',
        expect.objectContaining({
          user: expect.objectContaining({
            roles: ['admin'] // Should be normalized to array
          })
        })
      )
    })

    test('should handle user without admin role', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code', state: 'mock-state' },
        raw: { req: {} }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      mockAuthStateCache.get.mockResolvedValue({
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/dashboard'
      })

      mockOidcClient.callback.mockResolvedValue({
        id_token: 'mock-id-token',
        access_token: 'mock-access-token',
        expires_in: 3600,
        claims: () => ({
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['user'] // Not admin
        })
      })

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'mock-session-id',
        expect.objectContaining({
          user: expect.objectContaining({
            roles: [] // Should be empty array for non-admin
          })
        })
      )
    })
  })

  describe('logout route handler', () => {
    test('should handle logout by clearing session and redirecting', async () => {
      // Arrange
      await plugin.register(mockServer)
      const logoutHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/logout'
      )[0].handler

      const request = {
        auth: {
          isAuthenticated: true,
          credentials: { id: 'session-123' }
        },
        server: {
          info: { protocol: 'https' }
        },
        info: { host: 'example.com' }
      }

      mockOidcClient.endSessionUrl.mockReturnValue('https://mock-logout-url')

      // Act
      await logoutHandler(request, mockH)

      // Assert
      expect(mockSessionCache.drop).toHaveBeenCalledWith('session-123')
      expect(mockResponse.unstate).toHaveBeenCalledWith('assurance-session')
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'https://mock-logout-url'
      )
    })

    test('should handle logout when user is not authenticated', async () => {
      // Arrange
      await plugin.register(mockServer)
      const logoutHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/logout'
      )[0].handler

      const request = {
        auth: { isAuthenticated: false },
        server: {
          info: { protocol: 'https' }
        },
        info: { host: 'example.com' }
      }

      mockOidcClient.endSessionUrl.mockReturnValue('https://mock-logout-url')

      // Act
      await logoutHandler(request, mockH)

      // Assert
      expect(mockSessionCache.drop).not.toHaveBeenCalled()
      expect(mockResponse.unstate).toHaveBeenCalledWith('assurance-session')
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'https://mock-logout-url'
      )
    })

    test('should handle logout with missing OIDC client', async () => {
      // Arrange - Make OIDC client setup fail
      Issuer.discover.mockRejectedValueOnce(new Error('OIDC setup failed'))
      await plugin.register(mockServer)

      const logoutHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/logout'
      )[0].handler

      const request = {
        auth: {
          isAuthenticated: true,
          credentials: { id: 'session-123' }
        },
        server: {
          info: { protocol: 'https' }
        },
        info: { host: 'example.com' }
      }

      // Act
      await logoutHandler(request, mockH)

      // Assert
      expect(mockSessionCache.drop).toHaveBeenCalledWith('session-123')
      expect(mockResponse.unstate).toHaveBeenCalledWith('assurance-session')
      expect(mockResponse.redirect).toHaveBeenCalledWith('/') // Should fallback to home
    })
  })
})
