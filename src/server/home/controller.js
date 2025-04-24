import { getProjects } from '~/src/server/services/projects.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

/**
 * A GDS styled example home page controller.
 * @satisfies {Partial<ServerRoute>}
 */
export const homeController = {
  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: async (request, h) => {
    const { tag } = request.query
    const logger = createLogger()

    try {
      logger.info('Home page - fetching projects')
      const projects = await getProjects()

      // Filter projects if tag is provided
      const filteredProjects = tag
        ? projects.filter((project) =>
            project.tags?.some((t) =>
              t.toLowerCase().includes(tag.toLowerCase())
            )
          )
        : projects

      return h.view('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: filteredProjects.map((project) => ({
          ...project,
          actions: 'View details'
        })),
        currentTag: tag
      })
    } catch (error) {
      logger.error(
        {
          error: error.message,
          stack: error.stack
        },
        'Error fetching projects for home page'
      )

      // Instead of throwing an error, display the page with an error message
      return h.view('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: [],
        currentTag: tag,
        description:
          'Unable to load projects at this time. Please try again later.'
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
