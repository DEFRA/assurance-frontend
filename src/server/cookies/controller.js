/**
 * Cookies controller
 * @satisfies {Partial<ServerRoute>}
 */

const VIEW_TEMPLATES = {
  COOKIES: 'cookies/views/index'
}

export const cookiesController = {
  get: (request, h) => {
    request.logger.info('Getting cookies page')

    return h.view(VIEW_TEMPLATES.COOKIES, {
      pageTitle: 'Cookie Policy | Defra Digital Assurance'
    })
  }
}
