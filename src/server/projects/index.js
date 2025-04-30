import { projectsController } from './controller.js'
import { addProjectController } from '~/src/server/projects/add/controller.js'
import { requireAuth } from '~/src/server/auth/middleware.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const projects = {
  plugin: {
    name: 'projects',
    register: (server) => {
      // Add project routes first
      server.route({
        method: 'GET',
        path: '/projects/add',
        handler: addProjectController.get,
        options: {
          pre: [{ method: requireAuth }]
        }
      })

      server.route({
        method: 'POST',
        path: '/projects/add',
        handler: addProjectController.post,
        options: {
          pre: [{ method: requireAuth }]
        }
      })

      // Then the project detail routes
      server.route([
        {
          method: 'GET',
          path: '/projects',
          handler: projectsController.getAll
        },
        {
          method: 'GET',
          path: '/projects/{id}',
          handler: projectsController.get
        },
        {
          method: 'GET',
          path: '/projects/{id}/history',
          handler: projectsController.getHistory,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/history',
          handler: projectsController.getStandardHistory,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/edit',
          handler: projectsController.getEdit,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/edit',
          handler: projectsController.postEdit,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards',
          handler: projectsController.getStandards
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
