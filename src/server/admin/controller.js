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
import { defaultProjects } from '~/src/server/data/projects.js'
import { defaultProfessions } from '~/src/server/data/professions.js'
import { config } from '~/src/config/config.js'

export const adminController = {
  get: async (request, h) => {
    try {
      let standards = []
      let projects = []
      let professions = []

      try {
        standards = (await getServiceStandards(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching admin dashboard data')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      try {
        projects = (await getProjects(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching admin dashboard data')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      try {
        professions = (await getProfessions(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching admin dashboard data')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      // Get environment from config or use a default for testing
      const isTestEnvironment = config.get
        ? config.get('env') === 'test'
        : false

      return h.view('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: standards?.length || 0,
        projectsCount: projects?.length || 0,
        professionsCount: professions?.length || 0,
        projects,
        notification: request.query.notification,
        isTestEnvironment
      })
    } catch (error) {
      request.logger.error({ error }, 'Error fetching admin dashboard data')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  seedStandards: async (request, h) => {
    request.logger.info('Seeding service standards')
    try {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify(defaultServiceStandards)
      })

      request.logger.info('Service standards seeded successfully')
      return h.redirect('/admin?notification=Standards seeded successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to seed standards')
      return h.redirect('/admin?notification=Failed to seed standards')
    }
  },

  deleteStandards: async (request, h) => {
    try {
      request.logger.info('Deleting all standards')

      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify([])
      })

      request.logger.info('Standards deleted successfully')
      return h.redirect('/admin?notification=Standards deleted successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete standards')
      return h.redirect('/admin?notification=Failed to delete standards')
    }
  },

  seedProjects: async (request, h) => {
    request.logger.info('Seeding projects data')

    try {
      // Use authedFetchJsonDecorator to ensure auth token is passed
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/projects/seedData?clearExisting=false', {
        method: 'POST',
        body: JSON.stringify(defaultProjects)
      })

      request.logger.info('Projects seeded successfully')
      return h.redirect('/admin?notification=Projects seeded successfully')
    } catch (error) {
      request.logger.error(error)
      return h.redirect('/admin?notification=Failed to seed projects')
    }
  },

  deleteAllProjects: async (request, h) => {
    try {
      request.logger.info('Deleting all projects')

      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/projects/deleteAll', {
        method: 'POST'
      })

      request.logger.info('All projects deleted successfully')
      return h.redirect('/admin?notification=All projects deleted successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete all projects')
      return h.redirect('/admin?notification=Failed to delete all projects')
    }
  },

  deleteProject: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ id }, 'Deleting project')

      const result = await deleteProject(id, request)

      if (!result) {
        request.logger.warn({ id }, 'Project not found for deletion')
        return h.redirect('/admin?notification=Project not found')
      }

      request.logger.info({ id }, 'Project deleted successfully')
      return h.redirect('/admin?notification=Project deleted successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete project')
      return h.redirect('/admin?notification=Failed to delete project')
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

      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Project Deletion',
        heading: 'Delete Project',
        message: `Are you sure you want to delete the project "${projectName}"?`,
        confirmUrl: `/admin/projects/${id}/delete`,
        cancelUrl: id ? `/projects/${id}` : '/admin',
        backLink: id ? `/projects/${id}` : '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
      )
    }
  },

  confirmDeleteAllProjects: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteAllProjects(request, h)
      }

      // Otherwise show confirmation page
      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Projects',
        heading: 'Delete All Projects',
        message:
          'Are you sure you want to delete ALL projects? This will remove all project data from the system.',
        confirmUrl: '/admin/projects/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
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
      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Standards',
        heading: 'Delete All Standards',
        message:
          'Are you sure you want to delete ALL service standards? This will remove all standard definitions from the system.',
        confirmUrl: '/admin/standards/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
      )
    }
  },

  seedProfessions: async (request, h) => {
    request.logger.info('Seeding professions from data file')

    try {
      // Use the authed fetch to call the correct backend API endpoint
      const result = await authedFetchJsonDecorator(request)(
        '/professions/seed',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(defaultProfessions)
        }
      )

      request.logger.info(
        { result: result || 'no response data' },
        'Seed professions result'
      )

      return h.redirect('/admin?notification=Professions seeded successfully')
    } catch (error) {
      request.logger.warn(
        {
          error: error.message
        },
        'Error seeding professions'
      )

      // If the API is not implemented (404), show a notification
      if (error.message?.includes('404')) {
        return h.redirect(
          '/admin?notification=Professions API not yet available - backend needs updating'
        )
      }

      return h.redirect('/admin?notification=Failed to seed professions')
    }
  },

  deleteProfessions: async (request, h) => {
    request.logger.info('Deleting all professions')

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

      return h.redirect('/admin?notification=Professions deleted successfully')
    } catch (error) {
      request.logger.warn(
        {
          error: error.message
        },
        'Error deleting professions'
      )

      // If the API is not implemented (404), show a notification
      if (error.message?.includes('404')) {
        return h.redirect(
          '/admin?notification=Professions API not yet available - backend needs updating'
        )
      }

      return h.redirect('/admin?notification=Failed to delete professions')
    }
  },

  confirmDeleteAllProfessions: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteProfessions(request, h)
      }

      // Otherwise show confirmation page
      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Professions',
        heading: 'Delete All Professions',
        message:
          'Are you sure you want to delete ALL professions? This will remove all profession definitions from the system.',
        confirmUrl: '/admin/professions/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
      )
    }
  }
}
