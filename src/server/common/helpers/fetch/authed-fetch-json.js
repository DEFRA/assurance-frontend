import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'
import { getBearerToken } from '~/src/server/common/helpers/auth/get-token.js'

/**
 * Fetch JSON from a given URL with the provided token
 * @param {string} url
 * @param {string} token
 * @param {object} options
 * @returns {Promise<object>}
 */
async function authedFetchJson(url, token, options = {}) {
  const logger = createLogger()
  const apiUrl = getApiUrl()
  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`

  // Set up default headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  // Add auth token if provided
  if (token) {
    // Remove any existing "Bearer " prefix and ensure it's properly formatted
    const cleanToken =
      typeof token === 'string'
        ? token.replace(/^Bearer\s+/i, '').trim()
        : token

    if (cleanToken !== token) {
      logger.info('Token was cleaned up before sending to API', {
        originalLength: token.length,
        cleanedLength: cleanToken.length
      })
    }

    headers.Authorization = `Bearer ${cleanToken}`
    logger.info('Added authorization header to request', {
      url: fullUrl,
      tokenLength: cleanToken.length
    })
  } else {
    logger.warn('No token provided for authenticated request', { url: fullUrl })
  }

  // Merge our headers with options
  const mergedOptions = {
    ...options,
    headers
  }

  try {
    const response = await fetch(fullUrl, mergedOptions)

    // Handle common HTTP errors
    if (!response.ok) {
      const errorText = await response.text()

      // Special handling for 401/403 responses
      if (response.status === 401 || response.status === 403) {
        logger.error('Authentication error - Token may be invalid or expired', {
          status: response.status,
          error: errorText,
          url: fullUrl
        })
      }

      throw new Error(`API Error: ${response.status} ${errorText}`)
    }

    // Parse the JSON response
    if (response.headers.get('content-type')?.includes('application/json')) {
      return await response.json()
    }

    return response.text()
  } catch (error) {
    logger.error(`Error fetching data from API: ${error.message}`, {
      url: fullUrl,
      error: error.message
    })
    throw error
  }
}

/**
 * Returns a function that fetches data with the authenticated user's token
 * @param {object} request - Hapi request object
 * @returns {Function}
 */
function authedFetchJsonDecorator(request) {
  const logger = createLogger()

  return async (url, options = {}) => {
    let token = null

    try {
      token = await getBearerToken(request)
    } catch (error) {
      logger.error('Failed to get bearer token')
    }

    return authedFetchJson(url, token, options)
  }
}

/**
 * Gets the API URL from configuration
 * @returns {string} API URL
 */
function getApiUrl() {
  return config.get('api.baseUrl')
}

export { authedFetchJsonDecorator, authedFetchJson }
