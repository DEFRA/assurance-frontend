import Boom from '@hapi/boom'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProjects } from '~/src/server/services/projects.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProjects } from '~/src/server/data/projects.js'

export const adminController = {
  get: async (request, h) => {
    request.logger.info('Fetching admin dashboard data')

    try {
      let standards = []
      let projects = []

      try {
        standards = await getServiceStandards()
        request.logger.info(
          { standardsCount: standards.length },
          'Standards fetched'
        )
      } catch (error) {
        request.logger.error({ error }, 'Failed to fetch standards')
        throw Boom.boomify(error, {
          statusCode: 500,
          message: 'Failed to fetch standards'
        })
      }

      try {
        projects = await getProjects()
        request.logger.info(
          { projectsCount: projects.length },
          'Projects fetched'
        )
      } catch (error) {
        request.logger.error({ error }, 'Failed to fetch projects')
        throw Boom.boomify(error, {
          statusCode: 500,
          message: 'Failed to fetch projects'
        })
      }

      return h.view('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: standards.length,
        projectsCount: projects.length,
        notification: request.query.notification
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, {
        statusCode: 500,
        message: 'Error loading admin dashboard'
      })
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
  }
}
