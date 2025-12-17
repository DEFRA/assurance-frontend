import { themesController } from '~/src/server/themes/controller.js'

/**
 * Sets up the themes routes
 * @satisfies {ServerRegisterPluginObject}
 */
export const themes = {
  plugin: {
    name: 'themes',
    register(server) {
      server.route([
        // List all themes
        {
          method: 'GET',
          path: '/themes',
          options: {
            auth: 'session'
          },
          handler: themesController.list
        },
        // Add new theme form
        {
          method: 'GET',
          path: '/themes/add',
          options: {
            auth: 'session'
          },
          handler: themesController.addForm
        },
        // Create new theme
        {
          method: 'POST',
          path: '/themes/add',
          options: {
            auth: 'session'
          },
          handler: themesController.create
        },
        // View theme details
        {
          method: 'GET',
          path: '/themes/{id}',
          options: {
            auth: 'session'
          },
          handler: themesController.detail
        },
        // Edit theme form
        {
          method: 'GET',
          path: '/themes/{id}/edit',
          options: {
            auth: 'session'
          },
          handler: themesController.editForm
        },
        // Update theme
        {
          method: 'POST',
          path: '/themes/{id}/edit',
          options: {
            auth: 'session'
          },
          handler: themesController.update
        },
        // Archive theme (GET for link, POST for form)
        {
          method: ['GET', 'POST'],
          path: '/themes/{id}/archive',
          options: {
            auth: 'session'
          },
          handler: themesController.archive
        },
        // Restore theme (GET for link, POST for form)
        {
          method: ['GET', 'POST'],
          path: '/themes/{id}/restore',
          options: {
            auth: 'session'
          },
          handler: themesController.restore
        }
      ])
    }
  }
}
