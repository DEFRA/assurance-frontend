import { authController } from './controller.js'

/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const authRoutes = {
  plugin: {
    name: 'auth-routes',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/auth/insufficient-permissions',
          handler: authController.insufficientPermissions,
          options: {
            auth: {
              strategy: 'session',
              mode: 'required'
            }
          }
        }
      ])
    }
  }
}
