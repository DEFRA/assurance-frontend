import Boom from '@hapi/boom'
import { getProjects } from '~/src/server/services/projects.js'

/**
 * A GDS styled example home page controller.
 * @satisfies {Partial<ServerRoute>}
 */
export const homeController = {
  handler: async (request, h) => {
    request.logger.info('Fetching projects using projects service')

    let projects = []
    try {
      const result = await getProjects()
      // Ensure projects is always an array
      projects = Array.isArray(result) ? result : []
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }

    return h.view('home/index', {
      pageTitle: 'DDTS Technical Assurance Dashboard',
      heading: 'DDTS Technical Assurance Dashboard',
      projects: projects.map((project) => ({
        id: project?.id || '',
        name: project?.name || '',
        status: project?.status || '',
        lastUpdated: project?.lastUpdated || '',
        actions: 'View details'
      }))
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
