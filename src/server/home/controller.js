import { fetch as undiciFetch } from 'undici'
import Boom from '@hapi/boom'

import { config } from '~/src/config/config.js'

/**
 * A GDS styled example home page controller.
 * @satisfies {Partial<ServerRoute>}
 */

export const homeController = {
  handler: async (request, h) => {
    const data = await undiciFetch(`${config.get('api.baseUrl')}/projects`)
      .then((response) => {
        request.logger.info('Fetching projects')

        if (response.ok) {
          return response.json()
        }

        return Boom.boomify(new Error(response.statusText), {
          statusCode: response.status
        })
      })
      .catch((error) => request.logger.error(error))

    // data is either a successful response or a boom error with all the information about the error. Both are
    // printed to the UI. This will help us diagnose what is going on with the calls to the assurance-api

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
