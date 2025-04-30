import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'

export async function getServiceStandards(request) {
  const logger = createLogger()
  try {
    const endpoint = '/serviceStandards'
    logger.info({ endpoint }, 'Fetching service standards from API')

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint)
    }

    // Handle case where data is null, undefined, or not an array
    if (!data || !Array.isArray(data)) {
      logger.warn('Invalid data returned from API', { data })
      return []
    }

    logger.info(
      { count: data.length },
      'Service standards retrieved successfully'
    )
    if (data.length > 0) {
      logger.info(
        {
          sampleStandard: {
            id: data[0].id,
            name: data[0].name
          }
        },
        'Sample service standard structure'
      )
    }
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
    throw error // Let the controller handle the error
  }
}
