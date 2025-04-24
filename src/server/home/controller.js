import Boom from '@hapi/boom'
import { getProjects } from '~/src/server/services/projects.js'

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
    try {
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
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
