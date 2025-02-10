import { fetch as undiciFetch } from 'undici'
import Boom from '@hapi/boom'
import { config } from '~/src/config/config.js'

export function getApiUrl() {
  const apiUrl = config.get('api.baseUrl')
  return apiUrl
}

async function fetcher(url, options = {}, request) {
  const fullUrl = url.startsWith('http') ? url : `${getApiUrl()}${url}`
  const logger = request?.logger || console

  logger.info(`Making ${options?.method || 'GET'} request to ${fullUrl}`)

  try {
    const response = await undiciFetch(fullUrl, {
      ...options,
      method: options?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
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
    logger.error(error)
    throw Boom.boomify(error, { statusCode: 500 })
  }
}

export { fetcher }
