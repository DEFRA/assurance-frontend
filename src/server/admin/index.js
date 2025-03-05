import { adminController } from './controller.js'

export const admin = {
  plugin: {
    name: 'admin',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/admin',
          handler: adminController.get
        },
        {
          method: 'POST',
          path: '/admin/standards/seed',
          handler: adminController.seedStandards
        },
        {
          method: 'POST',
          path: '/admin/standards/delete',
          handler: adminController.deleteStandards
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/standards/delete/confirm',
          handler: adminController.confirmDeleteAllStandards
        },
        {
          method: 'POST',
          path: '/admin/projects/seed',
          handler: adminController.seedProjects
        },
        {
          method: 'POST',
          path: '/admin/projects/delete',
          handler: adminController.deleteAllProjects
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/projects/delete/confirm',
          handler: adminController.confirmDeleteAllProjects
        },
        {
          method: 'POST',
          path: '/admin/projects/{id}/delete',
          handler: adminController.deleteProject
        },
        {
          method: ['GET', 'POST'],
          path: '/admin/projects/{id}/delete/confirm',
          handler: adminController.confirmDeleteProject
        }
      ])
    }
  }
}
