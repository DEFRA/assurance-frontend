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
    if (dimensions && typeof dimensions === 'object') {
      try {
        // Convert all dimension values to strings and filter out null/undefined
        const cleanDimensions = {}
        Object.entries(dimensions).forEach(([key, dimensionValue]) => {
          if (key && dimensionValue != null) {
            cleanDimensions[key] = String(dimensionValue)
          }
        })

        // Use putDimensions (plural) to add all dimensions at once
        if (Object.keys(cleanDimensions).length > 0) {
          metrics.putDimensions(cleanDimensions)
        }
      } catch (dimensionError) {
        logger.error('Error adding dimensions:', {
          error: dimensionError.message,
          metricName,
          dimensions
        })
        // Continue with metric without dimensions
      }
    }

    // Add properties if provided
    if (properties && typeof properties === 'object') {
      metrics.setProperty('properties', properties)
    }

    // Send the metric
    metrics.putMetric(metricName, value, Unit.Count)
    await metrics.flush()
  } catch (error) {
    logger.error('Failed to send metric:', {
      metricName,
      error: error.message,
      dimensions: dimensions ? Object.keys(dimensions) : null,
      properties: properties ? Object.keys(properties) : null
    })
  }
}

export { logMetric }
