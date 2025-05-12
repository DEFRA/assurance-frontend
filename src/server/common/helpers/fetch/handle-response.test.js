import { handleResponse } from './handle-response.js'
import Boom from '@hapi/boom'

describe('handleResponse', () => {
  it('should return {res, payload} for statusCode < 400', () => {
    const res = { statusCode: 200 }
    const payload = { foo: 'bar' }
    const result = handleResponse({ res, payload })
    expect(result).toEqual({ res, payload })
  })

  it('should return {res, error} with Boom error for statusCode >= 400 and payload.message', () => {
    const res = { statusCode: 404 }
    const payload = { message: 'Not found' }
    const result = handleResponse({ res, payload })
    expect(result.res).toBe(res)
    expect(result.error).toBeInstanceOf(Boom.Boom)
    expect(result.error.output.statusCode).toBe(404)
    expect(result.error.message).toBe('Not found')
    expect(result.error.data).toBe(payload)
  })

  it('should return {res, error} with Boom error for statusCode >= 400 and no payload.message', () => {
    const res = { statusCode: 500 }
    const payload = { foo: 'bar' }
    const result = handleResponse({ res, payload })
    expect(result.res).toBe(res)
    expect(result.error).toBeInstanceOf(Boom.Boom)
    expect(result.error.output.statusCode).toBe(500)
    expect(result.error.message).toBe('Request failed')
    expect(result.error.data).toBe(payload)
  })
})
