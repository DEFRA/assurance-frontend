import { cookiesController } from './controller.js'

/**
 * Sets up the cookies routes.
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const cookies = {
  plugin: {
    name: 'cookies',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/cookies',
          handler: cookiesController.get
        }
      ])
    }
  }
}
