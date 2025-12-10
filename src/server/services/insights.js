import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { config } from '~/src/config/config.js'
import { API_AUTH_MESSAGES } from '~/src/server/common/constants/log-messages.js'

// API endpoint constants
const API_BASE_PATH = 'insights'
const PRIORITISATION_PATH = 'prioritisation'

// API configuration constants
const API_VERSION_KEY = 'api.version'
const API_BASE_PREFIX = '/api'

/**
 * Get prioritisation data for weekly meetings
 * @param {import('@hapi/hapi').Request} request - The Hapi request object
 * @param {object} options - Query options
 * @param {number} [options.standardThreshold] - Days threshold for stale deliveries (default: 14)
 * @param {number} [options.worseningDays] - Days to look back for worsening standards (default: 14)
 * @returns {Promise<object>} - Prioritisation data
 */
export async function getPrioritisationData(request, options = {}) {
  const { standardThreshold = 14, worseningDays = 14 } = options

  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const queryParams = new URLSearchParams({
      standardThreshold: standardThreshold.toString(),
      worseningDays: worseningDays.toString()
    })
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${PRIORITISATION_PATH}?${queryParams.toString()}`

    logger.info({ endpoint }, 'Fetching prioritisation data from API')

    if (!request) {
      logger.error('No request context provided for prioritisation API')
      throw new Error('Request context is required for prioritisation API')
    }

    logger.info(
      `${API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER} for insights API`
    )
    const authedFetch = authedFetchJsonDecorator(request)
    const data = await authedFetch(endpoint)

    if (!data) {
      logger.warn('No data returned from prioritisation API')
      return {
        deliveriesNeedingStandardUpdates: [],
        deliveriesWithWorseningStandards: []
      }
    }

    logger.info(
      {
        needingUpdates: data.deliveriesNeedingStandardUpdates?.length ?? 0,
        worsening: data.deliveriesWithWorseningStandards?.length ?? 0
      },
      'Prioritisation data retrieved successfully'
    )

    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch prioritisation data'
    )
    throw error
  }
}
