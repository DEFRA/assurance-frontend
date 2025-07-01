import crypto from 'node:crypto'
import { logger } from '../common/helpers/logging/logger.js'
import { analytics } from '../common/helpers/analytics.js'

/**
 * Visitor session management functions
 * Extracted from auth plugin to reduce file size and improve maintainability
 */

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

async function createOrUpdateVisitorSession(request, sessionCache) {
  try {
    const sessionCookie = request.state?.['assurance-session']
    const sessionId = sessionCookie?.id

    if (sessionId && sessionCache) {
      // Try to get existing session
      const existing = await sessionCache.get(sessionId)
      if (existing?.visitor) {
        // Update existing visitor session
        const now = Date.now()
        existing.visitor.lastActivity = now
        existing.visitor.pageViews = (existing.visitor.pageViews || 0) + 1
        existing.expires = now + TWENTY_FOUR_HOURS_MS

        await sessionCache.set(sessionId, existing)

        // Track page view for existing visitor
        await analytics.trackPageView(request, existing.visitor, false)

        logger.debug('Updated existing visitor session', { sessionId })
        return {
          sessionId,
          visitorSession: existing
        }
      }
    }

    // Create new visitor session
    const newSessionId = crypto.randomBytes(16).toString('hex')
    const visitor = {
      id: crypto.randomBytes(16).toString('hex'),
      firstVisit: Date.now(),
      lastActivity: Date.now(),
      pageViews: [],
      userAgent: request.headers['user-agent'],
      ipAddress: request.info.remoteAddress
    }

    const visitorSession = {
      visitor,
      created: Date.now(),
      expires: Date.now() + TWENTY_FOUR_HOURS_MS
    }

    if (sessionCache) {
      await sessionCache.set(newSessionId, visitorSession)
    }

    // Track unique visitor
    await analytics.trackUniqueVisitor(request, visitor)

    logger.debug('Created new visitor session', {
      sessionId: newSessionId,
      visitorId: visitor.id
    })

    // Track page view for new visitor
    await analytics.trackPageView(request, visitor, true)

    return {
      sessionId: newSessionId,
      visitorSession
    }
  } catch (error) {
    logger.error('Error creating visitor session:', { error: error.message })
    return null
  }
}

function shouldTrackPath(path) {
  // Track visits to all pages except excluded paths (matches original logic)
  const skipPaths = [
    '/public/',
    '/favicon.ico',
    '/robots.txt',
    '/health',
    '/_next/',
    '/api/health'
  ]
  return !skipPaths.some((skipPath) => path.startsWith(skipPath))
}

async function handleUnauthenticatedUser(request, sessionCache) {
  if (shouldTrackPath(request.path)) {
    logger.debug('Creating visitor session for unauthenticated user', {
      path: request.path
    })
    const visitorResult = await createOrUpdateVisitorSession(
      request,
      sessionCache
    )
    if (visitorResult) {
      request._visitorSessionId = visitorResult.sessionId
      request.visitor = visitorResult.visitorSession.visitor
      logger.debug('Visitor session created for unauthenticated user', {
        sessionId: visitorResult.sessionId
      })
    }
  }
  return { isValid: false }
}

async function handleMissingSession(request, sessionCache) {
  logger.debug('Session not found in cache', { path: request.path })
  return await handleUnauthenticatedUser(request, sessionCache)
}

export {
  createOrUpdateVisitorSession,
  shouldTrackPath,
  handleUnauthenticatedUser,
  handleMissingSession
}
