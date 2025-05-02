import { adminController } from './controller.js'
import { requireRole } from '~/src/server/auth/middleware.js'

export const admin = {
  plugin: {
    name: 'admin',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/admin',
          handler: adminController.get,
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
          path: '/admin/standards/seed',
          handler: adminController.seedStandards,
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
          path: '/admin/standards/delete',
          handler: adminController.deleteStandards,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/standards/delete/confirm',
          handler: adminController.confirmDeleteAllStandards,
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
          path: '/admin/projects/seed',
          handler: adminController.seedProjects,
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
          path: '/admin/projects/delete',
          handler: adminController.deleteAllProjects,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/projects/delete/confirm',
          handler: adminController.confirmDeleteAllProjects,
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
          path: '/admin/projects/{id}/delete',
          handler: adminController.deleteProject,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/projects/{id}/delete/confirm',
          handler: adminController.confirmDeleteProject,
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
