import Boom from '@hapi/boom'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import {
  getProjects,
  deleteProject,
  getProjectById
} from '~/src/server/services/projects.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProjects } from '~/src/server/data/projects.js'
import { config } from '~/src/config/config.js'

export const adminController = {
  get: async (request, h) => {
    try {
      request.logger.info('Fetching admin dashboard data')

      let standards = []
      let projects = []

      try {
        standards = (await getServiceStandards()) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching admin dashboard data')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      try {
        projects = (await getProjects()) || []
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
      const result = await fetcher(
        '/serviceStandards/seed',
        {
          method: 'POST',
          body: JSON.stringify(defaultServiceStandards)
        },
        request
      )

      if (!result) {
        request.logger.error('Failed to seed standards - no response from API')
        throw new Error('Failed to seed standards')
      }

      request.logger.info('Service standards seeded successfully')
      return h.redirect('/admin?notification=Standards seeded successfully')
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  deleteStandards: async (request, h) => {
    try {
      request.logger.info('Deleting all standards')

      await fetcher(
        '/serviceStandards/seed',
        {
          method: 'POST',
          body: JSON.stringify([])
        },
        request
      )

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
      const result = await fetcher(
        '/projects/seedData?clearExisting=false',
        {
          method: 'POST',
          body: JSON.stringify(defaultProjects)
        },
        request
      )

      if (!result) {
        request.logger.error('Failed to seed projects - no response from API')
        throw new Error('Failed to seed projects')
      }

      request.logger.info('Projects seeded successfully')
      return h.redirect('/admin?notification=Projects seeded successfully')
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  deleteAllProjects: async (request, h) => {
    try {
      request.logger.info('Deleting all projects')

      await fetcher(
        '/projects/deleteAll',
        {
          method: 'POST'
        },
        request
      )

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

      const result = await deleteProject(id)

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
        const project = await getProjectById(id)
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
  }
}
