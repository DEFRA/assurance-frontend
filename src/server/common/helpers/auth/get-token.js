import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Gets a properly formatted bearer token from request credentials
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {Promise<string|null>} Bearer token or null if not found
 */
export const getBearerToken = async (request) => {
  try {
    if (!request?.auth?.isAuthenticated) {
      logger.debug('Request is not authenticated')
      return null
    }

    // Get token from credentials
    if (request.auth.credentials?.token) {
      const token = request.auth.credentials.token
        .replace(/^Bearer\s+/i, '')
        .trim()
      logger.debug('Token found in credentials')
      return token
    }

    // Try to get token from session
    if (request.auth.credentials?.id && request.server?.app?.sessionCache) {
      try {
        const cached = await request.server.app.sessionCache.get(
          request.auth.credentials.id
        )
        if (cached?.token) {
          const token = cached.token.replace(/^Bearer\s+/i, '').trim()
          logger.debug('Token found in session cache')
          return token
        }
      } catch (cacheError) {
        logger.error('Error accessing token from cache', {
          error: cacheError.message
        })
      }
    }

    logger.debug('No valid token found')
    return null
  } catch (error) {
    logger.error('Error extracting bearer token', { error: error.message })
    return null
  }
}

export default getBearerToken
