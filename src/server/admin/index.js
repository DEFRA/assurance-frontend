import { adminController } from './controller.js'

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
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/admin/standards/seed',
          handler: adminController.seedStandards,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/admin/standards/delete',
          handler: adminController.deleteStandards,
          options: {
            auth: 'session'
          }
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/standards/delete/confirm',
          handler: adminController.confirmDeleteAllStandards,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/admin/projects/seed',
          handler: adminController.seedProjects,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/admin/projects/delete',
          handler: adminController.deleteAllProjects,
          options: {
            auth: 'session'
          }
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/projects/delete/confirm',
          handler: adminController.confirmDeleteAllProjects,
          options: {
            auth: 'session'
          }
        },
        {
          method: 'POST',
          path: '/admin/projects/{id}/delete',
          handler: adminController.deleteProject,
          options: {
            auth: 'session'
          }
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/projects/{id}/delete/confirm',
          handler: adminController.confirmDeleteProject,
          options: {
            auth: 'session'
          }
        }
      ])
    }
  }
}
