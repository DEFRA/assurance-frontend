import { plugin } from './plugin.js'
import { analytics } from '~/src/server/common/helpers/analytics.js'
import { config } from '~/src/config/config.js'

// Mock dependencies
jest.mock('~/src/server/common/helpers/analytics.js', () => ({
  analytics: {
    trackUniqueVisitor: jest.fn().mockResolvedValue(),
    trackPageView: jest.fn().mockResolvedValue()
  }
}))

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

jest.mock('node:crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-visitor-session-id')
  })
}))

jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

// Mock openid-client
jest.mock('openid-client', () => ({
  Issuer: {
    discover: jest.fn().mockResolvedValue({
      Client: jest.fn().mockImplementation(() => ({
        authorizationUrl: jest.fn(),
        callbackParams: jest.fn(),
        callback: jest.fn(),
        endSessionUrl: jest.fn()
      }))
    })
  },
  generators: {
    state: jest.fn().mockReturnValue('mock-state'),
    codeVerifier: jest.fn().mockReturnValue('mock-code-verifier'),
    codeChallenge: jest.fn().mockReturnValue('mock-code-challenge')
  }
}))

describe('Auth Plugin - Visitor Tracking', () => {
  let mockServer
  let mockSessionCache
  let mockRequest
  let strategyConfig
  let onPreResponseHandler

  beforeEach(async () => {
    jest.clearAllMocks()

    // Mock config
    config.get.mockImplementation((key) => {
      const configValues = {
        'azure.tenantId': 'test-tenant',
        'azure.clientId': 'test-client',
        'azure.clientSecret': 'test-secret',
        'azure.callbackUrl': 'https://test.com/auth',
        'session.cookie.password':
          'test-password-must-be-at-least-32-characters',
        'session.cookie.secure': false,
        'session.cookie.ttl': 86400000
      }
      return configValues[key]
    })

    // Mock session cache
    mockSessionCache = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(true),
      drop: jest.fn()
    }

    // Mock server
    mockServer = {
      register: jest.fn(),
      auth: {
        strategy: jest.fn(),
        default: jest.fn()
      },
      route: jest.fn(),
      ext: jest.fn(),
      app: {
        sessionCache: mockSessionCache
      }
    }

    // Mock request
    mockRequest = {
      path: '/test-page',
      headers: {
        'user-agent': 'Test Browser 1.0',
        'cf-ipcountry': 'GB'
      },
      info: {
        remoteAddress: '127.0.0.1'
      },
      state: {}
    }

    // Register the plugin
    await plugin.register(mockServer)

    // Get the strategy config
    const strategyCall = mockServer.auth.strategy.mock.calls.find(
      (call) => call[0] === 'session'
    )
    strategyConfig = strategyCall[2]

    // Get the onPreResponse handler
    const onPreResponseCall = mockServer.ext.mock.calls.find(
      (call) => call[0] === 'onPreResponse'
    )
    onPreResponseHandler = onPreResponseCall[1]
  })

  describe('visitor session creation', () => {
    test('should create visitor session for new anonymous user via onPreAuth extension', async () => {
      // Get the onPreAuth handler
      const onPreAuthCall = mockServer.ext.mock.calls.find(
        (call) => call[0] === 'onPreAuth'
      )
      const onPreAuthHandler = onPreAuthCall[1]

      const mockH = {
        continue: Symbol('continue')
      }

      // Simulate onPreAuth for new user (no cookie)
      mockRequest.state = {} // No cookie

      const result = await onPreAuthHandler(mockRequest, mockH)

      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'mock-visitor-session-id',
        expect.objectContaining({
          visitor: expect.objectContaining({
            id: 'mock-visitor-session-id',
            firstVisit: expect.any(Number),
            lastActivity: expect.any(Number),
            pageViews: [],
            userAgent: 'Test Browser 1.0',
            ipAddress: expect.any(String)
          }),
          created: expect.any(Number),
          expires: expect.any(Number)
        })
      )

      expect(analytics.trackUniqueVisitor).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          id: 'mock-visitor-session-id'
        })
      )

      expect(analytics.trackPageView).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          id: 'mock-visitor-session-id'
        }),
        true // isNewVisitor
      )

      expect(mockRequest._visitorSessionId).toBe('mock-visitor-session-id')
      expect(mockRequest.visitor).toEqual(
        expect.objectContaining({
          id: 'mock-visitor-session-id'
        })
      )

      expect(result).toBe(mockH.continue)
    })

    test('should update existing visitor session via auth validation', async () => {
      const existingVisitorSession = {
        visitor: {
          id: 'existing-visitor-id',
          firstVisit: Date.now() - 3600000,
          lastActivity: Date.now() - 60000,
          pageViews: 5,
          userAgent: 'Test Browser 1.0',
          ipAddress: '127.0.0.1'
        },
        expires: Date.now() + 3600000
      }

      mockRequest.state = {
        'assurance-session': { id: 'existing-session-id' }
      }

      mockSessionCache.get.mockResolvedValue(existingVisitorSession)

      // Test the validation flow with existing visitor session
      const result = await strategyConfig.validate(mockRequest, {
        id: 'existing-session-id'
      })

      expect(mockSessionCache.set).toHaveBeenCalledWith(
        'existing-session-id',
        expect.objectContaining({
          visitor: expect.objectContaining({
            id: 'existing-visitor-id',
            pageViews: 6, // Incremented
            lastActivity: expect.any(Number)
          })
        })
      )

      expect(analytics.trackUniqueVisitor).not.toHaveBeenCalled() // Not a new visitor
      expect(analytics.trackPageView).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          id: 'existing-visitor-id',
          pageViews: 6
        }),
        false // Not new visitor
      )

      expect(result.isValid).toBe(false) // Still not authenticated but visitor session updated
    })

    test('should not track on excluded paths', async () => {
      // Get the onPreAuth handler
      const onPreAuthCall = mockServer.ext.mock.calls.find(
        (call) => call[0] === 'onPreAuth'
      )
      const onPreAuthHandler = onPreAuthCall[1]

      const mockH = {
        continue: Symbol('continue')
      }

      mockRequest.path = '/public/css/style.css'
      mockRequest.state = {} // No cookie

      const result = await onPreAuthHandler(mockRequest, mockH)

      expect(mockSessionCache.set).not.toHaveBeenCalled()
      expect(analytics.trackUniqueVisitor).not.toHaveBeenCalled()
      expect(analytics.trackPageView).not.toHaveBeenCalled()
      expect(result).toBe(mockH.continue)
    })

    test('should not track favicon requests', async () => {
      // Get the onPreAuth handler
      const onPreAuthCall = mockServer.ext.mock.calls.find(
        (call) => call[0] === 'onPreAuth'
      )
      const onPreAuthHandler = onPreAuthCall[1]

      const mockH = {
        continue: Symbol('continue')
      }

      mockRequest.path = '/favicon.ico'
      mockRequest.state = {} // No cookie

      const result = await onPreAuthHandler(mockRequest, mockH)

      expect(mockSessionCache.set).not.toHaveBeenCalled()
      expect(analytics.trackUniqueVisitor).not.toHaveBeenCalled()
      expect(analytics.trackPageView).not.toHaveBeenCalled()
      expect(result).toBe(mockH.continue)
    })

    test('should not track health check requests', async () => {
      // Get the onPreAuth handler
      const onPreAuthCall = mockServer.ext.mock.calls.find(
        (call) => call[0] === 'onPreAuth'
      )
      const onPreAuthHandler = onPreAuthCall[1]

      const mockH = {
        continue: Symbol('continue')
      }

      mockRequest.path = '/health'
      mockRequest.state = {} // No cookie

      const result = await onPreAuthHandler(mockRequest, mockH)

      expect(mockSessionCache.set).not.toHaveBeenCalled()
      expect(analytics.trackUniqueVisitor).not.toHaveBeenCalled()
      expect(analytics.trackPageView).not.toHaveBeenCalled()
      expect(result).toBe(mockH.continue)
    })
  })

  describe('visitor session cookie management', () => {
    test('should set visitor session cookie via onPreResponse', () => {
      mockRequest._visitorSessionId = 'new-visitor-session'

      const mockH = {
        state: jest.fn(),
        continue: Symbol('continue')
      }

      const result = onPreResponseHandler(mockRequest, mockH)

      expect(mockH.state).toHaveBeenCalledWith(
        'assurance-session',
        { id: 'new-visitor-session' },
        {
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          isHttpOnly: true,
          isSecure: false, // Based on config mock
          isSameSite: 'Lax',
          path: '/'
        }
      )

      expect(result).toBe(mockH.continue)
    })

    test('should not set cookie if no visitor session created', () => {
      const mockH = {
        state: jest.fn(),
        continue: Symbol('continue')
      }

      const result = onPreResponseHandler(mockRequest, mockH)

      expect(mockH.state).not.toHaveBeenCalled()
      expect(result).toBe(mockH.continue)
    })
  })

  describe('error handling', () => {
    test('should handle session cache errors gracefully', async () => {
      mockSessionCache.get.mockRejectedValue(new Error('Cache error'))
      mockSessionCache.set.mockRejectedValue(new Error('Cache set error'))

      const result = await strategyConfig.validate(mockRequest, null)

      expect(result.isValid).toBe(false)
      // Should not crash the request
    })

    test('should handle analytics tracking errors gracefully', async () => {
      analytics.trackUniqueVisitor.mockRejectedValue(
        new Error('Analytics error')
      )
      analytics.trackPageView.mockRejectedValue(new Error('Analytics error'))

      // Get the onPreAuth handler
      const onPreAuthCall = mockServer.ext.mock.calls.find(
        (call) => call[0] === 'onPreAuth'
      )
      const onPreAuthHandler = onPreAuthCall[1]

      const mockH = {
        continue: Symbol('continue')
      }

      mockRequest.state = {} // No cookie

      const result = await onPreAuthHandler(mockRequest, mockH)

      expect(result).toBe(mockH.continue)
      // Should still create visitor session even if analytics fails
      expect(mockSessionCache.set).toHaveBeenCalled()
    })
  })

  describe('path filtering', () => {
    const excludedPaths = [
      '/public/css/main.css',
      '/public/js/app.js',
      '/public/images/logo.png',
      '/favicon.ico',
      '/robots.txt',
      '/health',
      '/_next/static/css/app.css',
      '/api/health'
    ]

    excludedPaths.forEach((path) => {
      test(`should not track path: ${path}`, async () => {
        mockRequest.path = path

        await strategyConfig.validate(mockRequest, null)

        expect(mockSessionCache.set).not.toHaveBeenCalled()
        expect(analytics.trackUniqueVisitor).not.toHaveBeenCalled()
        expect(analytics.trackPageView).not.toHaveBeenCalled()
      })
    })
  })
})
