import Boom from '@hapi/boom'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProjects, deleteProject } from '~/src/server/services/projects.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProjects } from '~/src/server/data/projects.js'

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

      return h.view('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: standards?.length || 0,
        projectsCount: projects?.length || 0,
        projects,
        notification: request.query.notification
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
    request.logger.info('Deleting all service standards')

    try {
      const result = await fetcher(
        '/serviceStandards/seed',
        {
          method: 'POST',
          body: JSON.stringify([])
        },
        request
      )

      if (!result) {
        request.logger.error(
          'Failed to delete standards - no response from API'
        )
        throw new Error('Failed to delete standards')
      }

      request.logger.info('Service standards deleted successfully')
      return h.redirect('/admin?notification=Standards deleted successfully')
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  seedProjects: async (request, h) => {
    request.logger.info('Seeding projects data')

    try {
      const result = await fetcher(
        '/projects/seedData',
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

  deleteProjects: async (request, h) => {
    request.logger.info('Deleting all projects')

    try {
      const result = await fetcher(
        '/projects/deleteAll',
        {
          method: 'POST'
        },
        request
      )

      if (!result) {
        request.logger.error('Failed to delete projects - no response from API')
        throw new Error('Failed to delete projects')
      }

      request.logger.info('Projects deleted successfully')
      return h.redirect('/admin?notification=Projects deleted successfully')
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
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
  }
}
