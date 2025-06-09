import process from 'node:process'

import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { startServer } from '~/src/server/common/helpers/start-server.js'

await startServer()

// Store the handler function so we can remove it later if needed
const unhandledRejectionHandler = (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
}

process.on('unhandledRejection', unhandledRejectionHandler)

// Cleanup function to remove event listeners
export function cleanup() {
  process.removeListener('unhandledRejection', unhandledRejectionHandler)
}
