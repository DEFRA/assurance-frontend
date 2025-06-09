import { professionsController } from './controller.js'

/**
 * Sets up the routes for the professions pages.
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const professions = {
  plugin: {
    name: 'professions',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/professions',
          handler: professionsController.getAll
        },
        {
          method: 'GET',
          path: '/professions/{id}',
          handler: professionsController.get
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
