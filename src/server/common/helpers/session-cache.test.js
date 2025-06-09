import { plugin } from './session-cache.js'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'

// Mock the logger
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn()
  }
}))

// Mock the config
jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

describe('Session Cache Plugin', () => {
  let mockServer
  let mockSessionCache

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup config mock
    config.get.mockImplementation((key) => {
      if (key === 'session.cache.ttl') {
        return 3600000 // 1 hour in milliseconds
      }
      return undefined
    })

    // Create mock session cache with promise-based methods
    mockSessionCache = {
      get: jest.fn(),
      set: jest.fn(),
      drop: jest.fn()
    }

    // Create mock server
    mockServer = {
      cache: jest.fn().mockReturnValue(mockSessionCache),
      app: {}
    }
  })

  describe('plugin configuration', () => {
    test('should have correct plugin metadata', () => {
      expect(plugin.name).toBe('session-cache')
      expect(plugin.version).toBe('1.0.0')
      expect(typeof plugin.register).toBe('function')
    })
  })

  describe('plugin registration', () => {
    test('should create session cache with correct configuration', async () => {
      // Act
      await plugin.register(mockServer)

      // Assert
      expect(mockServer.cache).toHaveBeenCalledWith({
        segment: 'sessions',
        expiresIn: 3600000,
        shared: true
      })
    })

    test('should add enhanced cache to server app', async () => {
      // Act
      await plugin.register(mockServer)

      // Assert
      expect(mockServer.app.sessionCache).toBeDefined()
      expect(typeof mockServer.app.sessionCache.get).toBe('function')
      expect(typeof mockServer.app.sessionCache.set).toBe('function')
      expect(typeof mockServer.app.sessionCache.drop).toBe('function')
    })
  })

  describe('enhanced cache - get method', () => {
    let enhancedCache

    beforeEach(async () => {
      await plugin.register(mockServer)
      enhancedCache = mockServer.app.sessionCache
    })

    test('should return result when cache hit', async () => {
      // Arrange
      const sessionId = 'test-session-123'
      const sessionData = { userId: 'user-456', role: 'admin' }
      mockSessionCache.get.mockResolvedValue(sessionData)

      // Act
      const result = await enhancedCache.get(sessionId)

      // Assert
      expect(result).toEqual(sessionData)
      expect(mockSessionCache.get).toHaveBeenCalledWith(sessionId)
      expect(logger.debug).not.toHaveBeenCalled() // No cache miss log
    })

    test('should handle cache miss and log debug message', async () => {
      // Arrange
      const sessionId = 'missing-session-123'
      mockSessionCache.get.mockResolvedValue(null)

      // Act
      const result = await enhancedCache.get(sessionId)

      // Assert
      expect(result).toBeNull()
      expect(mockSessionCache.get).toHaveBeenCalledWith(sessionId)
      expect(logger.debug).toHaveBeenCalledWith(
        `Session cache miss for id: ${sessionId}`
      )
    })

    test('should handle cache get error and return null', async () => {
      // Arrange
      const sessionId = 'error-session-123'
      const cacheError = new Error('Cache connection failed')
      mockSessionCache.get.mockRejectedValue(cacheError)

      // Act
      const result = await enhancedCache.get(sessionId)

      // Assert
      expect(result).toBeNull()
      expect(mockSessionCache.get).toHaveBeenCalledWith(sessionId)
      expect(logger.error).toHaveBeenCalledWith(
        `Session cache get error for id: ${sessionId}`,
        cacheError
      )
    })

    test('should handle undefined/falsy results', async () => {
      // Arrange
      const sessionId = 'undefined-session-123'
      mockSessionCache.get.mockResolvedValue(undefined)

      // Act
      const result = await enhancedCache.get(sessionId)

      // Assert
      expect(result).toBeUndefined()
      expect(logger.debug).toHaveBeenCalledWith(
        `Session cache miss for id: ${sessionId}`
      )
    })
  })

  describe('enhanced cache - set method', () => {
    let enhancedCache

    beforeEach(async () => {
      await plugin.register(mockServer)
      enhancedCache = mockServer.app.sessionCache
    })

    test('should set cache value successfully', async () => {
      // Arrange
      const sessionId = 'new-session-123'
      const sessionData = { userId: 'user-789', permissions: ['read', 'write'] }
      const ttl = 7200000 // 2 hours
      mockSessionCache.set.mockResolvedValue()

      // Act
      const result = await enhancedCache.set(sessionId, sessionData, ttl)

      // Assert
      expect(result).toBe(true)
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        sessionId,
        sessionData,
        ttl
      )
      expect(logger.debug).toHaveBeenCalledWith(
        `Session cache set for id: ${sessionId}`
      )
    })

    test('should set cache value with default TTL when not provided', async () => {
      // Arrange
      const sessionId = 'default-ttl-session'
      const sessionData = { userId: 'user-default' }
      mockSessionCache.set.mockResolvedValue()

      // Act
      const result = await enhancedCache.set(sessionId, sessionData)

      // Assert
      expect(result).toBe(true)
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        sessionId,
        sessionData,
        0
      )
      expect(logger.debug).toHaveBeenCalledWith(
        `Session cache set for id: ${sessionId}`
      )
    })

    test('should handle cache set error and return false', async () => {
      // Arrange
      const sessionId = 'error-set-session'
      const sessionData = { userId: 'user-error' }
      const cacheError = new Error('Cache write failed')
      mockSessionCache.set.mockRejectedValue(cacheError)

      // Act
      const result = await enhancedCache.set(sessionId, sessionData)

      // Assert
      expect(result).toBe(false)
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        sessionId,
        sessionData,
        0
      )
      expect(logger.error).toHaveBeenCalledWith(
        `Session cache set error for id: ${sessionId}`,
        cacheError
      )
    })

    test('should handle complex session data objects', async () => {
      // Arrange
      const sessionId = 'complex-session'
      const complexSessionData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          profile: {
            name: 'Test User',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        metadata: {
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }
      }
      mockSessionCache.set.mockResolvedValue()

      // Act
      const result = await enhancedCache.set(sessionId, complexSessionData)

      // Assert
      expect(result).toBe(true)
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        sessionId,
        complexSessionData,
        0
      )
    })
  })

  describe('enhanced cache - drop method', () => {
    let enhancedCache

    beforeEach(async () => {
      await plugin.register(mockServer)
      enhancedCache = mockServer.app.sessionCache
    })

    test('should drop cache entry successfully', async () => {
      // Arrange
      const sessionId = 'session-to-drop'
      mockSessionCache.drop.mockResolvedValue()

      // Act
      const result = await enhancedCache.drop(sessionId)

      // Assert
      expect(result).toBe(true)
      expect(mockSessionCache.drop).toHaveBeenCalledWith(sessionId)
      expect(logger.debug).toHaveBeenCalledWith(
        `Session cache dropped for id: ${sessionId}`
      )
    })

    test('should handle cache drop error and return false', async () => {
      // Arrange
      const sessionId = 'error-drop-session'
      const cacheError = new Error('Cache drop failed')
      mockSessionCache.drop.mockRejectedValue(cacheError)

      // Act
      const result = await enhancedCache.drop(sessionId)

      // Assert
      expect(result).toBe(false)
      expect(mockSessionCache.drop).toHaveBeenCalledWith(sessionId)
      expect(logger.error).toHaveBeenCalledWith(
        `Session cache drop error for id: ${sessionId}`,
        cacheError
      )
    })

    test('should handle dropping non-existent sessions gracefully', async () => {
      // Arrange
      const sessionId = 'non-existent-session'
      mockSessionCache.drop.mockResolvedValue() // Successful even if doesn't exist

      // Act
      const result = await enhancedCache.drop(sessionId)

      // Assert
      expect(result).toBe(true)
      expect(mockSessionCache.drop).toHaveBeenCalledWith(sessionId)
      expect(logger.debug).toHaveBeenCalledWith(
        `Session cache dropped for id: ${sessionId}`
      )
    })
  })

  describe('config integration', () => {
    test('should use custom TTL from config', async () => {
      // Arrange
      const customTTL = 1800000 // 30 minutes
      config.get.mockImplementation((key) => {
        if (key === 'session.cache.ttl') {
          return customTTL
        }
        return undefined
      })

      // Act
      await plugin.register(mockServer)

      // Assert
      expect(mockServer.cache).toHaveBeenCalledWith({
        segment: 'sessions',
        expiresIn: customTTL,
        shared: true
      })
    })

    test('should handle missing config gracefully', async () => {
      // Arrange
      config.get.mockReturnValue(undefined)

      // Act
      await plugin.register(mockServer)

      // Assert
      expect(mockServer.cache).toHaveBeenCalledWith({
        segment: 'sessions',
        expiresIn: undefined,
        shared: true
      })
    })
  })

  describe('integration scenarios', () => {
    let enhancedCache

    beforeEach(async () => {
      await plugin.register(mockServer)
      enhancedCache = mockServer.app.sessionCache
    })

    test('should support full session lifecycle', async () => {
      // Arrange
      const sessionId = 'lifecycle-session'
      const sessionData = { userId: 'lifecycle-user' }

      // Mock successful operations
      mockSessionCache.set.mockResolvedValue()
      mockSessionCache.get.mockResolvedValue(sessionData)
      mockSessionCache.drop.mockResolvedValue()

      // Act & Assert - Set session
      const setResult = await enhancedCache.set(sessionId, sessionData)
      expect(setResult).toBe(true)

      // Act & Assert - Get session
      const getResult = await enhancedCache.get(sessionId)
      expect(getResult).toEqual(sessionData)

      // Act & Assert - Drop session
      const dropResult = await enhancedCache.drop(sessionId)
      expect(dropResult).toBe(true)

      // Verify all operations were called
      expect(mockSessionCache.set).toHaveBeenCalledWith(
        sessionId,
        sessionData,
        0
      )
      expect(mockSessionCache.get).toHaveBeenCalledWith(sessionId)
      expect(mockSessionCache.drop).toHaveBeenCalledWith(sessionId)
    })

    test('should handle concurrent operations', async () => {
      // Arrange
      const sessions = [
        { id: 'session-1', data: { userId: 'user-1' } },
        { id: 'session-2', data: { userId: 'user-2' } },
        { id: 'session-3', data: { userId: 'user-3' } }
      ]

      mockSessionCache.set.mockResolvedValue()
      mockSessionCache.get.mockImplementation((id) => {
        const session = sessions.find((s) => s.id === id)
        return Promise.resolve(session?.data ?? null)
      })

      // Act - Set multiple sessions concurrently
      const setPromises = sessions.map((session) =>
        enhancedCache.set(session.id, session.data)
      )
      const setResults = await Promise.all(setPromises)

      // Act - Get multiple sessions concurrently
      const getPromises = sessions.map((session) =>
        enhancedCache.get(session.id)
      )
      const getResults = await Promise.all(getPromises)

      // Assert
      expect(setResults).toEqual([true, true, true])
      expect(getResults).toEqual([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' }
      ])
    })
  })
})
