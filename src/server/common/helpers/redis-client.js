import { Cluster, Redis } from 'ioredis'

/**
 * @typedef {object} RedisConfig
 * @property {string} host
 * @property {string} username
 * @property {string} password
 * @property {string} keyPrefix
 * @property {boolean} useSingleInstanceCache
 * @property {boolean} useTLS
 */

/**
 * Setup Redis and provide a redis client
 *
 * Local development - 1 Redis instance
 * Environments - Elasticache / Redis Cluster with username and password
 * @param {RedisConfig} redisConfig - Redis config
 * @returns {Cluster | Redis}
 */
export function buildRedisClient(redisConfig) {
  const port = 6379
  const db = 0
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  let redisClient

  const credentials =
    redisConfig.username === ''
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }
  const tls = redisConfig.useTLS ? { tls: {} } : {}

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix,
      ...credentials,
      ...tls
    })
  } else {
    redisClient = new Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: 10000,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          db,
          ...credentials,
          ...tls
        }
      }
    )
  }

  return redisClient
}
