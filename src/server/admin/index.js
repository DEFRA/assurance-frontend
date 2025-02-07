import { adminController } from './controller.js'

export const admin = {
  plugin: {
    name: 'admin',
    register: (server) => {
      server.route({
        method: 'GET',
        path: '/admin',
        handler: adminController.get
      })
      server.route({
        method: 'POST',
        path: '/admin/standards/seed',
        handler: adminController.seedStandards
      })
      server.route({
        method: 'POST',
        path: '/admin/standards/delete',
        handler: adminController.deleteStandards
      })
      server.route({
        method: 'POST',
        path: '/admin/projects/seed',
        handler: adminController.seedProjects
      })
      server.route({
        method: 'POST',
        path: '/admin/projects/delete',
        handler: adminController.deleteProjects
      })
    }
  }
}
