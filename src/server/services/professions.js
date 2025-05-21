import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'

/**
 * Get all professions
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<Array>} - The professions
 */
export async function getProfessions(request) {
  try {
    const endpoint = '/professions'
    logger.info({ endpoint }, 'Fetching professions from API')

    let data
    if (request) {
      logger.info('[API_AUTH] Using authenticated fetcher for professions API')
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      logger.warn(
        '[API_AUTH] No request context provided, using unauthenticated fetcher'
      )
      data = await fetcher(endpoint)
    }

    if (!data || !Array.isArray(data)) {
      logger.warn('Invalid data returned from API', { data })
      return []
    }

    logger.info({ count: data.length }, 'Professions retrieved successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch professions'
    )
    throw error
  }
}

/**
 * Get profession by ID
 * @param {string} id - The profession ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object>} - The profession
 */
export async function getProfessionById(id, request) {
  try {
    const endpoint = `/professions/${id}`
    logger.info({ endpoint, id }, 'Fetching profession from API')

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint)
    }

    if (!data) {
      logger.warn('Profession not found', { id })
      return null
    }

    logger.info({ profession: data }, 'Profession retrieved successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to fetch profession'
    )
    throw error
  }
}

/**
 * Delete profession
 * @param {string} id - The profession ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object>} - Result of deletion
 */
export async function deleteProfession(id, request) {
  try {
    const endpoint = `/professions/${id}`
    logger.info({ endpoint, id }, 'Deleting profession')

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint, { method: 'DELETE' })
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint, { method: 'DELETE' })
    }

    logger.info({ profession: data }, 'Profession deleted successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to delete profession'
    )
    throw error
  }
}
