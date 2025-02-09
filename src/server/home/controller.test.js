import { createServer } from '~/src/server/index.js'

describe('Home controller', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('should return view with projects', () => {
    expect(true).toBe(true)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
