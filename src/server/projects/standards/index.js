import { standardsController } from './controller.js'
import { requireAuth } from '~/src/server/auth/middleware.js'

/**
 * Sets up the project standards routes.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const standardsRoutes = {
  plugin: {
    name: 'standards',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/projects/{id}/standards',
          handler: standardsController.getStandards
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}',
          handler: standardsController.getStandardDetail
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/history',
          handler: standardsController.getStandardHistory,
          options: {
            pre: [{ method: requireAuth }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/assessment',
          handler: standardsController.getAssessmentScreen,
          options: { pre: [{ method: requireAuth }] }
        },
        {
          method: 'POST',
          path: '/projects/{id}/assessment',
          handler: standardsController.postAssessmentScreen,
          options: { auth: { strategy: 'session', mode: 'required' } }
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/professions/{professionId}/history',
          handler: standardsController.getAssessmentHistory
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/professions/{professionId}/history/{historyId}/archive',
          handler: standardsController.getArchiveAssessment,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/standards/{standardId}/professions/{professionId}/history/{historyId}/archive',
          handler: standardsController.postArchiveAssessment,
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
