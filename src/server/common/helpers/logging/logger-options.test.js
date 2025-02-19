import { getLoggerOptions } from './logger-options.js'
import { config } from '~/src/config/config.js'

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn((key) => {
      const mockConfig = {
        log: {
          enabled: true,
          level: 'info',
          format: 'ecs',
          redact: ['headers.authorization']
        },
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        env: 'development'
      }
      return key.split('.').reduce((obj, k) => obj?.[k], mockConfig)
    })
  }
}))

jest.mock('@defra/hapi-tracing', () => ({
  getTraceId: jest.fn().mockReturnValue('mock-trace-id')
}))

describe('Logger options', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('log level', () => {
    test('should use configured log level when provided', () => {
      // Arrange
      config.get.mockImplementation((key) => {
        if (key === 'log.level') return 'warn'
        if (key === 'env') return 'development'
        return null
      })

      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.level).toBe('warn')
    })

    test('should default to info in production', () => {
      // Arrange
      config.get.mockImplementation((key) => {
        if (key === 'env') return 'production'
        return null
      })

      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.level).toBe('info')
    })

    test('should default to debug in development', () => {
      // Arrange
      config.get.mockImplementation((key) => {
        if (key === 'env') return 'development'
        return null
      })

      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.level).toBe('debug')
    })
  })

  describe('formatters', () => {
    test('should format level to uppercase', () => {
      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.formatters.level('debug')).toEqual({
        level: 'DEBUG'
      })
    })

    test('should pass through bindings', () => {
      // Arrange
      const bindings = { service: 'test', version: '1.0' }

      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.formatters.bindings(bindings)).toEqual(bindings)
    })

    test('should remove error fields from log object', () => {
      // Arrange
      const logObj = {
        message: 'Test',
        err: new Error('Test error'),
        error: new Error('Another error'),
        data: { test: true }
      }

      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.formatters.log(logObj)).toEqual({
        message: 'Test',
        data: { test: true }
      })
    })
  })

  describe('serializers', () => {
    test('should serialize error objects', () => {
      // Arrange
      const error = new Error('Test error')
      error.code = 'TEST_ERROR'

      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.serializers.error(error)).toMatchObject({
        type: 'Error',
        message: 'Test error',
        code: 'TEST_ERROR',
        stack: expect.any(String)
      })
    })

    test('should handle null errors', () => {
      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.serializers.error(null)).toBeNull()
    })

    test('should serialize request objects', () => {
      // Arrange
      const request = {
        method: 'GET',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        remoteAddress: '127.0.0.1',
        someOtherProp: 'should not be included'
      }

      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.serializers.request(request)).toEqual({
        method: 'GET',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        remoteAddress: '127.0.0.1'
      })
    })

    test('should handle null requests', () => {
      // Act
      const options = getLoggerOptions()

      // Assert
      expect(options.serializers.request(null)).toBeNull()
    })
  })
})
