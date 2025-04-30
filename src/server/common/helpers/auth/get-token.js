import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

/**
 * Attempts to extract the token directly from cookies
 * This is a last resort method to get the token
 * @param {import('@hapi/hapi').Request} request
 * @returns {string|null}
 */
const extractTokenFromCookie = (request) => {
  const logger = createLogger()

  try {
    // Try to get from sid cookie if available
    if (request.state?.sid) {
      // Try to parse as JSON first
      try {
        const cookieData =
          typeof request.state.sid === 'string'
            ? JSON.parse(request.state.sid)
            : request.state.sid

        if (cookieData?.token) {
          return cookieData.token
        }
      } catch (e) {
        logger.warn('Could not parse sid cookie as JSON')
      }
    }

    // Look through all state cookies for potential token
    if (request.state) {
      for (const value of Object.values(request.state)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          typeof value.token === 'string' &&
          value.token.length > 20
        ) {
          return value.token
        }
      }
    }

    return null
  } catch (error) {
    logger.error('Error extracting token from cookies')
    return null
  }
}

/**
 * Gets a properly formatted bearer token from request credentials
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {Promise<string|null>} Bearer token or null if not found
 */
export const getBearerToken = async (request) => {
  const logger = createLogger()
  let token = null

  try {
    if (!request?.auth?.isAuthenticated) {
      // Try emergency direct cookie extraction anyway
      return extractTokenFromCookie(request)
    }

    // Method 1: Direct from credentials
    if (request.auth.credentials?.token) {
      token = request.auth.credentials.token
    }

    // Method 2: From cached session
    if (!token && request.auth.credentials?.id && request.server?.app?.cache) {
      try {
        const cached = await request.server.app.cache.get(
          request.auth.credentials.id
        )
        if (cached?.token) {
          token = cached.token
        }
      } catch (cacheError) {
        logger.error('Error accessing token from cache')
      }
    }

    // Method 3: From getUserSession method
    if (!token && typeof request.getUserSession === 'function') {
      try {
        const session = await request.getUserSession()
        if (session?.token) {
          token = session.token
        }
      } catch (sessionError) {
        logger.error('Error getting token from user session')
      }
    }

    // Method 4: Last resort - direct cookie extraction
    if (!token) {
      token = extractTokenFromCookie(request)
    }

    // Clean up token if found
    if (token && typeof token === 'string') {
      // Remove any existing "Bearer " prefix
      return token.replace(/^Bearer\s+/i, '').trim()
    }

    return null
  } catch (error) {
    logger.error('Error extracting bearer token')
    return null
  }
}

export default getBearerToken
