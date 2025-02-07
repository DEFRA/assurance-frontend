import { config } from '~/src/config/config.js'
import { ProxyAgent } from 'undici'

/**
 * A GDS styled example home page controller.
 * @satisfies {Partial<ServerRoute>}
 */

export const homeController = {
  handler: async (request, h) => {
    const data = await fetch(`${config.get('api.baseUrl')}/projects`, {
      dispatcher: new ProxyAgent(config.get('httpProxy'))
    })
      .then((response) => {
        request.logger.info(response, 'Fetching projects')
        return response.json()
      })
      .catch(request.logger.error)

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
