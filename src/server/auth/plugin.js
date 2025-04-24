import { getAuthConfig } from '~/src/server/auth/config.js'
import { auth, logout } from '~/src/server/auth/controller.js'
import Cookie from '@hapi/cookie'

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
        strictHeader: true
      },
      redirectTo: '/auth/login',
      validate: async (request, session) => {
        // Validate the session
        const cached = await request.server.app.cache.get(session.id)
        if (!cached) {
          return { valid: false }
        }
        return { valid: true, credentials: cached }
      }
    })

    // Set default auth strategy
    server.auth.default('session')

    // Register routes
    server.route([
      {
        method: 'GET',
        path: '/auth/login',
        handler: auth,
        options: {
          auth: { mode: 'try' }
        }
      },
      {
        method: 'GET',
        path: '/auth/callback',
        handler: auth,
        options: {
          auth: false
        }
      },
      {
        method: 'GET',
        path: '/auth/logout',
        handler: logout
      }
    ])
  }
}
