import { getAuthConfig } from '~/src/server/auth/config.js'
import { auth, logout } from '~/src/server/auth/controller.js'
import Cookie from '@hapi/cookie'
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
      keepAlive: true,
      redirectTo: false,
      appendNext: false,
      validate: async (request, session) => {
        try {
          // Log the session object to debug
          logger.info('Validating session', {
            sessionId: session?.id
          })

          // Check if session and session.id exist
          if (!session?.id) {
            logger.warn('Invalid session structure', {
              session: JSON.stringify(session)
            })
            return { isValid: false }
          }

          // Validate the session
          const cached = await request.server.app.cache.get(session.id)

          if (!cached) {
            logger.warn('No cached session found for ID', { id: session.id })
            return { isValid: false }
          }

          logger.info('Session validated successfully', { id: session.id })

          return {
            isValid: true,
            credentials: cached
          }
        } catch (error) {
          logger.error('Session validation error', {
            error: error.message,
            stack: error.stack,
            session: JSON.stringify(session)
          })
          return { isValid: false }
        }
      }
    })

    // Set default auth strategy
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
        options: {
          auth: { mode: 'try' }
        }
      },
      {
        method: 'GET',
        path: '/auth',
        handler: auth,
        options: {
          auth: { mode: 'try' }
        }
      },
      {
        method: 'GET',
        path: '/auth/logout',
        handler: logout,
        options: {
          auth: { mode: 'try' }
        }
      }
    ])
  }
}
