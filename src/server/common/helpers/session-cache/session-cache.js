import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

const logger = createLogger()

// Create a global in-memory store for sessions to persist across plugin initializations
// This will survive server restarts within the same process
const SESSION_STORE = new Map()

/**
 * Session cache configuration
 * @satisfies {ServerRegisterPluginObject<void>}
 */
export const sessionCache = {
  plugin: {
    name: 'session-cache',
    register: (server) => {
      // Create shared cache for sessions with Hapi's cache
      const sessionCache = server.cache({
        segment: 'sessions',
        expiresIn: config.get('session.cache.ttl'),
        shared: true, // Ensure cache is shared across instances
        cache: config.get('session.cache.name') // Use named cache for sessions
      })

      // Create enhanced cache implementation that also uses in-memory Map
      const cache = {
        async get(id) {
          try {
            // First try Hapi's cache
            let result = await sessionCache.get(id)

            // If not found, try the in-memory store
            if (!result && SESSION_STORE.has(id)) {
              result = SESSION_STORE.get(id)
              logger.info(`Cache recovered from SESSION_STORE for id: ${id}`)
            }

            if (!result) {
              logger.info(`Cache miss for id: ${id}`)
            } else {
              logger.info(`Cache hit for id: ${id}`)
            }
            return result
          } catch (error) {
            logger.error(`Cache get error for id: ${id}`, error)
            // Fallback to in-memory store
            return SESSION_STORE.get(id) || null
          }
        },
        async set(id, value, ttl) {
          try {
            // Store in Hapi's cache
            await sessionCache.set(id, value, ttl)

            // Also store in memory for redundancy
            SESSION_STORE.set(id, value)

            logger.info(`Cache set for id: ${id}`)
            return true
          } catch (error) {
            logger.error(`Cache set error for id: ${id}`, error)
            // Still store in memory as fallback
            SESSION_STORE.set(id, value)
            return false
          }
        },
        async drop(id) {
          try {
            // Remove from Hapi's cache
            await sessionCache.drop(id)

            // Also remove from in-memory store
            SESSION_STORE.delete(id)

            logger.info(`Cache dropped for id: ${id}`)
            return true
          } catch (error) {
            logger.error(`Cache drop error for id: ${id}`, error)
            // Still remove from memory
            SESSION_STORE.delete(id)
            return false
          }
        }
      }

      server.app.cache = cache
    }
  }
}

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
