import { adminController } from './controller.js'
import { requireRole } from '~/src/server/auth/middleware.js'

export const admin = {
  plugin: {
    name: 'admin',
    register: (server) => {
      const routes = [
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
        // Profession CRUD routes
        {
          method: 'POST',
          path: '/admin/professions/create',
          handler: adminController.createProfession,
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
          path: '/admin/professions/update',
          handler: adminController.updateProfession,
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
          path: '/admin/professions/{id}/archive',
          handler: adminController.archiveProfession,
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
          path: '/admin/professions/{id}/restore',
          handler: adminController.restoreProfession,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },
        // Service Standard CRUD routes
        {
          method: 'POST',
          path: '/admin/standards/create',
          handler: adminController.createServiceStandard,
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
          path: '/admin/standards/update',
          handler: adminController.updateServiceStandard,
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
          path: '/admin/standards/{id}/archive',
          handler: adminController.archiveServiceStandard,
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
          path: '/admin/standards/{id}/restore',
          handler: adminController.restoreServiceStandard,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        },
        // Existing bulk operation routes
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
        },
        {
          method: 'POST',
          path: '/admin/professions/delete',
          handler: adminController.deleteProfessions,
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
          path: '/admin/professions/delete/confirm',
          handler: adminController.confirmDeleteAllProfessions,
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
          path: '/admin/professions/seed-dev',
          handler: adminController.seedProfessions,
          options: {
            pre: [{ method: requireRole('admin') }]
          }
        },
        {
          method: 'POST',
          path: '/admin/standards/seed-dev',
          handler: adminController.seedStandards,
          options: {
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
          path: '/admin/professions/seed',
          handler: adminController.seedProfessions,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            },
            pre: [{ method: requireRole('admin') }]
          }
        }
      ]

      // Routes are defined above - no additional dev routes needed
      server.route(routes)
    }
  }
}
