import { digitalAssistantController } from '~/src/server/digital-assistant/controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const digitalAssistant = {
  plugin: {
    name: 'digital-assistant',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/digital-assistant',
          handler: (request, h) => digitalAssistantController.get(request, h)
        },
        {
          method: 'POST',
          path: '/digital-assistant/submit',
          handler: (request, h) => digitalAssistantController.submit(request, h)
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
