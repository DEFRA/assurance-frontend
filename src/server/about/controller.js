/**
 * A GDS styled example about page controller.
 * Provided as an example, remove or modify as required.
 * @satisfies {Partial<ServerRoute>}
 */
import {
  PAGE_TITLES,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'

export const aboutController = {
  handler: (request, h) => {
    return h.view(VIEW_TEMPLATES.ABOUT_INDEX, {
      pageTitle: PAGE_TITLES.ABOUT,
      heading: PAGE_TITLES.ABOUT,
      isAuthenticated: request.auth.isAuthenticated
    })
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
