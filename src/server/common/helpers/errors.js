import { statusCodes } from '~/src/server/common/constants/status-codes.js'

/**
 * @param {number} statusCode
 */
export function statusCodeMessage(statusCode) {
  switch (statusCode) {
    case statusCodes.ok:
      return 'OK'
    case statusCodes.notFound:
      return 'Page not found'
    case statusCodes.forbidden:
      return 'Forbidden'
    case statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCodes.badRequest:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

/**
 * @param { Request } request
 * @param { ResponseToolkit } h
 */
export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = statusCodeMessage(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  // Use appropriate error template based on status code
  let template

  if (statusCode === statusCodes.notFound) {
    template = 'errors/not-found'
  } else if (statusCode === statusCodes.forbidden) {
    template = 'errors/forbidden'
  } else if (statusCode >= statusCodes.internalServerError) {
    template = 'errors/server-error'
  } else {
    // All other status codes (including 4xx client errors) use the generic error template
    template = 'error/index'
  }

  return h
    .view(template, {
      pageTitle: errorMessage,
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}

/**
 * @import { Request, ResponseToolkit } from '@hapi/hapi'
 */
