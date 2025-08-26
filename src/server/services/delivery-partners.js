import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { config } from '~/src/config/config.js'
import { API_AUTH_MESSAGES } from '~/src/server/common/constants/log-messages.js'

// API endpoint constants
const API_BASE_PATH = 'deliverypartners'

// API configuration constants
const API_VERSION_KEY = 'api.version'
const API_BASE_PREFIX = '/api'

/**
 * Generate a unique ID from a name
 * @param {string} name - The name to generate ID from
 * @returns {string} - Generated ID
 */
function generateId(name) {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') +
    '-' +
    Date.now()
  )
}

/**
 * Get all active delivery partners
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<Array>} - The active delivery partners
 */
export async function getDeliveryPartners(request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}`
    logger.info({ endpoint }, 'Fetching delivery partners from API')

    let data
    if (request) {
      logger.info(
        `${API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER} for delivery partners API`
      )
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      logger.warn(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT)
      data = await fetcher(endpoint)
    }

    if (!data || !Array.isArray(data)) {
      logger.warn('Invalid data returned from API', { data })
      return []
    }

    // Filter to only active partners and sort by created date (newest first)
    const activePartners = data
      .filter((partner) => partner.isActive !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    logger.info(
      { count: activePartners.length },
      'Active delivery partners retrieved successfully'
    )
    return activePartners
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch delivery partners'
    )
    throw error
  }
}

/**
 * Get all delivery partners including inactive ones (for admin use)
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<Array>} - All delivery partners including inactive
 */
export async function getAllDeliveryPartners(request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}`
    logger.info(
      { endpoint },
      'Fetching all delivery partners (including inactive) from API'
    )

    let data
    if (request) {
      logger.info(
        `${API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER} for all delivery partners API`
      )
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      logger.warn(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT)
      data = await fetcher(endpoint)
    }

    if (!data || !Array.isArray(data)) {
      logger.warn('Invalid data returned from API', { data })
      return []
    }

    // Sort by created date (newest first) - includes both active and inactive
    const sortedPartners = data.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )

    logger.info(
      { count: sortedPartners.length },
      'All delivery partners retrieved successfully'
    )
    return sortedPartners
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch all delivery partners'
    )
    throw error
  }
}

/**
 * Get delivery partner by ID
 * @param {string} id - The delivery partner ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object|null>} - The delivery partner or null if not found
 */
export async function getDeliveryPartnerById(id, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
    logger.info({ endpoint, id }, 'Fetching delivery partner by ID from API')

    let data
    if (request) {
      logger.info(
        `${API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER} for delivery partner by ID API`
      )
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      logger.warn(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT)
      data = await fetcher(endpoint)
    }

    logger.info({ id }, 'Delivery partner retrieved successfully by ID')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to fetch delivery partner by ID'
    )
    throw error
  }
}

/**
 * Create a new delivery partner
 * @param {object} deliveryPartnerData - The delivery partner data to create
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object>} - The created delivery partner
 */
export async function createDeliveryPartner(deliveryPartnerData, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}`
    logger.info({ endpoint }, 'Creating new delivery partner')

    // Transform frontend data structure to match backend DeliveryPartnerModel
    const deliveryPartnerModel = {
      Id: deliveryPartnerData.id || generateId(deliveryPartnerData.name),
      Name: deliveryPartnerData.name,
      IsActive:
        deliveryPartnerData.isActive !== undefined
          ? deliveryPartnerData.isActive
          : true,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    }

    logger.info(
      { model: deliveryPartnerModel },
      'Transformed delivery partner data for backend'
    )

    let data
    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(deliveryPartnerModel)
      })
    } else {
      data = await fetcher(endpoint, {
        method: 'POST',
        body: JSON.stringify(deliveryPartnerModel)
      })
    }

    logger.info({ id: data?.id }, 'Delivery partner created successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to create delivery partner'
    )
    throw error
  }
}

/**
 * Update a delivery partner
 * @param {string} id - The delivery partner ID
 * @param {object} updateData - The data to update
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object>} - The updated delivery partner
 */
export async function updateDeliveryPartner(id, updateData, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
    logger.info({ endpoint, id }, 'Updating delivery partner')

    // Transform frontend data structure to match backend DeliveryPartnerModel
    const deliveryPartnerModel = {
      Id: id,
      Name: updateData.name,
      IsActive: updateData.isActive !== undefined ? updateData.isActive : true,
      UpdatedAt: new Date().toISOString()
    }

    // Only include CreatedAt if provided (preserve existing value)
    if (updateData.createdAt) {
      deliveryPartnerModel.CreatedAt = updateData.createdAt
    }

    logger.info(
      { model: deliveryPartnerModel },
      'Transformed update data for backend'
    )

    let data
    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(deliveryPartnerModel)
      })
    } else {
      data = await fetcher(endpoint, {
        method: 'PUT',
        body: JSON.stringify(deliveryPartnerModel)
      })
    }

    logger.info({ id }, 'Delivery partner updated successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to update delivery partner'
    )
    throw error
  }
}

/**
 * Soft delete a delivery partner (sets isActive to false)
 * @param {string} id - The delivery partner ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteDeliveryPartner(id, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
    logger.info({ endpoint, id }, 'Soft deleting delivery partner')

    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, { method: 'DELETE' })
    } else {
      await fetcher(endpoint, { method: 'DELETE' })
    }

    logger.info({ id }, 'Delivery partner soft deleted successfully')
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to soft delete delivery partner'
    )
    throw error
  }
}

/**
 * Restore a soft-deleted delivery partner (sets isActive to true)
 * Note: Backend doesn't have explicit restore endpoint, so we use update
 * @param {string} id - The delivery partner ID
 * @param {import('@hapi/hapi').Request} [request] - The Hapi request object
 * @returns {Promise<object>} - The restored delivery partner
 */
export async function restoreDeliveryPartner(id, request) {
  try {
    logger.info({ id }, 'Restoring delivery partner')

    // First get the current partner data
    const currentPartner = await getDeliveryPartnerById(id, request)
    if (!currentPartner) {
      throw new Error(`Delivery partner with ID ${id} not found`)
    }

    // Update with isActive: true to restore
    const restoredPartner = await updateDeliveryPartner(
      id,
      {
        ...currentPartner,
        isActive: true
      },
      request
    )

    logger.info({ id }, 'Delivery partner restored successfully')
    return restoredPartner
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to restore delivery partner'
    )
    throw error
  }
}
