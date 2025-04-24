import Boom from '@hapi/boom'

/**
 * Safely sets a value in cookieAuth
 * @param {import('@hapi/hapi').Request} request
 * @param {string} key
 * @param {any} value
 */
const safeSetCookie = (request, key, value) => {
  if (request.cookieAuth && typeof request.cookieAuth.set === 'function') {
    request.cookieAuth.set(key, value)
    return true
  }
  return false
}

/**
 * Middleware to ensure user is authenticated
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const requireAuth = (request, h) => {
  try {
    // Check if user is authenticated
    if (!request.auth.isAuthenticated) {
      // Store the original URL to redirect back after login
      safeSetCookie(request, 'redirect_to', request.url.pathname)
      return h.redirect('/auth/login')
    }

    // Get user from session
    const user = request.auth.credentials.user

    if (!user) {
      safeSetCookie(request, 'redirect_to', request.url.pathname)
      return h.redirect('/auth/login')
    }

    request.user = user
    return h.continue
  } catch (error) {
    // Only store redirect URL if not already authenticated
    if (!request.auth.isAuthenticated) {
      safeSetCookie(request, 'redirect_to', request.url.pathname)
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
        safeSetCookie(request, 'redirect_to', request.url.pathname)
        return h.redirect('/auth/login')
      }

      const user = request.auth.credentials.user
      if (!user) {
        safeSetCookie(request, 'redirect_to', request.url.pathname)
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
      safeSetCookie(request, 'redirect_to', request.url.pathname)
      return h.redirect('/auth/login')
    }
  }
}
