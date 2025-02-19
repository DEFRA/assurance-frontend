import { ecsFormat } from '@elastic/ecs-pino-format'
import { config } from '~/src/config/config.js'
import { getTraceId } from '@defra/hapi-tracing'

const logConfig = config.get('log')
const serviceName = config.get('serviceName')
const serviceVersion = config.get('serviceVersion')

/**
 * @type {{ecs: Omit<LoggerOptions, "mixin"|"transport">, "pino-pretty": {transport: {target: string}}}}
 */
const formatters = {
  ecs: {
    ...ecsFormat({
      serviceVersion,
      serviceName
    })
  },
  'pino-pretty': { transport: { target: 'pino-pretty' } }
}

/**
 * @satisfies {Options}
 */
export const loggerOptions = {
  enabled: logConfig.enabled,
  ignorePaths: ['/health'],
  redact: {
    paths: logConfig.redact,
    remove: true
  },
  level: logConfig.level,
  ...formatters[logConfig.format],
  nesting: true,
  mixin() {
    const mixinValues = {}
    const traceId = getTraceId()
    if (traceId) {
      mixinValues.trace = { id: traceId }
    }
    return mixinValues
  }
}

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions } from 'pino'
 */

/**
 * Get logger options based on environment configuration
 * @returns {object} Logger configuration options
 */
export function getLoggerOptions() {
  const env = config.get('env')
  const isProduction = env === 'production'

  return {
    level: config.get('log.level') || (isProduction ? 'info' : 'debug'),
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() }
      },
      bindings: (bindings) => {
        return { ...bindings }
      },
      log: (obj) => {
        // Remove error from the log object since it's handled separately
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { err, error, ...rest } = obj
        return rest
      }
    },
    serializers: {
      error: (error) => {
        if (!error) return error
        return {
          type: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
          ...error
        }
      },
      request: (request) => {
        if (!request) return request
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
          remoteAddress: request.remoteAddress
        }
      }
    }
  }
}
