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
          path: '/projects/{id}/standards/{standardId}',
          handler: projectsController.getStandardDetail
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
          path: '/projects/{id}/standards',
          handler: projectsController.getStandards
        },
        {
          method: 'GET',
          path: '/projects/{id}/history/{historyId}/archive',
          handler: projectsController.getArchiveProjectHistory,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/history/{historyId}/archive',
          handler: projectsController.postArchiveProjectHistory,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/assessment',
          handler: projectsController.getAssessmentScreen,
          options: { pre: [{ method: requireAuth }] }
        },
        {
          method: 'POST',
          path: '/projects/{id}/assessment',
          handler: projectsController.postAssessmentScreen,
          options: { auth: { strategy: 'session', mode: 'required' } }
        },
        {
          method: 'GET',
          path: '/projects/{id}/manage',
          handler: projectsController.getManageProject,
          options: { auth: { strategy: 'session', mode: 'required' } }
        },
        {
          method: 'POST',
          path: '/projects/{id}/manage',
          handler: projectsController.postManageProject,
          options: { auth: { strategy: 'session', mode: 'required' } }
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/professions/{professionId}/history',
          handler: projectsController.getAssessmentHistory
        },
        {
          method: 'GET',
          path: '/projects/{id}/standards/{standardId}/professions/{professionId}/history/{historyId}/archive',
          handler: projectsController.getArchiveAssessment,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/standards/{standardId}/professions/{professionId}/history/{historyId}/archive',
          handler: projectsController.postArchiveAssessment,
          options: {
            auth: {
              mode: 'required'
            }
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/manage/status',
          handler: projectsController.getManageProjectStatus,
          options: { auth: { strategy: 'session', mode: 'required' } }
        },
        {
          method: 'POST',
          path: '/projects/{id}/manage/status',
          handler: projectsController.postManageProjectStatus,
          options: { auth: { strategy: 'session', mode: 'required' } }
        },
        {
          method: 'GET',
          path: '/projects/{id}/manage/details',
          handler: projectsController.getManageProjectDetails,
          options: { auth: { strategy: 'session', mode: 'required' } }
        },
        {
          method: 'POST',
          path: '/projects/{id}/manage/details',
          handler: projectsController.postManageProjectDetails,
          options: { auth: { strategy: 'session', mode: 'required' } }
        }
      ])
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
