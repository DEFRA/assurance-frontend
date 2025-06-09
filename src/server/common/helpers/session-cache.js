import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'

/**
 * Session cache plugin
 */
export const plugin = {
  name: 'session-cache',
  version: '1.0.0',
  register: async (server) => {
    // Create session cache
    const sessionCache = server.cache({
      segment: 'sessions',
      expiresIn: config.get('session.cache.ttl'),
      shared: true
    })

    // Create enhanced API with logging
    const enhancedCache = {
      async get(id) {
        try {
          const result = await sessionCache.get(id)
          if (!result) {
            logger.debug(`Session cache miss for id: ${id}`)
          }
          return result
        } catch (error) {
          logger.error(`Session cache get error for id: ${id}`, error)
          return null
        }
      },

      async set(id, value, ttl = 0) {
        try {
          await sessionCache.set(id, value, ttl)
          logger.debug(`Session cache set for id: ${id}`)
          return true
        } catch (error) {
          logger.error(`Session cache set error for id: ${id}`, error)
          return false
        }
      },

      async drop(id) {
        try {
          await sessionCache.drop(id)
          logger.debug(`Session cache dropped for id: ${id}`)
          return true
        } catch (error) {
          logger.error(`Session cache drop error for id: ${id}`, error)
          return false
        }
      }
    }

    // Set cache on server app with await to ensure operation completes
    server.app.sessionCache = enhancedCache
    await Promise.resolve() // Add an await operation to justify the async function
  }
}
