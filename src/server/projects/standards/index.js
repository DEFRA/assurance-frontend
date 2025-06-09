import { standardsController } from './controller.js'
import { requireRole } from '~/src/server/auth/middleware.js'

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
          handler: standardsController.getStandardHistory
        },
        {
          method: 'GET',
          path: '/projects/{id}/assessment',
          handler: standardsController.getAssessmentScreen
        },
        {
          method: 'POST',
          path: '/projects/{id}/assessment',
          handler: standardsController.postAssessmentScreen,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
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
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/standards/{standardId}/professions/{professionId}/history/{historyId}/archive',
          handler: standardsController.postArchiveAssessment,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
