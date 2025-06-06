import { getProjects } from '~/src/server/services/projects.js'
import {
  PAGE_TITLES,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

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
    const logger = createLogger()

    try {
      logger.info('Home page - fetching projects')
      const projects = await getProjects(request)

      // Get all project names for autocomplete
      const projectNames = projects.map((project) => project.name)

      // Filter projects if search term is provided
      const search = request.query.search
      const filteredProjects = search
        ? projects.filter((project) =>
            project.name.toLowerCase().includes(search.toLowerCase())
          )
        : projects

      return h.view(VIEW_TEMPLATES.HOME_INDEX, {
        pageTitle: PAGE_TITLES.HOME,
        projects: filteredProjects,
        searchTerm: search,
        projectNames,
        isAuthenticated,
        notification
      })
    } catch (error) {
      logger.error('Error fetching projects for homepage')

      // Still render the page but without projects
      return h.view(VIEW_TEMPLATES.HOME_INDEX, {
        pageTitle: PAGE_TITLES.HOME,
        projects: [],
        searchTerm: request.query.search,
        projectNames: [],
        isAuthenticated,
        notification,
        error: 'Unable to load projects at this time'
      })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
