import Boom from '@hapi/boom'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Middleware to ensure user is authenticated
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const requireAuth = (request, h) => {
  try {
    // Check if user is authenticated
    if (!request.auth.isAuthenticated) {
      return h.redirect(`/auth/login?redirectTo=${request.url.pathname}`)
    }

    // Get user from session
    const user = request.auth.credentials.user
    if (!user) {
      return h.redirect(`/auth/login?redirectTo=${request.url.pathname}`)
    }

    // Add user to request for easy access
    request.user = user
    return h.continue
  } catch (error) {
    logger.error('Authentication error', error)
    return h.redirect(`/auth/login?redirectTo=${request.url.pathname}`)
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
        return h.redirect(`/auth/login?redirectTo=${request.url.pathname}`)
      }

      // Get user from session
      const user = request.auth.credentials.user
      if (!user) {
        return h.redirect(`/auth/login?redirectTo=${request.url.pathname}`)
      }

      // Check if user has required role
      const hasRole = roles.some((role) => user.roles?.includes(role))
      logger.debug('Role check', {
        requiredRoles: roles,
        userRoles: user.roles || [],
        hasRequiredRole: hasRole,
        userId: user.id,
        path: request.url.pathname
      })

      if (!hasRole) {
        throw Boom.forbidden('Insufficient permissions')
      }

      // Add user to request for easy access
      request.user = user
      return h.continue
    } catch (error) {
      if (error.isBoom) {
        throw error
      }
      logger.error('Authorization error', error)
      return h.redirect(`/auth/login?redirectTo=${request.url.pathname}`)
    }
  }
}
