import { fetch as undiciFetch } from 'undici'
import Boom from '@hapi/boom'
import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export function getApiUrl() {
  const apiUrl = config.get('api.baseUrl')
  return apiUrl
}

async function fetcher(url, options = {}, request) {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`
  const logger = request?.logger || createLogger()

  logger.info(`Making ${options?.method || 'GET'} request to ${fullUrl}`)

  try {
    const response = await undiciFetch(fullUrl, {
      ...options,
      method: options?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      // Add a reasonable timeout
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    logger.info(`Request completed with status ${response.status}: ${fullUrl}`)

    // Handle 201 Created response
    if (response.status === 201) {
      const data = await response.json()
      return data
    }

    if (!response.ok) {
      return Boom.boomify(new Error(response.statusText), {
        statusCode: response.status
      })
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      return data
    }

    return { ok: response.ok, status: response.status }
  } catch (error) {
    // Better logging for connection errors
    if (error.name === 'AbortError') {
      logger.error({ url: fullUrl }, 'API request timed out after 5 seconds')
    } else if (error.code === 'ECONNREFUSED') {
      logger.error(
        { url: fullUrl },
        'API connection refused - service may be unavailable'
      )
    } else {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          code: error.code,
          url: fullUrl
        },
        'API request failed'
      )
    }

    // Return a boom error instead of throwing
    return Boom.boomify(error, {
      statusCode: 503,
      message: 'API service unavailable'
    })
  }
}

export { fetcher }
