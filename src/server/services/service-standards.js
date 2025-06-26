import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { config } from '~/src/config/config.js'

export async function getServiceStandards(request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/servicestandards`
      : '/serviceStandards'
    logger.info({ endpoint }, 'Fetching service standards from API')

    let data
    if (request) {
      logger.info('[API_AUTH] Using authenticated fetcher for standards API')
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
      'Service standards retrieved successfully'
    )
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch service standards'
    )
    throw error
  }
}

/**
 * Get all service standards including inactive ones (for admin use)
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<Array>} - All service standards including inactive
 */
export async function getAllServiceStandards(request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/servicestandards?includeInactive=true`
      : '/serviceStandards?includeInactive=true'
    logger.info(
      { endpoint },
      'Fetching all service standards (including inactive) from API'
    )

    let data
    if (request) {
      logger.info(
        '[API_AUTH] Using authenticated fetcher for all standards API'
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
      'All service standards (including inactive) retrieved successfully'
    )
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch all service standards'
    )
    throw error
  }
}

/**
 * Soft delete a service standard
 * @param {string} id - The standard ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteServiceStandard(id, request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/servicestandards/${id}`
      : `/serviceStandards/${id}`
    logger.info({ endpoint, id }, 'Soft deleting service standard')

    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, { method: 'DELETE' })
    } else {
      await fetcher(endpoint, { method: 'DELETE' })
    }

    logger.info({ id }, 'Service standard soft deleted successfully')
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to soft delete service standard'
    )
    throw error
  }
}

/**
 * Restore a soft-deleted service standard
 * @param {string} id - The standard ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<boolean>} - Success status
 */
export async function restoreServiceStandard(id, request) {
  try {
    const apiVersion = config.get('api.version')
    // Use versioned endpoint if version is configured, otherwise use legacy endpoint
    const endpoint = apiVersion
      ? `/api/${apiVersion}/servicestandards/${id}/restore`
      : `/serviceStandards/${id}/restore`
    logger.info({ endpoint, id }, 'Restoring service standard')

    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, { method: 'POST' })
    } else {
      await fetcher(endpoint, { method: 'POST' })
    }

    logger.info({ id }, 'Service standard restored successfully')
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to restore service standard'
    )
    throw error
  }
}
