import { API_AUTH_MESSAGES } from './log-messages.js'

describe('API_AUTH_MESSAGES constants', () => {
  test('should have USING_AUTHENTICATED_FETCHER constant', () => {
    expect(API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER).toBeDefined()
    expect(typeof API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER).toBe('string')
    expect(API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER).toContain(
      '[API_AUTH]'
    )
    expect(API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER).toContain(
      'authenticated fetcher'
    )
  })

  test('should have NO_REQUEST_CONTEXT constant', () => {
    expect(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT).toBeDefined()
    expect(typeof API_AUTH_MESSAGES.NO_REQUEST_CONTEXT).toBe('string')
    expect(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT).toContain('[API_AUTH]')
    expect(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT).toContain('No request context')
    expect(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT).toContain(
      'unauthenticated fetcher'
    )
  })

  test('should have correct constant values', () => {
    expect(API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER).toBe(
      '[API_AUTH] Using authenticated fetcher'
    )
    expect(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT).toBe(
      '[API_AUTH] No request context provided, using unauthenticated fetcher'
    )
  })

  test('constants should have expected structure', () => {
    // Verify the constants object has the expected properties
    expect(Object.keys(API_AUTH_MESSAGES)).toEqual([
      'USING_AUTHENTICATED_FETCHER',
      'NO_REQUEST_CONTEXT'
    ])

    // Verify they are all strings
    Object.values(API_AUTH_MESSAGES).forEach((value) => {
      expect(typeof value).toBe('string')
      expect(value.length).toBeGreaterThan(0)
    })
  })
})
