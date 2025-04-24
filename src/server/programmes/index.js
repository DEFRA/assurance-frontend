import { programmesController } from './controller.js'

export const programmes = {
  plugin: {
    name: 'programmes',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/programmes',
          handler: programmesController.handler,
          options: {
            auth: {
              mode: 'try',
              strategy: 'session'
            }
          }
        },
        {
          method: 'GET',
          path: '/programmes/{programme}',
          handler: programmesController.getProgramme,
          options: {
            auth: {
              mode: 'try',
              strategy: 'session'
            }
          }
        }
      ])
    }
  }
}
