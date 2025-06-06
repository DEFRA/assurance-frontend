import Boom from '@hapi/boom'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import {
  getProjects,
  deleteProject,
  getProjectById
} from '~/src/server/services/projects.js'
import { getProfessions } from '~/src/server/services/professions.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProfessions } from '~/src/server/data/professions.js'
import { config } from '~/src/config/config.js'
import {
  NOTIFICATIONS,
  PAGE_TITLES,
  HEADINGS,
  VIEW_TEMPLATES,
  ADMIN_NOTIFICATIONS,
  LOG_MESSAGES
} from '~/src/server/constants/notifications.js'

export const adminController = {
  get: async (request, h) => {
    try {
      let standards = []
      let projects = []
      let professions = []

      // Try to get standards from API, fall back to defaults if not available
      try {
        standards = (await getServiceStandards(request)) || []
      } catch (error) {
        request.logger.warn(
          { error },
          'Could not fetch standards from API, using defaults'
        )
        standards = defaultServiceStandards
      }

      try {
        projects = (await getProjects(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching projects')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      try {
        professions = (await getProfessions(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching professions')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      // Get environment from config or use a default for testing
      const isTestEnvironment = config.get
        ? config.get('env') === 'test'
        : false

      const isDevelopment = config.get
        ? config.get('env') === 'development'
        : false

      return h.view(VIEW_TEMPLATES.ADMIN_INDEX, {
        pageTitle: PAGE_TITLES.DATA_MANAGEMENT,
        heading: HEADINGS.DATA_MANAGEMENT,
        standardsCount: standards?.length || 0,
        projectsCount: projects?.length || 0,
        professionsCount: professions?.length || 0,
        projects,
        notification: request.query.notification,
        isTestEnvironment,
        isDevelopment
      })
    } catch (error) {
      request.logger.error({ error }, 'Error fetching admin dashboard data')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  deleteStandards: async (request, h) => {
    try {
      request.logger.info(LOG_MESSAGES.STANDARDS_DELETED)

      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify([])
      })

      request.logger.info(LOG_MESSAGES.STANDARDS_DELETED)
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.STANDARDS_DELETED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, LOG_MESSAGES.FAILED_TO_DELETE_STANDARDS)
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_DELETE_STANDARDS}`
      )
    }
  },

  deleteProject: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ id }, 'Deleting project')

      const result = await deleteProject(id, request)

      if (!result) {
        request.logger.warn({ id }, LOG_MESSAGES.PROJECT_NOT_FOUND_FOR_DELETION)
        return h.redirect(
          `/admin?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`
        )
      }

      request.logger.info({ id }, LOG_MESSAGES.PROJECT_DELETED)
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.PROJECT_DELETED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, LOG_MESSAGES.FAILED_TO_DELETE_PROJECT)
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_DELETE_PROJECT}`
      )
    }
  },

  confirmDeleteProject: async (request, h) => {
    const { id } = request.params

    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteProject(request, h)
      }

      // Otherwise show confirmation page
      let projectName = 'this project'

      try {
        const project = await getProjectById(id, request)
        if (project) {
          projectName = project.name
        }
      } catch (error) {
        request.logger.warn(
          { error, id },
          'Failed to fetch project for confirmation page'
        )
        // Continue with generic name if project fetch fails
      }

      return h.view(VIEW_TEMPLATES.ADMIN_CONFIRM_DELETE, {
        pageTitle: PAGE_TITLES.CONFIRM_PROJECT_DELETION,
        heading: HEADINGS.DELETE_PROJECT,
        message: `Are you sure you want to delete the project "${projectName}"?`,
        confirmUrl: `/admin/projects/${id}/delete`,
        cancelUrl: id ? `/projects/${id}` : '/admin',
        backLink: id ? `/projects/${id}` : '/admin'
      })
    } catch (error) {
      request.logger.error(
        { error },
        LOG_MESSAGES.FAILED_TO_SHOW_DELETE_CONFIRMATION
      )
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SHOW_DELETE_CONFIRMATION}`
      )
    }
  },

  confirmDeleteAllStandards: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteStandards(request, h)
      }

      // Otherwise show confirmation page
      return h.view(VIEW_TEMPLATES.ADMIN_CONFIRM_DELETE, {
        pageTitle: PAGE_TITLES.CONFIRM_DELETE_ALL_STANDARDS,
        heading: HEADINGS.DELETE_ALL_STANDARDS,
        message:
          'Are you sure you want to delete ALL service standards? This will remove all standard definitions from the system.',
        confirmUrl: '/admin/standards/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error(
        { error },
        LOG_MESSAGES.FAILED_TO_SHOW_DELETE_CONFIRMATION
      )
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SHOW_DELETE_CONFIRMATION}`
      )
    }
  },

  confirmDeleteAllProfessions: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteProfessions(request, h)
      }

      // Otherwise show confirmation page
      return h.view(VIEW_TEMPLATES.ADMIN_CONFIRM_DELETE, {
        pageTitle: PAGE_TITLES.CONFIRM_DELETE_ALL_PROFESSIONS,
        heading: HEADINGS.DELETE_ALL_PROFESSIONS,
        message:
          'Are you sure you want to delete ALL professions? This will remove all profession definitions from the system.',
        confirmUrl: '/admin/professions/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error(
        { error },
        LOG_MESSAGES.FAILED_TO_SHOW_DELETE_CONFIRMATION
      )
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SHOW_DELETE_CONFIRMATION}`
      )
    }
  },

  deleteProfessions: async (request, h) => {
    try {
      // Use the correct endpoint and HTTP method for the backend API
      const result = await authedFetchJsonDecorator(request)(
        '/professions/deleteAll',
        {
          method: 'POST'
        }
      )

      request.logger.info(
        { result: result || 'no response data' },
        'Delete professions result'
      )

      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.PROFESSIONS_DELETED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, 'Error deleting professions')
      // Continue to admin page even if there's an error
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_DELETE_PROFESSIONS}`
      )
    }
  },

  seedStandards: async (request, h) => {
    try {
      const authedFetch = authedFetchJsonDecorator(request)

      await authedFetch('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify(defaultServiceStandards)
      })

      request.logger.info(LOG_MESSAGES.SERVICE_STANDARDS_SEEDED)
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.SERVICE_STANDARDS_SEEDED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error(error, LOG_MESSAGES.FAILED_TO_SEED_SERVICE_STANDARDS)
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SEED_SERVICE_STANDARDS}`
      )
    }
  },

  seedProfessions: async (request, h) => {
    try {
      if (config.get('env') !== 'development') {
        throw new Error('Only available in development environment')
      }

      const authedFetch = authedFetchJsonDecorator(request)

      await authedFetch('/professions/seed', {
        method: 'POST',
        body: JSON.stringify(defaultProfessions)
      })

      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.PROFESSIONS_SEEDED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error(error, LOG_MESSAGES.FAILED_TO_SEED_PROFESSIONS)
      return h.redirect(
        `/admin?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SEED_PROFESSIONS}`
      )
    }
  }
}
