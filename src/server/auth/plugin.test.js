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
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
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
        'session.cookie.ttl': 86400000,
        'session.cache.ttl': 86400000,
        'session.extendOnActivity': false
      }
      return configValues[key] || null
    })
  }
}))

jest.mock('~/src/server/common/helpers/analytics.js', () => ({
  analytics: {
    trackUniqueVisitor: jest.fn().mockResolvedValue(undefined),
    trackPageView: jest.fn().mockResolvedValue(undefined),
    trackProjectAccess: jest.fn().mockResolvedValue(undefined)
  }
}))

describe('Auth Plugin', () => {
  let mockServer
  let mockIssuer
  let mockOidcClient
  let mockSessionCache
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

    // Mock server
    mockServer = {
      register: jest.fn().mockResolvedValue(undefined),
      auth: {
        strategy: jest.fn(),
        default: jest.fn()
      },
      route: jest.fn(),
      ext: jest.fn(), // Add ext method for visitor tracking
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
      const request = {
        path: '/auth/logout',
        headers: {},
        state: {}
      }
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
      const request = {
        path: '/public/style.css',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid for missing session ID', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = null

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid for missing cached session', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      mockSessionCache.get.mockResolvedValue(null)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid for auth state session without user', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      // Auth state session (no user data yet)
      mockSessionCache.get.mockResolvedValue({
        authState: {
          state: 'oauth-state',
          codeVerifier: 'code-verifier'
        }
      })

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(result).toEqual({ isValid: false })
    })

    test('should return invalid for expired session', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      const expiredSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: ['admin']
        },
        expires: Date.now() - 1000 // Expired
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
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      const validSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: ['admin']
        },
        expires: Date.now() + 3600000 // Valid for 1 hour
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
    })

    test('should handle session validation errors', async () => {
      // Arrange
      await plugin.register(mockServer)
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
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
      expect(mockSessionCache.set).toHaveBeenCalledWith('mock-session-id', {
        authState: {
          state: 'mock-state',
          codeVerifier: 'mock-code-verifier',
          redirectTo: '/previous-page',
          expires: expect.any(Number)
        }
      })
      expect(mockOidcClient.authorizationUrl).toHaveBeenCalledWith({
        scope: expect.stringContaining('openid profile email'),
        state: 'mock-state',
        code_challenge: 'mock-code-challenge',
        code_challenge_method: 'S256'
      })
      expect(mockResponse.state).toHaveBeenCalledWith('assurance-session', {
        id: 'mock-session-id'
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
      expect(mockSessionCache.set).toHaveBeenCalledWith('mock-session-id', {
        authState: {
          state: 'mock-state',
          codeVerifier: 'mock-code-verifier',
          redirectTo: '/custom-redirect',
          expires: expect.any(Number)
        }
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
      expect(mockSessionCache.set).toHaveBeenCalledWith('mock-session-id', {
        authState: {
          state: 'mock-state',
          codeVerifier: 'mock-code-verifier',
          redirectTo: '/',
          expires: expect.any(Number)
        }
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
        raw: { req: {} },
        state: {
          'assurance-session': { id: 'mock-session-id' }
        }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      // Session contains auth state
      mockSessionCache.get.mockResolvedValue({
        authState: {
          state: 'mock-state',
          codeVerifier: 'mock-code-verifier',
          redirectTo: '/dashboard',
          expires: Date.now() + 600000
        }
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
      expect(mockResponse.state).toHaveBeenCalledWith('assurance-session', {
        id: 'mock-session-id'
      })
      expect(mockH.redirect).toHaveBeenCalledWith('/dashboard')
    })

    test('should handle missing state parameter', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code' },
        raw: { req: {} },
        state: {}
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: null
      })

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: expect.stringContaining('There was a problem signing you in')
      })
      expect(logger.error).toHaveBeenCalledWith(
        'Authentication callback error:',
        expect.any(Error)
      )
    })

    test('should handle token exchange errors', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code', state: 'mock-state' },
        raw: { req: {} },
        state: {
          'assurance-session': { id: 'mock-session-id' }
        }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      // Session contains auth state
      mockSessionCache.get.mockResolvedValue({
        authState: {
          state: 'mock-state',
          codeVerifier: 'mock-code-verifier',
          redirectTo: '/dashboard',
          expires: Date.now() + 600000
        }
      })

      const tokenError = new Error('Token exchange failed')
      mockOidcClient.callback.mockRejectedValue(tokenError)

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: expect.stringContaining('There was a problem signing you in')
      })
      expect(logger.error).toHaveBeenCalledWith(
        'Authentication callback error:',
        expect.any(Error)
      )
    })

    test('should handle roles as string in token claims', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      const request = {
        query: { code: 'auth-code', state: 'mock-state' },
        raw: { req: {} },
        state: {
          'assurance-session': { id: 'mock-session-id' }
        }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      mockSessionCache.get.mockResolvedValue({
        authState: {
          state: 'mock-state',
          codeVerifier: 'mock-code-verifier',
          redirectTo: '/dashboard',
          expires: Date.now() + 600000
        }
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
            roles: ['admin']
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
        raw: { req: {} },
        state: {
          'assurance-session': { id: 'mock-session-id' }
        }
      }

      mockOidcClient.callbackParams.mockReturnValue({
        code: 'auth-code',
        state: 'mock-state'
      })

      mockSessionCache.get.mockResolvedValue({
        authState: {
          state: 'mock-state',
          codeVerifier: 'mock-code-verifier',
          redirectTo: '/dashboard',
          expires: Date.now() + 600000
        }
      })

      mockOidcClient.callback.mockResolvedValue({
        id_token: 'mock-id-token',
        access_token: 'mock-access-token',
        expires_in: 3600,
        claims: () => ({
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['user'] // No admin role
        })
      })

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'mock-session-id',
        expect.objectContaining({
          user: expect.objectContaining({
            roles: []
          })
        })
      )
    })
  })

  describe('logout route handler', () => {
    test('should handle logout with valid session', async () => {
      // Arrange
      await plugin.register(mockServer)
      const logoutHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/logout'
      )[0].handler

      const request = {
        auth: {
          isAuthenticated: true,
          credentials: { id: 'test-session-id' }
        },
        server: {
          info: { protocol: 'https', host: 'example.com' }
        },
        info: { host: 'example.com' }
      }

      // Act
      const result = await logoutHandler(request, mockH)

      // Assert
      expect(mockSessionCache.drop).toHaveBeenCalledWith('test-session-id')
      expect(mockResponse.unstate).toHaveBeenCalledWith('assurance-session')
      expect(result.redirect).toHaveBeenCalledWith('https://mock-logout-url')
    })

    test('should handle logout without session', async () => {
      // Arrange
      await plugin.register(mockServer)
      const logoutHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/logout'
      )[0].handler

      const request = {
        auth: {
          isAuthenticated: false
        },
        server: {
          info: { protocol: 'https', host: 'example.com' }
        },
        info: { host: 'example.com' }
      }

      // Act
      const result = await logoutHandler(request, mockH)

      // Assert
      expect(mockSessionCache.drop).not.toHaveBeenCalled()
      expect(mockResponse.unstate).toHaveBeenCalledWith('assurance-session')
      expect(result.redirect).toHaveBeenCalledWith('https://mock-logout-url')
    })

    test('should handle logout errors', async () => {
      // Arrange
      await plugin.register(mockServer)
      const logoutHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/logout'
      )[0].handler

      const request = {
        auth: {
          isAuthenticated: true,
          credentials: { id: 'test-session-id' }
        },
        server: {
          info: { protocol: 'https', host: 'example.com' }
        },
        info: { host: 'example.com' }
      }

      const error = new Error('Cache error')
      mockSessionCache.drop.mockRejectedValue(error)

      // Act
      await logoutHandler(request, mockH)

      // Assert
      expect(logger.error).toHaveBeenCalledWith('Logout error:', error)
      expect(mockH.redirect).toHaveBeenCalledWith('/')
    })
  })

  describe('token refresh functionality', () => {
    beforeEach(async () => {
      // Setup complete mock before plugin registration
      mockOidcClient.refresh = jest.fn()

      // Ensure our mock is returned by the issuer
      mockIssuer.Client = jest.fn().mockReturnValue(mockOidcClient)
      Issuer.discover.mockResolvedValue(mockIssuer)

      await plugin.register(mockServer)
    })

    test('should refresh token when near expiry and return updated session', async () => {
      // Arrange
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      // Session with token expiring in 3 minutes (less than 5 minute threshold)
      const sessionWithExpiringToken = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: ['admin']
        },
        token: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        tokenExpires: Date.now() + 3 * 60 * 1000, // 3 minutes
        expires: Date.now() + 3600000 // Session valid for 1 hour
      }

      const refreshedTokenSet = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      }

      mockSessionCache.get.mockResolvedValue(sessionWithExpiringToken)
      mockOidcClient.refresh = jest.fn().mockResolvedValue(refreshedTokenSet)
      mockSessionCache.set.mockResolvedValue(true)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(mockOidcClient.refresh).toHaveBeenCalledWith('valid-refresh-token')
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'test-session-id',
        expect.objectContaining({
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
          tokenExpires: expect.any(Number)
        })
      )
      expect(result.isValid).toBe(true)
      expect(result.credentials.token).toBe('new-access-token')
      expect(logger.info).toHaveBeenCalledWith(
        'Refreshing access token for session',
        { sessionId: 'test-session-id' }
      )
    })

    test('should invalidate session when refresh token is expired (Entra session expired)', async () => {
      // Arrange
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      const sessionWithExpiringToken = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: ['admin']
        },
        token: 'old-access-token',
        refreshToken: 'expired-refresh-token',
        tokenExpires: Date.now() + 3 * 60 * 1000,
        expires: Date.now() + 3600000
      }

      // Simulate Entra returning invalid_grant error
      const refreshError = new Error('Token refresh failed')
      refreshError.error = 'invalid_grant'
      refreshError.error_description =
        'AADSTS70008: The provided authorization code or refresh token has expired'

      mockSessionCache.get.mockResolvedValue(sessionWithExpiringToken)
      mockOidcClient.refresh = jest.fn().mockRejectedValue(refreshError)
      mockSessionCache.drop.mockResolvedValue(true)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(mockOidcClient.refresh).toHaveBeenCalledWith(
        'expired-refresh-token'
      )
      expect(mockSessionCache.drop).toHaveBeenCalledWith('test-session-id')
      expect(result).toEqual({ isValid: false, sessionExpired: true })
      expect(logger.info).toHaveBeenCalledWith(
        'Entra session expired or refresh token invalid, invalidating local session',
        expect.objectContaining({ sessionId: 'test-session-id' })
      )
    })

    test('should invalidate session when refresh fails for other reasons', async () => {
      // Arrange
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      const sessionWithExpiringToken = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: ['admin']
        },
        token: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        tokenExpires: Date.now() + 3 * 60 * 1000,
        expires: Date.now() + 3600000
      }

      const refreshError = new Error('Network error')

      mockSessionCache.get.mockResolvedValue(sessionWithExpiringToken)
      mockOidcClient.refresh.mockRejectedValue(refreshError)
      mockSessionCache.drop.mockResolvedValue(true)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(mockOidcClient.refresh).toHaveBeenCalledWith('valid-refresh-token')
      expect(result).toEqual({ isValid: false })
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh access token',
        expect.objectContaining({ sessionId: 'test-session-id' })
      )
      // The session drop happens after the logger.warn call in the main validation function
      expect(mockSessionCache.drop).toHaveBeenCalledWith('test-session-id')
      expect(logger.warn).toHaveBeenCalledWith(
        'Token refresh failed, invalidating session',
        { sessionId: 'test-session-id' }
      )
    })

    test('should not attempt refresh when no refresh token available', async () => {
      // Arrange
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      const sessionWithoutRefreshToken = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: ['admin']
        },
        token: 'old-access-token',
        tokenExpires: Date.now() + 3 * 60 * 1000, // Expiring soon
        expires: Date.now() + 3600000
      }

      mockSessionCache.get.mockResolvedValue(sessionWithoutRefreshToken)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(mockOidcClient.refresh).not.toHaveBeenCalled()
      expect(result.isValid).toBe(true) // Should still be valid since session itself isn't expired
    })

    test('should not refresh token when not near expiry', async () => {
      // Arrange
      const strategyCall = mockServer.auth.strategy.mock.calls.find(
        (call) => call[0] === 'session'
      )
      const strategyConfig = strategyCall[2]
      const request = {
        path: '/protected',
        headers: {},
        state: {}
      }
      const session = { id: 'test-session-id' }

      const sessionWithValidToken = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          roles: ['admin']
        },
        token: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        tokenExpires: Date.now() + 30 * 60 * 1000, // 30 minutes - not near expiry
        expires: Date.now() + 3600000
      }

      mockSessionCache.get.mockResolvedValue(sessionWithValidToken)

      // Act
      const result = await strategyConfig.validate(request, session)

      // Assert
      expect(mockOidcClient.refresh).not.toHaveBeenCalled()
      expect(result.isValid).toBe(true)
      expect(result.credentials.token).toBe('valid-access-token')
    })
  })
})
