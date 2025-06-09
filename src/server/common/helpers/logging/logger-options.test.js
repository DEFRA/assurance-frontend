import { loggerOptions } from './logger-options.js'

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

  describe('configuration', () => {
    test('should use configured log level', () => {
      // Assert
      expect(loggerOptions.level).toBe('info')
    })

    test('should have proper serializers', () => {
      // Assert
      expect(loggerOptions.serializers).toBeDefined()
      expect(typeof loggerOptions.serializers.error).toBe('function')
      expect(typeof loggerOptions.serializers.request).toBe('function')
    })

    test('should have proper formatters', () => {
      // Assert
      expect(loggerOptions.formatters).toBeDefined()
      expect(typeof loggerOptions.formatters.level).toBe('function')
      expect(typeof loggerOptions.formatters.bindings).toBe('function')
      expect(typeof loggerOptions.formatters.log).toBe('function')
    })

    test('should have mixin function for trace IDs', () => {
      // Assert
      expect(typeof loggerOptions.mixin).toBe('function')
    })
  })

  describe('formatters', () => {
    test('should format level to uppercase', () => {
      // Act
      const result = loggerOptions.formatters.level('debug')

      // Assert
      expect(result).toEqual({
        level: 'DEBUG'
      })
    })

    test('should pass through bindings', () => {
      // Arrange
      const bindings = { service: 'test', version: '1.0' }

      // Act
      const result = loggerOptions.formatters.bindings(bindings)

      // Assert
      expect(result).toEqual(bindings)
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
      const result = loggerOptions.formatters.log(logObj)

      // Assert
      expect(result).toEqual({
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
      const result = loggerOptions.serializers.error(error)

      // Assert
      expect(result).toMatchObject({
        type: 'Error',
        message: 'Test error',
        code: 'TEST_ERROR',
        stack: expect.any(String)
      })
    })

    test('should handle null errors', () => {
      // Act
      const result = loggerOptions.serializers.error(null)

      // Assert
      expect(result).toBeNull()
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
      const result = loggerOptions.serializers.request(request)

      // Assert
      expect(result).toEqual({
        method: 'GET',
        url: '/test',
        headers: { 'content-type': 'application/json' },
        remoteAddress: '127.0.0.1'
      })
    })

    test('should handle null requests', () => {
      // Act
      const result = loggerOptions.serializers.request(null)

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('mixin', () => {
    test('should include trace ID when available', () => {
      // Act
      const result = loggerOptions.mixin()

      // Assert
      expect(result).toEqual({
        trace: { id: 'mock-trace-id' }
      })
    })
  })
})
