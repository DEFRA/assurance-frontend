/**
 * Delivery Groups controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import { getDeliveryGroupById } from '~/src/server/services/delivery-groups.js'
import { getProjectsByDeliveryGroup } from '~/src/server/services/projects.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

const VIEW_TEMPLATES = {
  DELIVERY_GROUPS_DETAIL: 'delivery-groups/views/index',
  ERRORS_NOT_FOUND: 'errors/not-found'
}

const NOTIFICATIONS = {
  DELIVERY_GROUP_NOT_FOUND: 'Delivery group not found'
}

export const deliveryGroupsController = {
  get: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info(
        { deliveryGroupId: id },
        'Getting delivery group details'
      )

      // Fetch delivery group and its projects in parallel
      const [deliveryGroup, projects] = await Promise.all([
        getDeliveryGroupById(id, request),
        getProjectsByDeliveryGroup(id, request)
      ])

      if (!deliveryGroup) {
        request.logger.warn({ deliveryGroupId: id }, 'Delivery group not found')
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.DELIVERY_GROUP_NOT_FOUND
          })
          .code(statusCodes.notFound)
      }

      // Handle both PascalCase and camelCase field names
      const groupName = deliveryGroup.Name || deliveryGroup.name
      const groupLead = deliveryGroup.Lead || deliveryGroup.lead

      request.logger.info(
        { deliveryGroupId: id, projectCount: projects?.length || 0 },
        'Successfully fetched delivery group and projects'
      )

      return h.view(VIEW_TEMPLATES.DELIVERY_GROUPS_DETAIL, {
        pageTitle: `${groupName} | Delivery Group`,
        deliveryGroup: {
          id,
          name: groupName,
          lead: groupLead
        },
        projects: projects || []
      })
    } catch (error) {
      request.logger.error(
        { error, deliveryGroupId: id },
        'Error loading delivery group details'
      )
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  }
}
