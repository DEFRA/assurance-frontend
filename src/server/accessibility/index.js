import { accessibilityController } from './controller.js'

/**
 * Sets up the accessibility routes.
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const accessibility = {
  plugin: {
    name: 'accessibility',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/accessibility',
          handler: accessibilityController.get
        }
      ])
    }
  }
}
