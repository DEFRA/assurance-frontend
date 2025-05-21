import { pino } from 'pino'

import { loggerOptions } from '~/src/server/common/helpers/logging/logger-options.js'

// Create a single logger instance
const logger = pino(loggerOptions)

// Export the singleton instance
export { logger }

// Keep the createLogger function for backward compatibility
// but make it return the singleton instance
export function createLogger() {
  return logger
}
