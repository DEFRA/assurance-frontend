import { adminController } from './controller.js'
import { requireRole } from '~/src/server/auth/middleware.js'
import { config } from '~/src/config/config.js'

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
        }
      ]

      // Add dev-only routes if in development mode
      if (config.get('env') === 'development') {
        routes.push(
          {
            method: 'POST',
            path: '/admin/projects/seed-dev',
            handler: adminController.seedProjectsDev,
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
            handler: adminController.seedProfessionsDev,
            options: {
              auth: {
                strategy: 'session',
                mode: 'required'
              },
              pre: [{ method: requireRole('admin') }]
            }
          }
        )
      }

      server.route(routes)
    }
  }
}
