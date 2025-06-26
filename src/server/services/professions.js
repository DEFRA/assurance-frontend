import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { config } from '~/src/config/config.js'

/**
 * Get all professions
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<Array>} - The professions
 */
export async function getProfessions(request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/professions`
      : '/professions'
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
 * @returns {Promise<Object|null>} - The profession or null if not found
 */
export async function getProfessionById(id, request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/professions/${id}`
      : `/professions/${id}`
    logger.info({ endpoint, id }, 'Fetching profession by ID from API')

    let data
    if (request) {
      logger.info(
        '[API_AUTH] Using authenticated fetcher for profession by ID API'
      )
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      logger.warn(
        '[API_AUTH] No request context provided, using unauthenticated fetcher'
      )
      data = await fetcher(endpoint)
    }

    logger.info({ id }, 'Profession retrieved successfully by ID')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to fetch profession by ID'
    )
    throw error
  }
}

/**
 * Soft delete a profession
 * @param {string} id - The profession ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteProfession(id, request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/professions/${id}`
      : `/professions/${id}`
    logger.info({ endpoint, id }, 'Soft deleting profession')

    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, { method: 'DELETE' })
    } else {
      await fetcher(endpoint, { method: 'DELETE' })
    }

    logger.info({ id }, 'Profession soft deleted successfully')
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to soft delete profession'
    )
    throw error
  }
}

/**
 * Get all professions including inactive ones (for admin use)
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<Array>} - All professions including inactive
 */
export async function getAllProfessions(request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/professions?includeInactive=true`
      : '/professions?includeInactive=true'
    logger.info(
      { endpoint },
      'Fetching all professions (including inactive) from API'
    )

    let data
    if (request) {
      logger.info(
        '[API_AUTH] Using authenticated fetcher for all professions API'
      )
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

    logger.info(
      { count: data.length },
      'All professions (including inactive) retrieved successfully'
    )
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch all professions'
    )
    throw error
  }
}

/**
 * Restore a soft-deleted profession
 * @param {string} id - The profession ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<boolean>} - Success status
 */
export async function restoreProfession(id, request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/professions/${id}/restore`
      : `/professions/${id}/restore`
    logger.info({ endpoint, id }, 'Restoring profession')

    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, { method: 'POST' })
    } else {
      await fetcher(endpoint, { method: 'POST' })
    }

    logger.info({ id }, 'Profession restored successfully')
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to restore profession'
    )
    throw error
  }
}
