import { homeController } from './controller.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const home = {
  plugin: {
    name: 'home',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/',
          handler: homeController.handler
        },
        {
          method: 'GET',
          path: '/insights',
          options: {
            auth: 'session' // Require authentication
          },
          handler: homeController.insightsHandler
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
