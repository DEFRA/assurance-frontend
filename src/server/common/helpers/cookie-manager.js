import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

const defaultCookieOptions = {
  ttl: config.get('session.cookie.ttl'),
  isSecure: config.get('session.cookie.secure'),
  isHttpOnly: true,
  path: '/',
  isSameSite: 'Lax',
  encoding: 'none'
}

/**
 * Safely sets a value in cookieAuth
 * @param {import('@hapi/hapi').Request} request
 * @param {string} key
 * @param {any} value
 */
export const setCookie = (request, key, value) => {
  if (request.cookieAuth && typeof request.cookieAuth.set === 'function') {
    try {
      request.cookieAuth.set(key, value)
      return true
    } catch (error) {
      logger.error({ key, error: error.message }, 'Error setting cookie value')
      return false
    }
  }
  return false
}

/**
 * Safely gets a value from cookieAuth
 * @param {import('@hapi/hapi').Request} request
 * @param {string} key
 * @returns {any}
 */
export const getCookie = (request, key) => {
  if (request.cookieAuth && typeof request.cookieAuth.get === 'function') {
    try {
      return request.cookieAuth.get(key)
    } catch (error) {
      logger.error({ key, error: error.message }, 'Error getting cookie value')
      return undefined
    }
  }
  return undefined
}

/**
 * Safely clears a value or the entire cookieAuth
 * @param {import('@hapi/hapi').Request} request
 * @param {string} [key]
 */
export const clearCookie = (request, key) => {
  if (request.cookieAuth && typeof request.cookieAuth.clear === 'function') {
    try {
      if (key) {
        request.cookieAuth.clear(key)
      } else {
        request.cookieAuth.clear()
      }
      return true
    } catch (error) {
      logger.error({ key, error: error.message }, 'Error clearing cookie')
      return false
    }
  }
  return false
}

/**
 * Sets a regular cookie (not using cookieAuth)
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {string} name
 * @param {string} value
 * @param {object} [options] - Override default cookie options
 */
export const setResponseCookie = (h, name, value, options = {}) => {
  try {
    logger.info('Setting response cookie:', { name, value, options })
    h.state(name, value, { ...defaultCookieOptions, ...options })
  } catch (error) {
    logger.error('Error setting response cookie:', {
      name,
      error: error.message
    })
  }
}

/**
 * Clears a regular cookie from the response
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {string} name
 * @param {object} [options] - Override default cookie options
 */
export const clearResponseCookie = (h, name, options = {}) => {
  try {
    logger.info('Clearing response cookie:', { name, options })
    h.unstate(name, { ...defaultCookieOptions, ...options })
  } catch (error) {
    logger.error('Error clearing response cookie:', {
      name,
      error: error.message
    })
  }
}
