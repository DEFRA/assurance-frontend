import { config } from '~/src/config/config.js'

/**
 * Session cache configuration
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const sessionCache = {
  plugin: {
    name: 'session-cache',
    register: (server) => {
      server.app.cache = server.cache({
        segment: 'sessions',
        expiresIn: config.get('session.cache.ttl')
      })
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
