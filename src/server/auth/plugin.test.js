import { plugin } from './plugin.js'
import { Issuer } from 'openid-client'

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
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    error: jest.fn()
  })
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
        query: { redirectTo: '/dashboard' },
        headers: { referer: 'https://example.com/previous-page' }
      }

      // Act
      await loginHandler(request, mockH)

      // Assert
      expect(mockAuthStateCache.set).toHaveBeenCalledWith('mock-state', {
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/dashboard'
      })
    })

    test('should handle missing OIDC client', async () => {
      // Arrange
      mockIssuer.Client.mockImplementation(() => {
        throw new Error('Failed to create client')
      })

      await plugin.register(mockServer)
      const loginHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth/login'
      )[0].handler

      const request = { query: {} }

      // Act
      await loginHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: 'OIDC client is not properly configured'
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

      // Setup state data
      const stateData = {
        codeVerifier: 'mock-code-verifier',
        redirectTo: '/dashboard'
      }
      mockAuthStateCache.get.mockResolvedValue(stateData)

      // Setup token response
      const mockTokenSet = {
        id_token: 'mock-id-token',
        access_token: 'mock-access-token',
        expires_in: 3600,
        claims: jest.fn().mockReturnValue({
          sub: 'user-123',
          name: 'Test User',
          email: 'test@example.com'
        })
      }
      mockOidcClient.callbackParams.mockReturnValue({
        code: 'mock-auth-code',
        state: 'mock-state'
      })
      mockOidcClient.callback.mockResolvedValue(mockTokenSet)

      const request = {
        raw: { req: {} },
        query: { code: 'mock-auth-code', state: 'mock-state' }
      }

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockAuthStateCache.get).toHaveBeenCalledWith('mock-state')
      expect(mockOidcClient.callback).toHaveBeenCalledWith(
        'https://example.com/auth',
        { code: 'mock-auth-code', state: 'mock-state' },
        { state: 'mock-state', code_verifier: 'mock-code-verifier' }
      )
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'mock-session-id',
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
            roles: ['admin']
          }),
          token: 'mock-access-token'
        })
      )
      expect(mockH.redirect).toHaveBeenCalledWith('/dashboard')
      expect(mockResponse.state).toHaveBeenCalledWith('assurance-session', {
        id: 'mock-session-id'
      })
    })

    test('should handle missing state parameter', async () => {
      // Arrange
      await plugin.register(mockServer)
      const callbackHandler = mockServer.route.mock.calls.find(
        (call) => call[0].path === '/auth'
      )[0].handler

      mockOidcClient.callbackParams.mockReturnValue({ code: 'mock-auth-code' })

      const request = {
        raw: { req: {} },
        query: { code: 'mock-auth-code' }
      }

      // Act
      await callbackHandler(request, mockH)

      // Assert
      expect(mockH.view).toHaveBeenCalledWith('common/templates/error', {
        title: 'Authentication Error',
        message: expect.stringContaining('There was a problem signing you in')
      })
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
          credentials: { id: 'mock-session-id' }
        },
        server: {
          info: { protocol: 'https' }
        },
        info: { host: 'example.com' }
      }

      // Act
      await logoutHandler(request, mockH)

      // Assert
      expect(mockSessionCache.drop).toHaveBeenCalledWith('mock-session-id')
      expect(mockResponse.unstate).toHaveBeenCalledWith('assurance-session')
      expect(mockOidcClient.endSessionUrl).toHaveBeenCalledWith({
        post_logout_redirect_uri: 'https://example.com/'
      })
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
        auth: {
          isAuthenticated: false
        },
        server: {
          info: { protocol: 'https' }
        },
        info: { host: 'example.com' }
      }

      // Act
      await logoutHandler(request, mockH)

      // Assert
      expect(mockSessionCache.drop).not.toHaveBeenCalled()
      expect(mockResponse.unstate).toHaveBeenCalledWith('assurance-session')
      expect(mockOidcClient.endSessionUrl).toHaveBeenCalledWith({
        post_logout_redirect_uri: 'https://example.com/'
      })
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'https://mock-logout-url'
      )
    })
  })
})
