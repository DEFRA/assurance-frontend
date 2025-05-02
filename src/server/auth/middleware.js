import Boom from '@hapi/boom'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { setCookie } from '~/src/server/common/helpers/cookie-manager.js'

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
      setCookie(request, 'redirect_to', request.url.pathname)
      return h.redirect('/auth/login')
    }

    // Get user from session
    const user = request.auth.credentials.user
    if (!user) {
      setCookie(request, 'redirect_to', request.url.pathname)
      return h.redirect('/auth/login')
    }

    request.user = user
    return h.continue
  } catch (error) {
    logger.error('Authentication error')
    if (!request.auth.isAuthenticated) {
      setCookie(request, 'redirect_to', request.url.pathname)
    }
    return h.redirect('/auth/login')
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
      if (!request.auth.isAuthenticated) {
        setCookie(request, 'redirect_to', request.url.pathname)
        return h.redirect('/auth/login')
      }

      const user = request.auth.credentials.user
      if (!user) {
        setCookie(request, 'redirect_to', request.url.pathname)
        return h.redirect('/auth/login')
      }

      const hasRole = roles.some((role) => user.roles?.includes(role))
      if (!hasRole) {
        throw Boom.forbidden('Insufficient permissions')
      }

      request.user = user
      return h.continue
    } catch (error) {
      if (error.isBoom) {
        throw error
      }
      setCookie(request, 'redirect_to', request.url.pathname)
      return h.redirect('/auth/login')
    }
  }
}
