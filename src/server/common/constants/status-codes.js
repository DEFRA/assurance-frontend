/**
 * @typedef {Record<string, number>} StatusCodes
 */
export const statusCodes = {
  // Success responses
  ok: 200,
  created: 201,
  noContent: 204,

  // Client error responses
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessableEntity: 422,

  // Server error responses
  internalServerError: 500,
  badGateway: 502,
  serviceUnavailable: 503,
  gatewayTimeout: 504,

  // Special cases
  imATeapot: 418
}

/**
 * User-friendly error messages for each status code
 */
export const errorMessages = {
  [statusCodes.badRequest]: 'Bad Request',
  [statusCodes.unauthorized]: 'Authentication Required',
  [statusCodes.forbidden]: 'Access Forbidden',
  [statusCodes.notFound]: 'Page Not Found',
  [statusCodes.internalServerError]: 'Internal Server Error',
  [statusCodes.serviceUnavailable]: 'Service Unavailable'
}
