import * as Wreck from '@hapi/wreck'
import { fetchJson } from './fetch-json.js'
import { handleResponse } from './handle-response.js'
import * as tracing from '@defra/hapi-tracing'

jest.mock('@hapi/wreck', () => ({
  get: jest.fn(),
  post: jest.fn()
}))
jest.mock('./handle-response.js')
jest.mock('@defra/hapi-tracing', () => ({
  getTraceId: jest.fn()
}))

const mockRes = { statusCode: 200 }
const mockPayload = { foo: 'bar' }

beforeEach(() => {
  jest.clearAllMocks()
  tracing.getTraceId.mockReturnValue('trace-id')
})

describe('fetchJson', () => {
  it('should make GET request and return handled response', async () => {
    Wreck.get.mockResolvedValue({ res: mockRes, payload: mockPayload })
    handleResponse.mockReturnValue({ res: mockRes, payload: mockPayload })
    const result = await fetchJson('http://test', {})
    expect(Wreck.get).toHaveBeenCalled()
    expect(handleResponse).toHaveBeenCalledWith({
      res: mockRes,
      payload: mockPayload
    })
    expect(result).toEqual({ res: mockRes, payload: mockPayload })
  })

  it('should make POST request and return handled response', async () => {
    Wreck.post.mockResolvedValue({ res: mockRes, payload: mockPayload })
    handleResponse.mockReturnValue({ res: mockRes, payload: mockPayload })
    const result = await fetchJson('http://test', { method: 'POST' })
    expect(Wreck.post).toHaveBeenCalled()
    expect(handleResponse).toHaveBeenCalledWith({
      res: mockRes,
      payload: mockPayload
    })
    expect(result).toEqual({ res: mockRes, payload: mockPayload })
  })

  it('should handle non-JSON response', async () => {
    Wreck.get.mockResolvedValue({ res: mockRes, payload: 'plain text' })
    handleResponse.mockReturnValue({ res: mockRes, payload: 'plain text' })
    const result = await fetchJson('http://test', {})
    expect(result).toEqual({ res: mockRes, payload: 'plain text' })
  })

  it('should handle error status code', async () => {
    Wreck.get.mockResolvedValue({
      res: { statusCode: 404 },
      payload: { message: 'Not found' }
    })
    handleResponse.mockReturnValue({
      res: { statusCode: 404 },
      error: new Error('Not found')
    })
    const result = await fetchJson('http://test', {})
    expect(result).toEqual({
      res: { statusCode: 404 },
      error: new Error('Not found')
    })
  })

  it('should handle network error', async () => {
    Wreck.get.mockRejectedValue(new Error('Network error'))
    await expect(fetchJson('http://test', {})).rejects.toThrow('Network error')
  })

  it('should add tracing header when traceId is available', async () => {
    Wreck.get.mockResolvedValue({ res: mockRes, payload: mockPayload })
    await fetchJson('http://test', {})
    expect(Wreck.get).toHaveBeenCalledWith(
      'http://test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-cdp-request-id': 'trace-id'
        })
      })
    )
  })
})
