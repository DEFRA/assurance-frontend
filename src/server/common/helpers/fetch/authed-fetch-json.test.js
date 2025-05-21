import { authedFetchJsonDecorator } from './authed-fetch-json.js'
import { config } from '~/src/config/config.js'

// Mock dependencies
jest.mock('~/src/server/common/helpers/logging/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

jest.mock('~/src/config/config.js', () => ({
  config: {
    get: jest.fn()
  }
}))

// Mock global fetch
global.fetch = jest.fn()

describe('Authenticated Fetch JSON Decorator', () => {
  const mockApiUrl = 'https://api.example.com'

  beforeEach(() => {
    jest.clearAllMocks()
    config.get.mockImplementation((key) => {
      if (key === 'api.baseUrl') {
        return mockApiUrl
      }
      return null
    })

    // Setup default mock for fetch
    global.fetch.mockReset()
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue({ data: 'test' }),
      text: jest.fn().mockResolvedValue(JSON.stringify({ data: 'test' }))
    })
  })

  test('should use token from request for fetch', async () => {
    // Arrange
    const request = { auth: { credentials: { token: 'from-request' } } }

    // Act
    const decoratedFetch = authedFetchJsonDecorator(request)
    await decoratedFetch('/data')

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockApiUrl}/data`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer from-request`
        })
      })
    )
  })

  test('should throw if request.auth.credentials is missing', async () => {
    // Arrange
    const request = { auth: {} }
    const decoratedFetch = authedFetchJsonDecorator(request)

    // Act & Assert
    await expect(decoratedFetch('/data')).rejects.toThrow()
  })

  test('should pass custom options to fetch', async () => {
    // Arrange
    const request = { auth: { credentials: { token: 'test-token' } } }
    const options = {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    }

    // Act
    const decoratedFetch = authedFetchJsonDecorator(request)
    await decoratedFetch('/data', options)

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockApiUrl}/data`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: expect.objectContaining({
          Authorization: `Bearer test-token`
        })
      })
    )
  })
})
