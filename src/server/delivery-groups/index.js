import { deliveryGroupsController } from '~/src/server/delivery-groups/controller.js'

/**
 * Sets up the delivery groups routes
 * @satisfies {ServerRegisterPluginObject}
 */
export const deliveryGroups = {
  plugin: {
    name: 'delivery-groups',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/delivery-groups/{id}',
          handler: deliveryGroupsController.get
        }
      ])
    }
  }
}
