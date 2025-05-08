import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Gets token from request credentials
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {string|null} Token or null if not found
 */
const getTokenFromCredentials = (request) => {
  if (!request?.auth?.credentials?.token) {
    return null
  }

  const token = request.auth.credentials.token.replace(/^Bearer\s+/i, '').trim()
  logger.debug('Token found in credentials')
  return token
}

/**
 * Gets token from session cache
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {Promise<string|null>} Token or null if not found
 */
const getTokenFromSessionCache = async (request) => {
  if (!request?.auth?.credentials?.id || !request?.server?.app?.sessionCache) {
    return null
  }

  try {
    const cached = await request.server.app.sessionCache.get(
      request.auth.credentials.id
    )

    if (!cached?.token) {
      return null
    }

    const token = cached.token.replace(/^Bearer\s+/i, '').trim()
    logger.debug('Token found in session cache')
    return token
  } catch (cacheError) {
    logger.error('Error accessing token from cache', {
      error: cacheError.message
    })
    return null
  }
}

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

    // Try to get token from credentials first
    const credentialsToken = getTokenFromCredentials(request)
    if (credentialsToken) {
      return credentialsToken
    }

    // Fall back to session cache
    const sessionToken = await getTokenFromSessionCache(request)
    if (sessionToken) {
      return sessionToken
    }

    logger.debug('No valid token found')
    return null
  } catch (error) {
    logger.error('Error extracting bearer token', { error: error.message })
    return null
  }
}

export default getBearerToken
