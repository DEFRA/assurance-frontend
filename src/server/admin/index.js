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
          method: 'POST',
          path: '/admin/projects/seed',
          handler: adminController.seedProjects
        },
        {
          method: 'POST',
          path: '/admin/projects/delete',
          handler: adminController.deleteProjects
        },
        {
          method: 'POST',
          path: '/admin/projects/{id}/delete',
          handler: adminController.deleteProject
        }
      ])
    }
  }
}
