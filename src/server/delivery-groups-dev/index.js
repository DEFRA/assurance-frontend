import { deliveryGroupsDevController } from '~/src/server/delivery-groups-dev/controller.js'

/**
 * Sets up the delivery groups dev routes (temporary for development)
 * @satisfies {ServerRegisterPluginObject}
 */
export const deliveryGroupsDev = {
  plugin: {
    name: 'delivery-groups-dev',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/delivery-groups-dev/{id}',
          handler: deliveryGroupsDevController.get
        }
      ])
    }
  }
}
