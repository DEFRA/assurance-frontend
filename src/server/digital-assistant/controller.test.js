import { createServer } from '~/src/server/index.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

describe('#digitalAssistantController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected page response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/digital-assistant'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Digital Assistant')
  })

  test('Should handle submit endpoint', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/digital-assistant/submit',
      payload: {
        prompt: ''
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Please enter a prompt before submitting.')
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
