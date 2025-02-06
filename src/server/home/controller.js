import { config } from '~/src/config/config.js'

/**
 * A GDS styled example home page controller.
 * @satisfies {Partial<ServerRoute>}
 */

export const homeController = {
  handler: async (request, h) => {
    let data
    const response = await fetch(`${config.get('api.baseUrl')}/projects`)

    if (response.ok) {
      data = await response.json()
    }

    request.logger.info(response, 'Fetching projects from API')

    return h.view('home/index', {
      pageTitle: 'DDTS Technical Assurance Dashboard',
      heading: 'DDTS Technical Assurance Dashboard',
      projects: data
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
