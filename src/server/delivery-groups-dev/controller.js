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
    strategicObjective:
      'To deliver high-quality digital services that support environmental protection and sustainability initiatives across Defra.',
    roadmapUrl: '/delivery-groups/another-delivery-group/roadmap',
    assessments: [
      {
        area: 'Outcome clarity',
        status: 'GREEN',
        commentary:
          'Clear understanding of desired outcomes with well-defined success metrics and stakeholder alignment.'
      },
      {
        area: 'Roadmap readiness',
        status: 'AMBER',
        commentary:
          'Roadmap is in place but requires refinement of timelines and resource allocation for Q2 deliverables.'
      },
      {
        area: 'Service landscape',
        status: 'GREEN',
        commentary:
          'Strong understanding of user needs and service requirements based on recent user research findings.'
      },
      {
        area: 'Value realisation',
        status: 'RED',
        commentary:
          'Some concerns about measuring value delivery. Benefits realisation framework needs strengthening.'
      }
    ]
  },
  'the-best-group': {
    strategicObjective:
      'To lead innovation in digital transformation while maintaining the highest standards of service delivery and user experience.',
    roadmapUrl: '/delivery-groups/the-best-group/roadmap',
    assessments: [
      {
        area: 'Outcome clarity',
        status: 'AMBER',
        commentary:
          'Outcomes are defined but need better alignment with business objectives and clearer success criteria.'
      },
      {
        area: 'Roadmap readiness',
        status: 'GREEN',
        commentary:
          'Comprehensive roadmap with clear milestones, dependencies, and resource planning in place.'
      },
      {
        area: 'Service understanding',
        status: 'AMBER',
        commentary:
          'Good understanding of current services but user research for new initiatives is still in progress.'
      },
      {
        area: 'Value realisation',
        status: 'GREEN',
        commentary:
          'Strong value delivery with clear metrics and regular measurement of benefits realisation.'
      }
    ]
  }
}

// Default mock data for any delivery group not specifically defined above
const getDefaultMockData = (deliveryGroupId) => ({
  strategicObjective: `To accelerate the transition to zero-waste, circular economy by delivering user-centered, data-driven services that enable efficient waste tracking, empower businesses and citizens to reduce waste, and support evidence-based policymaking through accessible, real-time environmental data.`,
  roadmapUrl: `/delivery-groups/${deliveryGroupId}/roadmap`,
  assessments: [
    {
      area: 'Outcome clarity',
      status: 'AMBER',
      commentary:
        'Outcomes are generally well understood but may benefit from further refinement and stakeholder alignment.'
    },
    {
      area: 'Roadmap readiness',
      status: 'RED',
      commentary: 'Roadmap is not in place.'
    },
    {
      area: 'Service understanding',
      status: 'AMBER',
      commentary:
        'Good understanding of current service requirements with ongoing user research to validate assumptions.'
    },
    {
      area: 'Value realisation',
      status: 'AMBER',
      commentary:
        'Value delivery is on track but monitoring and measurement processes could be enhanced.'
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
        strategicObjective: assessmentData.strategicObjective,
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
