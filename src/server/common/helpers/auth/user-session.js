import Boom from '@hapi/boom'

/**
 * Get user session from request
 * @param {import('@hapi/hapi').Request} request
 * @returns {Promise<import('@hapi/cookie').ServerState>}
 */
export const getUserSession = async (request) => {
  const { server } = request
  const session = await server.app.cache.get(request.state.session.id)

  if (!session) {
    throw Boom.unauthorized('Session not found')
  }

  return session
}

/**
 * Drop user session
 * @param {import('@hapi/hapi').Request} request
 * @returns {Promise<void>}
 */
export const dropUserSession = async (request) => {
  const { server } = request
  await server.app.cache.drop(request.state.session.id)
}
