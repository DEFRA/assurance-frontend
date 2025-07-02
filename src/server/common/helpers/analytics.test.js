import {
  analytics,
  trackProjectView,
  trackProjectSearch,
  trackProjectDownload
} from './analytics.js'
import { logMetric } from './metrics.js'
import { logger } from './logging/logger.js'

// Mock dependencies
jest.mock('./metrics.js', () => ({
  logMetric: jest.fn()
}))

jest.mock('./logging/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

describe('Analytics Service', () => {
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock request object
    mockRequest = {
      path: '/test-path',
      headers: {
        'user-agent': 'Test Browser 1.0',
        referer: 'https://example.com/previous'
      },
      visitor: {
        id: 'test-visitor-123',
        pageViews: 5,
        country: 'GB'
      },
      auth: {
        credentials: {
          user: {
            id: 'user-456',
            email: 'test@example.com'
          }
        }
      }
    }
  })

  describe('trackUniqueVisitor', () => {
    test('should track unique visitor with correct data', async () => {
      const visitor = {
        id: 'visitor-123',
        country: 'GB'
      }

      await analytics.trackUniqueVisitor(mockRequest, visitor)

      expect(logMetric).toHaveBeenCalledWith(
        'UniqueVisitors',
        1,
        {
          path: '/test-path',
          userAgent: 'Test Browser 1.0',
          referer: 'https://example.com/previous',
          country: 'GB',
          timestamp: expect.any(String)
        },
        {
          Country: 'GB',
          Source: 'Referral'
        }
      )
    })

    test('should handle direct traffic (no referer)', async () => {
      mockRequest.headers.referer = undefined
      const visitor = { id: 'visitor-123', country: 'US' }

      await analytics.trackUniqueVisitor(mockRequest, visitor)

      expect(logMetric).toHaveBeenCalledWith(
        'UniqueVisitors',
        1,
        expect.objectContaining({
          referer: 'direct'
        }),
        {
          Country: 'US',
          Source: 'Direct'
        }
      )
    })

    test('should handle tracking errors gracefully', async () => {
      const error = new Error('Metrics service error')
      logMetric.mockRejectedValue(error)

      const visitor = { id: 'visitor-123', country: 'GB' }

      await analytics.trackUniqueVisitor(mockRequest, visitor)

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to track unique visitor:',
        error
      )
    })
  })

  describe('trackPageView', () => {
    test('should track page view with visitor context', async () => {
      const visitor = {
        id: 'visitor-123',
        pageViews: 3
      }

      await analytics.trackPageView(mockRequest, visitor, true)

      expect(logMetric).toHaveBeenCalledWith(
        'PageViews',
        1,
        {
          path: '/test-path',
          visitorId: 'visitor-123',
          isNewVisitor: true,
          sessionPageViews: 3,
          referer: 'https://example.com/previous',
          timestamp: expect.any(String)
        },
        {
          Path: '/test-path',
          VisitorType: 'New'
        }
      )
    })

    test('should track returning visitor page view', async () => {
      const visitor = {
        id: 'visitor-123',
        pageViews: 10
      }

      await analytics.trackPageView(mockRequest, visitor, false)

      expect(logMetric).toHaveBeenCalledWith(
        'PageViews',
        1,
        expect.objectContaining({
          isNewVisitor: false,
          sessionPageViews: 10
        }),
        {
          Path: '/test-path',
          VisitorType: 'Returning'
        }
      )
    })

    test('should handle tracking errors gracefully', async () => {
      const error = new Error('Metrics service error')
      logMetric.mockRejectedValue(error)

      const visitor = { id: 'visitor-123', pageViews: 1 }

      await analytics.trackPageView(mockRequest, visitor, true)

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to track page view:',
        error
      )
    })
  })

  describe('trackProjectAccess', () => {
    test('should track project access for authenticated user', async () => {
      await analytics.trackProjectAccess(mockRequest, 'project-123', 'view', {
        projectName: 'Test Project'
      })

      expect(logMetric).toHaveBeenCalledWith(
        'ProjectAccess',
        1,
        {
          projectId: 'project-123',
          action: 'view',
          path: '/test-path',
          visitorId: 'test-visitor-123',
          userId: 'user-456',
          isAuthenticated: true,
          userAgent: 'Test Browser 1.0',
          timestamp: expect.any(String),
          projectName: 'Test Project'
        },
        {
          ProjectId: 'project-123',
          Action: 'view',
          UserType: 'Authenticated',
          ProjectName: 'Test Project'
        }
      )
    })

    test('should track project access for anonymous user', async () => {
      mockRequest.auth = null

      await analytics.trackProjectAccess(
        mockRequest,
        'project-123',
        'download',
        {
          fileName: 'report.pdf'
        }
      )

      expect(logMetric).toHaveBeenCalledWith(
        'ProjectAccess',
        1,
        expect.objectContaining({
          projectId: 'project-123',
          action: 'download',
          visitorId: 'test-visitor-123',
          userId: undefined,
          isAuthenticated: false,
          fileName: 'report.pdf'
        }),
        {
          ProjectId: 'project-123',
          Action: 'download',
          UserType: 'Anonymous'
        }
      )
    })

    test('should handle missing visitor session', async () => {
      mockRequest.visitor = null

      await analytics.trackProjectAccess(mockRequest, 'project-123')

      expect(logMetric).toHaveBeenCalledWith(
        'ProjectAccess',
        1,
        expect.objectContaining({
          visitorId: undefined
        }),
        {
          ProjectId: 'project-123',
          Action: 'view',
          UserType: 'Authenticated'
        }
      )
    })

    test('should default to view action', async () => {
      await analytics.trackProjectAccess(mockRequest, 'project-123')

      expect(logMetric).toHaveBeenCalledWith(
        'ProjectAccess',
        1,
        expect.objectContaining({
          action: 'view'
        }),
        {
          ProjectId: 'project-123',
          Action: 'view',
          UserType: 'Authenticated'
        }
      )
    })

    test('should handle tracking errors gracefully', async () => {
      const error = new Error('Metrics service error')
      logMetric.mockRejectedValue(error)

      await analytics.trackProjectAccess(mockRequest, 'project-123')

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to track project access:',
        error
      )
    })
  })

  describe('trackSearch', () => {
    test('should track search query with results', async () => {
      await analytics.trackSearch(mockRequest, 'test query', 5, 'projects')

      expect(logMetric).toHaveBeenCalledWith(
        'SearchQuery',
        1,
        {
          searchTerm: 'test query',
          searchLength: 10,
          resultCount: 5,
          searchContext: 'projects',
          visitorId: 'test-visitor-123',
          userId: 'user-456',
          isAuthenticated: true,
          hasResults: true,
          timestamp: expect.any(String)
        },
        {
          SearchContext: 'projects',
          HasResults: 'Yes',
          UserType: 'Authenticated'
        }
      )
    })

    test('should track search with no results', async () => {
      await analytics.trackSearch(mockRequest, 'nonexistent', 0)

      expect(logMetric).toHaveBeenCalledWith(
        'SearchQuery',
        1,
        expect.objectContaining({
          searchTerm: 'nonexistent',
          resultCount: 0,
          hasResults: false,
          searchContext: 'general'
        }),
        {
          SearchContext: 'general',
          HasResults: 'No',
          UserType: 'Authenticated'
        }
      )
    })

    test('should normalize search terms to lowercase', async () => {
      await analytics.trackSearch(mockRequest, 'TEST Query', 3)

      expect(logMetric).toHaveBeenCalledWith(
        'SearchQuery',
        1,
        expect.objectContaining({
          searchTerm: 'test query'
        }),
        {
          SearchContext: 'general',
          HasResults: 'Yes',
          UserType: 'Authenticated'
        }
      )
    })

    test('should handle tracking errors gracefully', async () => {
      const error = new Error('Metrics service error')
      logMetric.mockRejectedValue(error)

      await analytics.trackSearch(mockRequest, 'test', 1)

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to track search:',
        error
      )
    })
  })

  describe('utility functions', () => {
    test('getVisitorFromRequest should return visitor from request', () => {
      const visitor = analytics.getVisitorFromRequest(mockRequest)
      expect(visitor).toBe(mockRequest.visitor)
    })

    test('getVisitorFromRequest should return null if no visitor', () => {
      mockRequest.visitor = null
      const visitor = analytics.getVisitorFromRequest(mockRequest)
      expect(visitor).toBeNull()
    })

    test('isAuthenticated should return true for authenticated user', () => {
      const result = analytics.isAuthenticated(mockRequest)
      expect(result).toBe(true)
    })

    test('isAuthenticated should return false for anonymous user', () => {
      mockRequest.auth = null
      const result = analytics.isAuthenticated(mockRequest)
      expect(result).toBe(false)
    })
  })
})

