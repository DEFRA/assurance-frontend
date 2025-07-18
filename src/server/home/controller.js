import Boom from '@hapi/boom'
import { getProjects } from '~/src/server/services/projects.js'
import {
  PAGE_TITLES,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'
import { trackProjectSearch } from '~/src/server/common/helpers/analytics.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { PROJECT_STATUS } from '~/src/server/constants/status.js'

/**
 * A GET route for the homepage
 */
export const homeController = {
  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: async (request, h) => {
    const { notification } = request.query
    const isAuthenticated = request.auth.isAuthenticated

    try {
      request.logger.info('Home page - fetching projects')
      const projects = await getProjects(request)

      // Filter out TBC projects for unauthenticated users
      const visibleProjects = isAuthenticated
        ? projects // Authenticated users see all projects
        : projects.filter((project) => project.status !== PROJECT_STATUS.TBC)

      // Get all project names for autocomplete (from visible projects only)
      const projectNames = visibleProjects.map((project) => project.name)

      // Filter projects if search term is provided
      const search = request.query.search
      const filteredProjects = search
        ? visibleProjects.filter((project) =>
            project.name.toLowerCase().includes(search.toLowerCase())
          )
        : visibleProjects

      // Track search if provided
      if (search) {
        await trackProjectSearch(request, search, filteredProjects.length)
      }

      return h.view(VIEW_TEMPLATES.HOME_INDEX, {
        pageTitle: PAGE_TITLES.HOME,
        projects: filteredProjects,
        searchTerm: search,
        projectNames,
        isAuthenticated,
        notification
      })
    } catch (error) {
      request.logger.error('Error fetching projects for homepage')

      // Throw a 500 error to trigger our professional error page
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
