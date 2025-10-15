import { deliveryGroupStandardsController } from '~/src/server/delivery-group-standards/controller.js'

/**
 * Sets up the delivery group standards routes
 * @satisfies {ServerRegisterPluginObject}
 */
export const deliveryGroupStandards = {
  plugin: {
    name: 'delivery-group-standards',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/delivery-group-standards',
          handler: deliveryGroupStandardsController.get
        },
        {
          method: 'GET',
          path: '/delivery-group-standards/{standardNumber}',
          handler: deliveryGroupStandardsController.getStandard
        }
      ])
    }
  }
}
