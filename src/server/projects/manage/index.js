import { manageController } from './controller.js'
import { requireRole } from '~/src/server/auth/middleware.js'

/**
 * Sets up the project management routes.
 */

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const manageRoutes = {
  plugin: {
    name: 'manage',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/projects/{id}/manage',
          handler: manageController.getManageProject,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/manage',
          handler: manageController.postManageProject,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/manage/status',
          handler: manageController.getManageProjectStatus,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/manage/status',
          handler: manageController.postManageProjectStatus,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'GET',
          path: '/projects/{id}/manage/details',
          handler: manageController.getManageProjectDetails,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/projects/{id}/manage/details',
          handler: manageController.postManageProjectDetails,
          options: {
            auth: { strategy: 'session', mode: 'required' },
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
