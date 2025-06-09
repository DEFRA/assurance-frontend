import { projectsController } from './controller.js'
import { requireRole } from '~/src/server/auth/middleware.js'
import { manageRoutes } from './manage/index.js'
import { standardsRoutes } from './standards/index.js'
import { addProjectController } from './add/controller.js'

/**
 * Sets up the projects routes.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const projectsRoutes = {
  plugin: {
    name: 'projects',
    register: async (server) => {
      // Register sub-modules first
      await server.register(manageRoutes)
      await server.register(standardsRoutes)

      // Core project routes
      server.route([
        // Projects list
        {
          method: 'GET',
          path: '/projects',
          handler: projectsController.getAll
        },

        // Add project
        {
          method: 'GET',
          path: '/projects/add',
          handler: addProjectController.get,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/projects/add',
          handler: addProjectController.post,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },

        // Project detail
        {
          method: 'GET',
          path: '/projects/{id}',
          handler: projectsController.get
        },

        // Edit project (form)
        {
          method: 'GET',
          path: '/projects/{id}/edit',
          handler: projectsController.getEdit,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/edit',
          handler: projectsController.postEdit,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },

        // Project history
        {
          method: 'GET',
          path: '/projects/{id}/history',
          handler: projectsController.getHistory,
          options: {
            pre: [{ method: requireRole('admin') }]
          }
        },

        // Archive project history
        {
          method: 'GET',
          path: '/projects/{id}/history/{historyId}/archive',
          handler: projectsController.getArchiveProjectHistory,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/history/{historyId}/archive',
          handler: projectsController.postArchiveProjectHistory,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },

        // Profession routes
        {
          method: 'GET',
          path: '/projects/{id}/professions/{professionId}/history',
          handler: projectsController.getProfessionHistory,
          options: {
            pre: [{ method: requireRole('admin') }]
          }
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
