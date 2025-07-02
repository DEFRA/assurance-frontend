import { logMetric } from './metrics.js'
import { config } from '~/src/config/config.js'

const mockLoggerError = jest.fn()

const mockPutMetric = jest.fn()
const mockSetProperty = jest.fn()
const mockPutDimension = jest.fn()
const mockFlush = jest.fn()

const mockMetricsLogger = {
  putMetric: mockPutMetric,
  setProperty: mockSetProperty,
  putDimension: mockPutDimension,
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
    error: (...args) => mockLoggerError(...args)
  }
}))

describe('#metrics', () => {
  const mockMetricsName = 'test-metric'
  const mockValue = 5
  const mockProperties = { test: 'property' }
  const mockDimensions = {
    TestDimension: 'test-value',
    AnotherDimension: 'another-value'
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('When metrics is not enabled', () => {
    beforeEach(async () => {
      config.set('isMetricsEnabled', false)
      await logMetric(mockMetricsName, mockValue)
    })

    test('Should not call metric', () => {
      expect(mockPutMetric).not.toHaveBeenCalled()
    })

    test('Should not call flush', () => {
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

      expect(mockPutDimension).toHaveBeenCalledWith(
        'TestDimension',
        'test-value'
      )
      expect(mockPutDimension).toHaveBeenCalledWith(
        'AnotherDimension',
        'another-value'
      )
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
    })

    test('Should send metric without properties or dimensions', async () => {
      await logMetric(mockMetricsName, mockValue)

      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockSetProperty).not.toHaveBeenCalled()
      expect(mockFlush).toHaveBeenCalled()
    })

    test('Should send metric with dimensions only', async () => {
      await logMetric(mockMetricsName, mockValue, null, mockDimensions)

      expect(mockPutDimension).toHaveBeenCalledWith(
        'TestDimension',
        'test-value'
      )
      expect(mockPutDimension).toHaveBeenCalledWith(
        'AnotherDimension',
        'another-value'
      )
      expect(mockPutMetric).toHaveBeenCalledWith(
        mockMetricsName,
        mockValue,
        'Count'
      )
      expect(mockSetProperty).not.toHaveBeenCalled()
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
      expect(mockLoggerError).toHaveBeenCalledWith(expect.any(Error), mockError)
    })
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
