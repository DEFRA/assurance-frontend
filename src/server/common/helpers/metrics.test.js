import { logMetric } from './metrics.js'
import { config } from '~/src/config/config.js'

const mockLoggerError = jest.fn()
const mockLoggerDebug = jest.fn()

const mockPutMetric = jest.fn()
const mockSetProperty = jest.fn()
const mockPutDimensions = jest.fn()
const mockFlush = jest.fn()

const mockMetricsLogger = {
  putMetric: mockPutMetric,
  setProperty: mockSetProperty,
  putDimensions: mockPutDimensions,
  flush: mockFlush
}

jest.mock('aws-embedded-metrics', () => ({
  createMetricsLogger: () => mockMetricsLogger,
  Unit: {
    Count: 'Count'
  }
}))
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    error: (...args) => mockLoggerError(...args),
    debug: (...args) => mockLoggerDebug(...args)
  }
}))

describe('#metrics', () => {
  const mockMetricsName = 'test-metric'
  const mockValue = 5
  const mockProperties = { testProp: 'testValue' }
  const mockDimensions = {
    TestDimension: 'test-value',
    AnotherDimension: 'another-value'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('When metrics is disabled', () => {
    beforeEach(() => {
      config.set('isMetricsEnabled', false)
    })

    test('Should not send metric', async () => {
      await logMetric(
        mockMetricsName,
        mockValue,
        mockProperties,
        mockDimensions
      )

      expect(mockPutDimensions).not.toHaveBeenCalled()
      expect(mockPutMetric).not.toHaveBeenCalled()
      expect(mockSetProperty).not.toHaveBeenCalled()
      expect(mockFlush).not.toHaveBeenCalled()
    })
  })

  describe('When metrics is enabled', () => {
    beforeEach(() => {
      config.set('isMetricsEnabled', true)
    })

    test('Should send metric with properties and dimensions', async () => {
      await logMetric(
        mockMetricsName,
        mockValue,
        mockProperties,
        mockDimensions
      )

      expect(mockPutDimensions).toHaveBeenCalledWith({
        TestDimension: 'test-value',
        AnotherDimension: 'another-value'
      })
      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockSetProperty).toHaveBeenCalledWith('properties', mockProperties)
      expect(mockFlush).toHaveBeenCalled()
    })

    test('Should send metric with properties only', async () => {
      await logMetric(mockMetricsName, mockValue, mockProperties)

      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockSetProperty).toHaveBeenCalledWith('properties', mockProperties)
      expect(mockFlush).toHaveBeenCalled()
      expect(mockPutDimensions).not.toHaveBeenCalled()
    })

    test('Should send metric without properties or dimensions', async () => {
      await logMetric(mockMetricsName, mockValue)

      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockSetProperty).not.toHaveBeenCalled()
      expect(mockPutDimensions).not.toHaveBeenCalled()
      expect(mockFlush).toHaveBeenCalled()
    })

    test('Should send metric with dimensions only', async () => {
      await logMetric(mockMetricsName, mockValue, null, mockDimensions)

      expect(mockPutDimensions).toHaveBeenCalledWith({
        TestDimension: 'test-value',
        AnotherDimension: 'another-value'
      })
      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockSetProperty).not.toHaveBeenCalled()
      expect(mockFlush).toHaveBeenCalled()
    })

    test('Should handle dimensions with null values', async () => {
      const dimensionsWithNull = {
        ValidDimension: 'valid-value',
        NullDimension: null,
        UndefinedDimension: undefined,
        EmptyDimension: ''
      }

      await logMetric(mockMetricsName, mockValue, null, dimensionsWithNull)

      // Should only include valid dimensions
      expect(mockPutDimensions).toHaveBeenCalledWith({
        ValidDimension: 'valid-value',
        EmptyDimension: ''
      })
      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockFlush).toHaveBeenCalled()
    })

    test('Should handle empty dimensions object', async () => {
      await logMetric(mockMetricsName, mockValue, null, {})

      expect(mockPutDimensions).not.toHaveBeenCalled()
      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockFlush).toHaveBeenCalled()
    })

    test('Should handle dimension errors gracefully', async () => {
      mockPutDimensions.mockImplementationOnce(() => {
        throw new Error('Dimension error')
      })

      await logMetric(
        mockMetricsName,
        mockValue,
        mockProperties,
        mockDimensions
      )

      expect(mockLoggerError).toHaveBeenCalledWith('Error adding dimensions:', {
        error: 'Dimension error',
        metricName: mockMetricsName,
        dimensions: mockDimensions
      })
      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockFlush).toHaveBeenCalled()
    })
  })

  describe('When metrics throws', () => {
    const mockError = 'test-error'

    beforeEach(async () => {
      config.set('isMetricsEnabled', true)
      mockFlush.mockRejectedValue(new Error(mockError))

      await logMetric(mockMetricsName, mockValue)
    })

    test('Should log expected error', () => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to send metric:',
        expect.objectContaining({
          metricName: mockMetricsName,
          error: mockError
        })
      )
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
