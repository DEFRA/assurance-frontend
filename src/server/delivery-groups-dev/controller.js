/**
 * Delivery Groups Dev controller (temporary for development)
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import { getDeliveryGroupById } from '~/src/server/services/delivery-groups.js'
import { getProjectsByDeliveryGroup } from '~/src/server/services/projects.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import {
  getDeliveryGroupDetailBreadcrumbs,
  truncateBreadcrumbText
} from '~/src/server/common/helpers/breadcrumbs.js'

const VIEW_TEMPLATES = {
  DELIVERY_GROUPS_DETAIL: 'delivery-groups-dev/views/index',
  ERRORS_NOT_FOUND: 'errors/not-found'
}

const NOTIFICATIONS = {
  DELIVERY_GROUP_NOT_FOUND: 'Delivery group not found'
}

// Mock data for delivery group assessments (temporary)
const mockDeliveryGroupAssessments = {
  'another-delivery-group': {
    outcome:
      'To deliver high-quality digital services that support environmental protection and sustainability initiatives across Defra.',
    roadmapUrl: '/delivery-groups/another-delivery-group/roadmap',
    assessments: [
      {
        area: 'Define and share outcomes',
        status: 'GREEN',
        commentary:
          'Has 4 specific outcomes aligned with strategic roadmap, with regular monthly updates shared with senior leaders and named owners for each outcome.'
      },
      {
        area: 'Maintain a list of products and services',
        status: 'GREEN',
        commentary:
          'Complete service map exists showing all services with clear owners, understood relationships between services, and explicit links to outcomes.'
      },
      {
        area: 'Publish a roadmap for change',
        status: 'GREEN',
        commentary:
          'Published roadmap links change initiatives to outcomes and services, uses clear prioritisation process, has regular reviews, and all team members understand their role.'
      },
      {
        area: 'Define success measures and share progress',
        status: 'AMBER',
        commentary:
          'Measurable indicators defined for each outcome but performance data analysis could be more regular and progress updates need better stakeholder accessibility.'
      }
    ]
  },
  'the-best-group': {
    outcome:
      'To lead innovation in digital transformation while maintaining the highest standards of service delivery and user experience.',
    roadmapUrl: '/delivery-groups/the-best-group/roadmap',
    assessments: [
      {
        area: 'Define and share outcomes',
        status: 'GREEN',
        commentary:
          'Has 5 specific outcomes aligned with strategic roadmap, regular quarterly updates shared with colleagues and senior leaders, and named owners tracking progress for each outcome.'
      },
      {
        area: 'Maintain a list of products and services',
        status: 'GREEN',
        commentary:
          'Comprehensive service map showing all services with designated owners, clear understanding of service relationships, and explicit links to delivery group outcomes.'
      },
      {
        area: 'Publish a roadmap for change',
        status: 'GREEN',
        commentary:
          'Roadmap clearly links initiatives to outcomes and services, established prioritisation process, monthly review cycle, and excellent team understanding of roadmap and roles.'
      },
      {
        area: 'Define success measures and share progress',
        status: 'GREEN',
        commentary:
          'Measurable indicators defined and shared for each outcome, measures linked to outcomes not just activity, regular data analysis, accessible progress updates, and data-driven roadmap decisions.'
      }
    ]
  }
}

// Default mock data for any delivery group not specifically defined above
const getDefaultMockData = (deliveryGroupId) => ({
  outcome: `To accelerate the transition to zero-waste, circular economy by delivering user-centered, data-driven services that enable efficient waste tracking, empower businesses and citizens to reduce waste, and support evidence-based policymaking through accessible, real-time environmental data.`,
  roadmapUrl: `/delivery-groups/${deliveryGroupId}/roadmap`,
  assessments: [
    {
      area: 'Define and share outcomes',
      status: 'GREEN',
      commentary:
        'Has 3 specific outcomes aligned with strategic roadmap priorities, regular updates shared with senior leaders, and named owners tracking progress for each outcome.'
    },
    {
      area: 'Maintain a list of products and services',
      status: 'AMBER',
      commentary:
        'Service map exists showing most services with owners, but relationships between services need better documentation and some services lack clear links to outcomes.'
    },
    {
      area: 'Publish a roadmap for change',
      status: 'AMBER',
      commentary:
        'Roadmap exists but lacks detail on how initiatives link to outcomes and services. Prioritisation process needs strengthening and team understanding could be improved.'
    },
    {
      area: 'Define success measures and share progress',
      status: 'GREEN',
      commentary:
        'Measurable indicators defined for each outcome and clearly linked to delivery group outcomes, with regular performance data analysis and accessible progress updates to stakeholders.'
    }
  ]
})

export const deliveryGroupsDevController = {
  get: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info(
        { deliveryGroupId: id },
        'Getting delivery group details (dev version)'
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

      // Get mock assessment data - use specific data if available, otherwise use default
      const assessmentData =
        mockDeliveryGroupAssessments[id] || getDefaultMockData(id)

      request.logger.info(
        { deliveryGroupId: id, projectCount: projects?.length || 0 },
        'Successfully fetched delivery group and projects (dev version)'
      )

      return h.view(VIEW_TEMPLATES.DELIVERY_GROUPS_DETAIL, {
        pageTitle: `${groupName} | Delivery Group`,
        deliveryGroup: {
          id,
          name: groupName,
          lead: groupLead
        },
        projects: projects || [],
        outcome: assessmentData.outcome,
        roadmapUrl: assessmentData.roadmapUrl,
        assessments: assessmentData.assessments,
        breadcrumbs: getDeliveryGroupDetailBreadcrumbs(
          truncateBreadcrumbText(groupName)
        )
      })
    } catch (error) {
      request.logger.error(
        { error, deliveryGroupId: id },
        'Error loading delivery group details (dev version)'
      )
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  }
}
