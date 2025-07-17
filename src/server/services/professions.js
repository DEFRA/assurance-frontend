import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { config } from '~/src/config/config.js'

// API endpoint constants
const API_BASE_PATH = 'professions'
const INCLUDE_INACTIVE_QUERY = '?includeInactive=true'
const RESTORE_PATH = '/restore'

// API configuration constants
const API_VERSION_KEY = 'api.version'
const API_BASE_PREFIX = '/api'

/**
 * Get all professions
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<Array>} - The professions
 */
export async function getProfessions(request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}`
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
 * @returns {Promise<object|null>} - The profession or null if not found
 */
export async function getProfessionById(id, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
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
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
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
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}${INCLUDE_INACTIVE_QUERY}`
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
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}${RESTORE_PATH}`
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

/**
 * Create a new profession
 * @param {object} professionData - The profession data to create
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object>} - The created profession
 */
export async function createProfession(professionData, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}`
    logger.info({ endpoint }, 'Creating new profession')

    let data
    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(professionData)
      })
    } else {
      data = await fetcher(endpoint, {
        method: 'POST',
        body: JSON.stringify(professionData)
      })
    }

    logger.info({ id: data?.id }, 'Profession created successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to create profession'
    )
    throw error
  }
}

/**
 * Update a profession (name only)
 * @param {string} id - The profession ID
 * @param {object} updateData - The data to update (should contain name)
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object>} - The updated profession
 */
export async function updateProfession(id, updateData, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
    logger.info({ endpoint, id }, 'Updating profession')

    let data
    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
    } else {
      data = await fetcher(endpoint, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      })
    }

    logger.info({ id }, 'Profession updated successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to update profession'
    )
    throw error
  }
}
