import { pino } from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

// Create a single logger instance
const logger = pino(loggerOptions)

// Export the singleton instance
export { logger }

/**
 * @deprecated Use the singleton `logger` import instead: `import { logger } from '~/src/server/common/helpers/logging/logger.js'`
 *
 * USAGE GUIDELINES:
 * - For services/utilities without request context: Use `import { logger }`
 * - For controllers with request context: Use `request.logger` for request tracing
 *
 * Keep the createLogger function for backward compatibility
 * but make it return the singleton instance
 */
export function createLogger() {
  return logger
}
