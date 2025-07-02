import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import { config } from '~/src/config/config.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

/**
 * Logs custom application metric to CloudWatch
 * @param {string} metricName - Metric Name
 * @param {number} value - Metric Value
 * @param {{ [key: string]: string }} [properties] - metric properties to log
 * @param {{ [key: string]: string }} [dimensions] - CloudWatch dimensions (optional)
 * @returns {Promise<void>}
 */
async function logMetric(metricName, value, properties, dimensions) {
  if (!config.get('isMetricsEnabled')) {
    return
  }

  try {
    const metrics = createMetricsLogger()

    // Add CloudWatch dimensions (these will show up in Grafana)
    if (dimensions) {
      Object.entries(dimensions).forEach(([key, value]) => {
        metrics.putDimension(key, value)
      })
    }

    metrics.putMetric(metricName, value, Unit.Count)

    // Store detailed properties as metadata
    if (properties) {
      metrics.setProperty('properties', properties)
    }

    await metrics.flush()
  } catch (error) {
    logger.error(error, error.message)
  }
}

export { logMetric }
