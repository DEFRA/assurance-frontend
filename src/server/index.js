import path from 'path'
import hapi from '@hapi/hapi'
import { config } from '~/src/config/config.js'
import { nunjucksConfig } from '~/src/config/nunjucks/nunjucks.js'
import { router } from './router.js'
import { requestLogger } from '~/src/server/common/helpers/logging/request-logger.js'
import { catchAll } from '~/src/server/common/helpers/errors.js'
import { secureContext } from '~/src/server/common/helpers/secure-context/index.js'
import { sessionCache } from '~/src/server/common/helpers/session-cache/session-cache.js'
import { getCacheEngine } from '~/src/server/common/helpers/session-cache/cache-engine.js'
import { pulse } from '~/src/server/common/helpers/pulse.js'
import { requestTracing } from '~/src/server/common/helpers/request-tracing.js'
import { setupProxy } from '~/src/server/common/helpers/proxy/setup-proxy.js'
import { navigation } from '~/src/server/common/helpers/navigation.js'
import Inert from '@hapi/inert'
import Vision from '@hapi/vision'
import { plugin as authPlugin } from './auth/plugin.js'

export async function createServer() {
  setupProxy()
  const server = hapi.server({
    port: config.get('port'),
    routes: {
      auth: {
        mode: 'try'
      },
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(
          /** @type {Engine} */ (config.get('session.cache.engine'))
        )
      }
    ],
    state: {
      strictHeader: false
    }
  })

  // Register plugins
  await server.register([
    Inert,
    Vision,
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    authPlugin,
    sessionCache,
    nunjucksConfig,
    router
  ])

  server.ext('onPreResponse', catchAll)

  // Set base view context
  const baseContext = {
    serviceName: 'DDTS Assurance',
    serviceUrl: '/',
    breadcrumbs: [
      {
        text: 'Home',
        href: '/'
      }
    ]
  }

  server.app.context = baseContext

  // Update onPreResponse extension to use cookieAuth
  server.ext('onPreResponse', (request, h) => {
    const response = request.response

    if (response.variety === 'view') {
      // Use request.auth for auth state
      const auth = {
        isAuthenticated: request.auth.isAuthenticated,
        credentials: request.auth.credentials
      }

      // Update response context with base context, auth state, and navigation
      response.source.context = {
        ...baseContext,
        auth,
        navigation: navigation(auth)
      }
    }

    return h.continue
  })

  return server
}

/**
 * @import {Engine} from '~/src/server/common/helpers/session-cache/cache-engine.js'
 */
