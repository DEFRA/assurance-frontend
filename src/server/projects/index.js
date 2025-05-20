import { projectsController } from './controller.js'
import { addProjectController } from '~/src/server/projects/add/controller.js'
import { requireAuth } from '~/src/server/auth/middleware.js'

/**
 * Sets up the routes used in the home page.
 * These routes are registered in src/server/router.js.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const projects = {
  plugin: {
    name: 'projects',
    register: (server) => {
      // Add project routes first
      server.route({
        method: 'GET',
        path: '/projects/add',
        handler: addProjectController.get,
        options: {
          auth: {
            strategy: 'session',
            mode: 'required'
          }
        }
      })

      server.route({
        method: 'POST',
        path: '/projects/add',
        handler: addProjectController.post,
        options: {
          auth: {
            strategy: 'session',
            mode: 'required'
          }
        }
      })

      // Then the project detail routes
      server.route([
        {
          method: 'GET',
          path: '/projects',
          handler: projectsController.getAll
        },
        {
          method: 'GET',
          path: '/projects/{id}',
          handler: projectsController.get
        },
        {
          method: 'GET',
          path: '/projects/{id}/history',
          handler: projectsController.getHistory,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/history',
          handler: projectsController.getStandardHistory,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/professions/{professionId}/history',
          handler: projectsController.getProfessionHistory,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/professions/{professionId}/history/{historyId}/archive',
          handler: projectsController.getArchiveProfessionHistory,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/professions/{professionId}/history/{historyId}/archive',
          handler: projectsController.postArchiveProfessionHistory,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/edit',
          handler: projectsController.getEdit,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/edit',
          handler: projectsController.postEdit,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            }
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/edit/profession/{professionId}',
          handler: projectsController.getEditProfession,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/edit/profession/{professionId}',
          handler: projectsController.postEditProfession,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            }
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/delete/profession/{professionId}',
          handler: projectsController.getDeleteProfession,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/delete/profession/{professionId}',
          handler: projectsController.postDeleteProfession,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            }
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/delete/delivery/{historyId}',
          handler: projectsController.getDeleteDelivery,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/delete/delivery/{historyId}',
          handler: projectsController.postDeleteDelivery,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            }
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards',
          handler: projectsController.getStandards
        },
        {
          method: 'GET',
          path: '/projects/{id}/history/{historyId}/archive',
          handler: projectsController.getArchiveDelivery,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/history/{historyId}/archive',
          handler: projectsController.postArchiveDelivery,
          options: {
            auth: {
              mode: 'required'
            }
          }
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
