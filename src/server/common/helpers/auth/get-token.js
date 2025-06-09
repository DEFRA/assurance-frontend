import { logger } from '~/src/server/common/helpers/logging/logger.js'

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
 * Gets Bearer token from request object (credentials or headers)
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {string|null} Bearer token or null if not found
 */
export const getBearerToken = (request) => {
  // First try to get from credentials (if user is authenticated)
  let token = getTokenFromCredentials(request)
  if (token) {
    return token
  }

  // Fallback to Authorization header
  const authHeader = request.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace(/^Bearer\s+/i, '').trim()
    logger.debug('Token found in Authorization header')
    return token
  }

  logger.debug('No Bearer token found in request')
  return null
}

export default getBearerToken
