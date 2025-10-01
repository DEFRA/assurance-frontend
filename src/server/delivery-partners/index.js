import { deliveryPartnersController } from '~/src/server/delivery-partners/controller.js'

/**
 * Sets up the delivery partners routes
 * @satisfies {ServerRegisterPluginObject}
 */
export const deliveryPartners = {
  plugin: {
    name: 'delivery-partners',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/delivery-partners/{id}',
          handler: deliveryPartnersController.get
        }
      ])
    }
  }
}
