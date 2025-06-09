import { logger } from '~/src/server/common/helpers/logging/logger.js'

// Constants for repeated redirect URLs
const LOGIN_REDIRECT_URL = '/auth/login?redirectTo='
const INSUFFICIENT_PERMISSIONS_URL = '/auth/insufficient-permissions'

/**
 * Middleware to ensure user is authenticated
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const requireAuth = (request, h) => {
  try {
    // Check if user is authenticated
    if (!request.auth.isAuthenticated) {
      return h.redirect(`${LOGIN_REDIRECT_URL}${request.url.pathname}`)
    }

    // Get user from session
    const user = request.auth.credentials.user
    if (!user) {
      return h.redirect(`${LOGIN_REDIRECT_URL}${request.url.pathname}`)
    }

    // Add user to request for easy access
    request.user = user
    return h.continue
  } catch (error) {
    logger.error('Authentication error', error)
    return h.redirect(`${LOGIN_REDIRECT_URL}${request.url.pathname}`)
  }
}

/**
 * Middleware to check if user has required role
 * @param {string|string[]} requiredRoles - Single role or array of roles to check against
 * @returns {import('@hapi/hapi').Lifecycle.Method} Hapi lifecycle method
 */
export const requireRole = (requiredRoles) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  return (request, h) => {
    try {
      // Check if user is authenticated
      if (!request.auth.isAuthenticated) {
        return h
          .redirect(`${LOGIN_REDIRECT_URL}${request.url.pathname}`)
          .takeover()
      }

      // Get user from session
      const user = request.auth.credentials.user
      if (!user) {
        return h
          .redirect(`${LOGIN_REDIRECT_URL}${request.url.pathname}`)
          .takeover()
      }

      // Check if user has required role
      const hasRole = roles.some((role) => user.roles?.includes(role))

      if (!hasRole) {
        logger.warn('Access denied - insufficient permissions', {
          requiredRoles: roles,
          userRoles: user.roles || [],
          userId: user.id,
          path: request.url.pathname,
          userEmail: user.email
        })

        return h.redirect(INSUFFICIENT_PERMISSIONS_URL).takeover()
      }

      // Add user to request for easy access
      request.user = user
      return h.continue
    } catch (error) {
      logger.error('Authorization error', error)
      return h.redirect(INSUFFICIENT_PERMISSIONS_URL).takeover()
    }
  }
}

/**
 * Middleware to ensure user has admin role
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const requireAdmin = (request, h) => {
  try {
    // Check if user is authenticated
    if (!request.auth.isAuthenticated) {
      return h
        .redirect(`${LOGIN_REDIRECT_URL}${request.url.pathname}`)
        .takeover()
    }

    // Get user from session
    const user = request.auth.credentials.user
    if (!user) {
      return h
        .redirect(`${LOGIN_REDIRECT_URL}${request.url.pathname}`)
        .takeover()
    }

    // Check if user has admin role
    if (!user.roles?.includes('admin')) {
      return h.redirect(INSUFFICIENT_PERMISSIONS_URL).takeover()
    }

    // Add user to request for easy access
    request.user = user
    return h.continue
  } catch (error) {
    logger.error('Admin authorization error', error)
    return h.redirect(INSUFFICIENT_PERMISSIONS_URL).takeover()
  }
}
