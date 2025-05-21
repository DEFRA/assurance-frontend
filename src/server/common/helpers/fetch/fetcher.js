import { fetch as undiciFetch } from 'undici'
import Boom from '@hapi/boom'
import { config } from '~/src/config/config.js'
import { logger as baseLogger } from '~/src/server/common/helpers/logging/logger.js'

export function getApiUrl() {
  const apiUrl = config.get('api.baseUrl')
  return apiUrl
}

async function fetcher(url, options = {}, request) {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`
  const log = request?.logger || baseLogger

  log.info(`Making ${options?.method || 'GET'} request to ${fullUrl}`)

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

    log.info(`Request completed with status ${response.status}: ${fullUrl}`)

    // Handle 204 No Content
    if (response.status === 204) {
      return null
    }

    // Handle 201 Created response
    if (response.status === 201) {
      const text = await response.text()
      return text ? JSON.parse(text) : null
    }

    if (!response.ok) {
      return Boom.boomify(new Error(response.statusText), {
        statusCode: response.status
      })
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const text = await response.text()
      return text ? JSON.parse(text) : null
    }

    return { ok: response.ok, status: response.status }
  } catch (error) {
    // Better logging for connection errors
    if (error.name === 'AbortError') {
      log.error({ url: fullUrl }, 'API request timed out after 5 seconds')
    } else if (error.code === 'ECONNREFUSED') {
      log.error(
        { url: fullUrl },
        'API connection refused - service may be unavailable'
      )
    } else {
      log.error(
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
