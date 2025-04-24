import Boom from '@hapi/boom'

/**
 * Handle HTTP response
 * @param {object} response
 * @param {object} response.res
 * @param {object} response.payload
 * @returns {Promise<{res: *, error}|{res: *, payload: *}>}
 */
function handleResponse({ res, payload }) {
  if (res.statusCode >= 400) {
    return {
      res,
      error: Boom.boomify(new Error(payload?.message || 'Request failed'), {
        statusCode: res.statusCode,
        data: payload
      })
    }
  }

  return { res, payload }
}

export { handleResponse }
