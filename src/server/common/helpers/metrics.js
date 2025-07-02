import { createMetricsLogger, Unit } from 'aws-embedded-metrics'
import { config } from '~/src/config/config.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'

/**
 * Clean and validate dimensions object
 * @param {object} dimensions - Raw dimensions object
 * @returns {object} - Clean dimensions object with string values
 */
function cleanDimensions(dimensions) {
  if (!dimensions || typeof dimensions !== 'object') {
    return {}
  }

  const cleaned = {}
  Object.entries(dimensions).forEach(([key, value]) => {
    if (key && value != null) {
      cleaned[key] = String(value)
    }
  })

  return cleaned
}

/**
 * Add dimensions to metrics logger with error handling
 * @param {object} metrics - AWS metrics logger instance
 * @param {object} dimensions - Dimensions to add
 * @param {string} metricName - Metric name for error logging
 */
function addDimensions(metrics, dimensions, metricName) {
  const cleanedDimensions = cleanDimensions(dimensions)

  if (Object.keys(cleanedDimensions).length === 0) {
    return
  }

  try {
    metrics.putDimensions(cleanedDimensions)
  } catch (error) {
    logger.error('Error adding dimensions:', {
      error: error.message,
      metricName,
      dimensions
    })
  }
}

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

    addDimensions(metrics, dimensions, metricName)

    if (properties && typeof properties === 'object') {
      metrics.setProperty('properties', properties)
    }

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
