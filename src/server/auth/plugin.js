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
          // Check if session and session.id exist
          if (!session?.id) {
            logger.warn('Invalid session structure', {
              session: JSON.stringify(session)
            })
            return { isValid: false }
          }

          // Get token directly from session if available - this is the most direct path
          const token = session.token

          // Validate the session from cache as backup
          const cached = await request.server.app.cache.get(session.id)

          if (!cached) {
            // If session has token but no cache, we can still be valid (this might happen if cache expired)
            if (token) {
              logger.warn(
                'No cached session found for ID, but token exists in cookie',
                {
                  id: session.id,
                  tokenLength: token.length
                }
              )

              // Create minimal valid credentials
              return {
                isValid: true,
                credentials: {
                  token,
                  id: session.id
                }
              }
            }

            logger.warn(
              'No cached session found for ID and no token in cookie',
              { id: session.id }
            )
            return { isValid: false }
          }
          // Create credentials object with token explicitly included
          const credentials = {
            ...cached,
            token, // Make sure token is directly in credentials
            id: session.id // Keep the id for cache lookups
          }

          return {
            isValid: true,
            credentials
          }
        } catch (error) {
          logger.error('Session validation error', {
            error: error.message,
            stack: error.stack,
            session: JSON.stringify(session, (key, value) => {
              if (key === 'token' && typeof value === 'string') {
                return `${value.substring(0, 10)}...`
              }
              return value
            })
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
