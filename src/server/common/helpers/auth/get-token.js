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

/**
 * Check if the current token is about to expire
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {boolean} True if token expires within 5 minutes
 */
export const isTokenExpiringSoon = (request) => {
  const credentials = request.auth?.credentials
  if (!credentials?.tokenExpires) {
    return false
  }

  const refreshThreshold = 5 * 60 * 1000 // 5 minutes
  return credentials.tokenExpires < Date.now() + refreshThreshold
}

export default getBearerToken
