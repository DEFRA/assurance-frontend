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
    const { search } = request.query
    const logger = createLogger()
    const isAuthenticated = request.auth?.isAuthenticated || false

    try {
      logger.info('Home page - fetching projects')
      const projects = await getProjects()

      // Get all project names for autocomplete
      const projectNames = projects.map((project) => project.name)

      // Filter projects if search term is provided
      const filteredProjects = search
        ? projects.filter((project) =>
            project.name.toLowerCase().includes(search.toLowerCase())
          )
        : projects

      return h.view('home/index', {
        pageTitle: 'Projects | DDTS Assurance',
        projects: filteredProjects,
        searchTerm: search,
        projectNames,
        isAuthenticated
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
        searchTerm: search,
        projectNames: [],
        description:
          'Unable to load projects at this time. Please try again later.',
        isAuthenticated
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
