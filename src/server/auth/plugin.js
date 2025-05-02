import { getAuthConfig } from '~/src/server/auth/config.js'
import { auth, logout } from '~/src/server/auth/controller.js'
import Cookie from '@hapi/cookie'
import { validateSession } from '~/src/server/common/helpers/session-manager.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

export const plugin = {
  name: 'auth',
  version: '1.0.0',
  register: async (server) => {
    const authConfig = getAuthConfig()

    // Register cookie plugin first
    await server.register(Cookie)

    // Register auth strategy using the cookie scheme
    server.auth.strategy('session', 'cookie', {
      cookie: {
        name: 'sid',
        password: authConfig.cookiePassword,
        isSecure: authConfig.isSecure,
        ttl: authConfig.cookieTTL,
        isHttpOnly: true,
        path: '/',
        clearInvalid: true,
        strictHeader: false,
        ignoreErrors: true,
        isSameSite: 'Lax'
      },
      keepAlive: false,
      redirectTo: false,
      appendNext: false,
      validate: async (request, session) => {
        // Skip validation for logout route and public assets
        if (
          request.path === '/auth/logout' ||
          request.path.startsWith('/public/')
        ) {
          return { isValid: false }
        }

        try {
          return await validateSession(request, session)
        } catch (error) {
          logger.error('Session validation error:', { error: error.message })
          return { isValid: false }
        }
      }
    })

    // Set default auth strategy to 'try' for public routes
    server.auth.default({
      strategy: 'session',
      mode: 'try'
    })

    // Register routes
    server.route([
      {
        method: 'GET',
        path: '/auth/login',
        handler: auth,
        options: { auth: false }
      },
      {
        method: 'GET',
        path: '/auth',
        handler: auth,
        options: { auth: false }
      },
      {
        method: 'GET',
        path: '/auth/logout',
        handler: logout,
        options: {
          auth: {
            strategy: 'session',
            mode: 'try'
          }
        }
      }
    ])
  }
}
