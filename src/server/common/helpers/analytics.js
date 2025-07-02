import { logMetric } from './metrics.js'
import { logger } from './logging/logger.js'

/**
 * Analytics service for tracking user behavior and metrics
 */
class AnalyticsService {
  /**
   * Track unique visitor (called automatically by auth plugin)
   * @param {import('@hapi/hapi').Request} request
   * @param {object} visitor - Visitor session data
   */
  async trackUniqueVisitor(request, visitor) {
    try {
      // Simplified - no dimensions, just basic properties for debugging
      const properties = {
        path: request.path,
        visitorId: visitor.id,
        timestamp: new Date().toISOString()
      }

      // No dimensions - just a simple count
      await logMetric('UniqueVisitors', 1, properties)

      logger.debug('Tracked unique visitor', { visitorId: visitor.id })
    } catch (error) {
      logger.error('Failed to track unique visitor:', error)
    }
  }

  /**
   * Track page view (called automatically by auth plugin)
   * @param {import('@hapi/hapi').Request} request
   * @param {object} visitor - Visitor session data
   * @param {boolean} isNewVisitor
   */
  async trackPageView(request, visitor, isNewVisitor) {
    try {
      const dimensions = {
        Path: request.path,
        VisitorType: isNewVisitor ? 'New' : 'Returning'
      }

      const properties = {
        path: request.path,
        visitorId: visitor.id,
        isNewVisitor,
        sessionPageViews: visitor.pageViews,
        referer: request.headers.referer || 'direct',
        timestamp: new Date().toISOString()
      }

      await logMetric('PageViews', 1, properties, dimensions)

      logger.debug('Tracked page view', {
        visitorId: visitor.id,
        path: request.path
      })
    } catch (error) {
      logger.error('Failed to track page view:', error)
    }
  }

  /**
   * Track project access - main tracking method for your use case
   * @param {import('@hapi/hapi').Request} request
   * @param {string} projectId - Project identifier
   * @param {string} action - Action type ('view', 'search', 'download', etc.)
   * @param {object} additionalData - Any additional tracking data
   */
  async trackProjectAccess(
    request,
    projectId,
    action = 'view',
    additionalData = {}
  ) {
    try {
      const visitor = this.getVisitorFromRequest(request)
      const user = request.auth?.credentials?.user

      const dimensions = {
        ProjectId: projectId,
        Action: action,
        UserType: user ? 'Authenticated' : 'Anonymous'
      }

      // Add project name as dimension if provided
      if (additionalData.projectName) {
        dimensions.ProjectName = additionalData.projectName
      }

      const properties = {
        projectId,
        action,
        path: request.path,
        visitorId: visitor?.id,
        userId: user?.id,
        isAuthenticated: !!user,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
        ...additionalData
      }

      await logMetric('ProjectAccess', 1, properties, dimensions)

      logger.info('Tracked project access', {
        projectId,
        action,
        visitorId: visitor?.id,
        userId: user?.id
      })
    } catch (error) {
      logger.error('Failed to track project access:', error)
    }
  }

  /**
   * Track search queries
   * @param {import('@hapi/hapi').Request} request
   * @param {string} searchTerm
   * @param {number} resultCount
   * @param {string} searchContext - Context like 'homepage', 'projects', etc.
   */
  async trackSearch(
    request,
    searchTerm,
    resultCount,
    searchContext = 'general'
  ) {
    try {
      const visitor = this.getVisitorFromRequest(request)
      const user = request.auth?.credentials?.user

      const dimensions = {
        SearchContext: searchContext,
        HasResults: resultCount > 0 ? 'Yes' : 'No',
        UserType: user ? 'Authenticated' : 'Anonymous'
      }

      const properties = {
        searchTerm: searchTerm.toLowerCase(),
        searchLength: searchTerm.length,
        resultCount,
        searchContext,
        visitorId: visitor?.id,
        userId: user?.id,
        isAuthenticated: !!user,
        hasResults: resultCount > 0,
        timestamp: new Date().toISOString()
      }

      await logMetric('SearchQuery', 1, properties, dimensions)

      logger.debug('Tracked search query', {
        searchTerm,
        resultCount,
        searchContext
      })
    } catch (error) {
      logger.error('Failed to track search:', error)
    }
  }

  /**
   * Get visitor data from request
   * @param {import('@hapi/hapi').Request} request
   * @returns {object|null}
   */
  getVisitorFromRequest(request) {
    return request.visitor || null
  }

  /**
   * Check if current user is authenticated
   * @param {import('@hapi/hapi').Request} request
   * @returns {boolean}
   */
  isAuthenticated(request) {
    return !!request.auth?.credentials?.user
  }
}

// Create singleton instance
export const analytics = new AnalyticsService()

// Convenience functions for common tracking patterns
export const trackProjectView = (request, projectId, additionalData = {}) =>
  analytics.trackProjectAccess(request, projectId, 'view', additionalData)

export const trackProjectSearch = (request, searchTerm, resultCount) =>
  analytics.trackSearch(request, searchTerm, resultCount, 'projects')

export const trackProjectDownload = (request, projectId, fileName) =>
  analytics.trackProjectAccess(request, projectId, 'download', { fileName })