describe('Convenience Functions', () => {
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      path: '/projects/123',
      headers: { 'user-agent': 'Test Browser' },
      visitor: { id: 'visitor-123', pageViews: 1 },
      auth: { credentials: { user: { id: 'user-456' } } }
    }
  })

  describe('trackProjectView', () => {
    test('should call analytics.trackProjectAccess with view action', async () => {
      const spy = jest.spyOn(analytics, 'trackProjectAccess')

      await trackProjectView(mockRequest, 'project-123', { extra: 'data' })

      expect(spy).toHaveBeenCalledWith(mockRequest, 'project-123', 'view', {
        extra: 'data'
      })
    })
  })

  describe('trackProjectSearch', () => {
    test('should call analytics.trackSearch with projects context', async () => {
      const spy = jest.spyOn(analytics, 'trackSearch')

      await trackProjectSearch(mockRequest, 'search term', 10)

      expect(spy).toHaveBeenCalledWith(
        mockRequest,
        'search term',
        10,
        'projects'
      )
    })
  })

  describe('trackProjectDownload', () => {
    test('should call analytics.trackProjectAccess with download action', async () => {
      const spy = jest.spyOn(analytics, 'trackProjectAccess')

      await trackProjectDownload(mockRequest, 'project-123', 'report.pdf')

      expect(spy).toHaveBeenCalledWith(mockRequest, 'project-123', 'download', {
        fileName: 'report.pdf'
      })
    })
  })
})
