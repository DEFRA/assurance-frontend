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
    paths: Array.isArray(logConfig.redact) ? logConfig.redact : [],
    remove: true
  },
  level: logConfig.level || 'info',
  ...formatters[logConfig.format],
  nesting: true,
  // Enhanced serializers for consistent error and request formatting
  serializers: {
    error: (error) => {
      if (!error) {
        return error
      }
      return {
        type: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...error
      }
    },
    request: (request) => {
      if (!request) {
        return request
      }
      return {
        method: request.method,
        url: request.url,
        headers: request.headers,
        remoteAddress: request.remoteAddress
      }
    }
  },
  // Enhanced formatters for consistent log structure
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
  mixin() {
    const traceId = getTraceId()
    return {
      trace: traceId ? { id: traceId } : null
    }
  }
}

/**
 * @import { Options } from 'hapi-pino'
 * @import { LoggerOptions } from 'pino'
 */
