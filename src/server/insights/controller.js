/**
 * Insights Controller
 *
 * Provides data for the weekly prioritisation meeting view.
 * Shows deliveries that need attention based on update history.
 */

import { getPrioritisationData } from '~/src/server/services/insights.js'

/**
 * Insights controller
 */
export const insightsController = {
  /**
   * GET /insights/prioritisation
   * Weekly prioritisation meeting view
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  getPrioritisation: async (request, h) => {
    const { standardThreshold = '14', worseningDays = '14' } = request.query

    try {
      request.logger.info('Insights prioritisation page - loading data')

      // Fetch data from the API
      const data = await getPrioritisationData(request, {
        standardThreshold: parseInt(standardThreshold, 10),
        worseningDays: parseInt(worseningDays, 10)
      })

      // Map API response to view format
      const deliveriesNeedingStandardUpdates =
        data.deliveriesNeedingStandardUpdates || []
      const deliveriesWithWorseningStandards =
        data.deliveriesWithWorseningStandards || []

      request.logger.info(
        `Found ${deliveriesNeedingStandardUpdates.length} deliveries needing updates, ${deliveriesWithWorseningStandards.length} with worsening standards`
      )

      return h.view('insights/views/index', {
        pageTitle: 'Weekly Prioritisation',
        heading: 'Weekly Prioritisation',
        subheading: 'Deliveries requiring attention based on update history',
        deliveriesNeedingStandardUpdates,
        deliveriesWithWorseningStandards,
        thresholds: {
          standard: parseInt(standardThreshold, 10)
        },
        breadcrumbs: [
          { text: 'Home', href: '/' },
          { text: 'Insights', href: '/insights/prioritisation' }
        ]
      })
    } catch (error) {
      request.logger.error('Error loading insights prioritisation page:', error)
      throw error
    }
  }
}
