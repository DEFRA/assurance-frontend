import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import { config } from '~/src/config/config.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

/**
 * Logs custom application metric to CloudWatch
 * @param {string} metricName - Metric Name
 * @param {number} value - Metric Value
 * @param {{ [key: string]: string }} [properties] - metric properties to log
 * @returns {Promise<void>}
 */
async function logMetric(metricName, value, properties) {
  if (!config.get('isMetricsEnabled')) {
    return
  }

  try {
    const metrics = createMetricsLogger()
    metrics.putMetric(metricName, value, Unit.Count)

    if (properties) {
      metrics.setProperty('properties', properties)
    }

    await metrics.flush()
  } catch (error) {
    logger.error(error, error.message)
  }
}

export { logMetric }
