import { projectsController } from './controller.js'
import { addProjectController } from '~/src/server/projects/add/controller.js'

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
        handler: addProjectController.get
      })

      server.route({
        method: 'POST',
        path: '/projects/add',
        handler: addProjectController.post
      })

      // Then the project detail routes
      server.route([
        {
          method: 'GET',
          path: '/projects',
          handler: projectsController.get
        },
        {
          method: 'GET',
          path: '/projects/{id}',
          handler: projectsController.getById
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/history',
          handler: projectsController.getStandardHistory
        },
        {
          method: 'GET',
          path: '/projects/{id}/edit',
          handler: projectsController.getEdit
        },
        {
          method: 'POST',
          path: '/projects/{id}/edit',
          handler: projectsController.postEdit
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
