import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { getApiUrl } from './fetcher.js'

/**
 * Fetch JSON from a given URL with the provided token
 * @param {string} url
 * @param {string} token
 * @param {object} options
 * @returns {Promise<object>}
 */
// Removed authedFetchJson if not used elsewhere

/**
 * Creates a function that can make authenticated API requests using the request's auth token
 * @param {object} request - Hapi request object
 * @returns {Function} - Function that can make authenticated API requests
 */
export function authedFetchJsonDecorator(request) {
  return async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${getApiUrl()}${endpoint}`
    logger.info({ url }, 'Making authenticated API request')

    // Safely get the token if it exists
    const token = request?.auth?.credentials?.token
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      if (!response.ok) {
        const error = new Error(`API request failed: ${response.statusText}`)
        error.status = response.status
        throw error
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null
      }
      const text = await response.text()
      const data = text ? JSON.parse(text) : null
      logger.info(
        { url, status: response.status },
        'Authenticated API request successful'
      )
      return data
    } catch (error) {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          code: error.code,
          url
        },
        'Authenticated API request failed'
      )
      throw error
    }
  }
}
