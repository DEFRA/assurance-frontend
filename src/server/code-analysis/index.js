import { codeAnalysisController } from './controller.js'
import { requireRole } from '~/src/server/auth/middleware.js'

/**
 * Sets up the code analysis routes.
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const codeAnalysisRoutes = {
  plugin: {
    name: 'code-analysis',
    register: (server) => {
      server.route([
        // Code Analysis dashboard
        {
          method: 'GET',
          path: '/code-analysis',
          handler: codeAnalysisController.getIndex,
          options: {
            auth: { strategy: 'session', mode: 'required' },
            pre: [{ method: requireRole('admin') }]
          }
        },

        // Submit code analysis
        {
          method: 'POST',
          path: '/code-analysis',
          handler: codeAnalysisController.postAnalysis,
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
