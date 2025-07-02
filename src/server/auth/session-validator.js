import { logger } from '../common/helpers/logging/logger.js'

/**
 * Session validation helper functions
 * Extracted from auth plugin to reduce file size and improve maintainability
 */

function validateSessionState(cached) {
  if (!cached.user) {
    logger.debug('No user in cached session')
    return { isValid: false }
  }

  return null // Valid state
}

async function handleSessionExpiry(cached, sessionId, sessionCache) {
  if (cached.expires && cached.expires < Date.now()) {
    logger.info('Session expired, dropping', { sessionId })
    await sessionCache?.drop(sessionId)
    return { isValid: false }
  }
  return null // Not expired
}

async function handleSessionExtension(cached, sessionId, sessionCache) {
  const extensionThreshold = 30 * 60 * 1000 // 30 minutes

  if (cached.expires && cached.expires - Date.now() < extensionThreshold) {
    logger.debug('Extending session', { sessionId })
    const extendedSession = {
      ...cached,
      expires: Date.now() + 4 * 60 * 60 * 1000 // Extend by 4 hours
    }
    await sessionCache?.set(sessionId, extendedSession)
    return extendedSession
  }
  return cached
}

function isPublicPath(path) {
  const AUTH_LOGOUT_PATH = '/auth/logout'

  if (path === AUTH_LOGOUT_PATH || path.startsWith('/public/')) {
    logger.debug('Skipping auth for public/logout path', { path })
    return true
  }
  return false
}

async function handleUnauthenticatedRequest(
  request,
  sessionCache,
  handleUnauthenticatedUser
) {
  logger.debug('No session ID found, handling as unauthenticated user', {
    path: request.path
  })
  const result = await handleUnauthenticatedUser(request, sessionCache)

  // Set visitor session ID for cookie creation in onPreResponse
  if (request.visitor) {
    // Find the session ID by checking if a new visitor session was created
    const sessionCookie = request.state?.['assurance-session']
    if (!sessionCookie?.id && request._visitorSessionId) {
      // New visitor session was created, will be handled by onPreResponse
    }
  }

  return result
}

async function handleVisitorSession(
  request,
  sessionCache,
  createOrUpdateVisitorSession,
  shouldTrackPath
) {
  if (shouldTrackPath(request.path)) {
    const visitorResult = await createOrUpdateVisitorSession(
      request,
      sessionCache
    )
    if (visitorResult) {
      // Only set _visitorSessionId for NEW visitor sessions, not existing ones
      // This prevents overwriting authenticated session cookies
      const sessionCookie = request.state?.['assurance-session']
      const isNewSession =
        !sessionCookie?.id || sessionCookie.id !== visitorResult.sessionId

      if (isNewSession) {
        request._visitorSessionId = visitorResult.sessionId
      }
      request.visitor = visitorResult.visitorSession.visitor
    }
  }
  return { isValid: false }
}

async function processAuthenticatedSession(
  cached,
  sessionId,
  sessionCache,
  handleTokenRefresh
) {
  // Validate session state
  const stateValidation = validateSessionState(cached)
  if (stateValidation) {
    return stateValidation
  }

  // Check session expiry
  const expiryResult = await handleSessionExpiry(
    cached,
    sessionId,
    sessionCache
  )
  if (expiryResult) {
    return expiryResult
  }

  // Handle session extension
  const sessionToReturn = await handleSessionExtension(
    cached,
    sessionId,
    sessionCache
  )

  // Handle token refresh if needed
  const refreshResult = await handleTokenRefresh(
    cached,
    sessionId,
    sessionCache,
    sessionToReturn
  )
  if (refreshResult) {
    return refreshResult
  }

  // Return valid session
  return {
    isValid: true,
    credentials: {
      ...sessionToReturn,
      id: sessionId
    }
  }
}

export {
  validateSessionState,
  handleSessionExpiry,
  handleSessionExtension,
  isPublicPath,
  handleUnauthenticatedRequest,
  handleVisitorSession,
  processAuthenticatedSession
}
