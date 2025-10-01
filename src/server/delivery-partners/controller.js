/**
 * Delivery Partners controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import { getDeliveryPartnerById } from '~/src/server/services/delivery-partners.js'
import {
  getProjects,
  getProjectDeliveryPartners
} from '~/src/server/services/projects.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import {
  getDeliveryPartnerDetailBreadcrumbs,
  truncateBreadcrumbText
} from '~/src/server/common/helpers/breadcrumbs.js'

const VIEW_TEMPLATES = {
  DELIVERY_PARTNERS_DETAIL: 'delivery-partners/views/index',
  ERRORS_NOT_FOUND: 'errors/not-found'
}

const NOTIFICATIONS = {
  DELIVERY_PARTNER_NOT_FOUND: 'Delivery partner not found'
}

/**
 * Check if a project has the specified delivery partner assigned
 * @param {object} project - The project to check
 * @param {string} deliveryPartnerId - The delivery partner ID to look for
 * @param {import('@hapi/hapi').Request} request - The Hapi request object
 * @returns {Promise<object|null>} Project with delivery partners if match found, null otherwise
 */
async function checkProjectForDeliveryPartner(
  project,
  deliveryPartnerId,
  request
) {
  try {
    // Get the delivery partners for this specific project
    const projectDeliveryPartners = await getProjectDeliveryPartners(
      project.id,
      request
    )

    request.logger.debug(
      {
        projectId: project.id,
        projectName: project.name,
        deliveryPartnerId,
        projectDeliveryPartners: projectDeliveryPartners.map((p) => ({
          id: p.id,
          name: p.name
        }))
      },
      'Checking project delivery partners'
    )

    // Check if our delivery partner is in this project's delivery partners
    const hasPartner = projectDeliveryPartners.some(
      (partner) =>
        partner.id === deliveryPartnerId || partner.Id === deliveryPartnerId
    )

    if (!hasPartner) {
      return null
    }

    request.logger.info(
      {
        projectId: project.id,
        projectName: project.name,
        deliveryPartnerId
      },
      'Found project with matching delivery partner'
    )

    // Add the delivery partners to the project for the view
    project.deliveryPartners = projectDeliveryPartners
    return project
  } catch (error) {
    request.logger.warn(
      { error, projectId: project.id, deliveryPartnerId },
      'Error checking delivery partners for project'
    )
    return null
  }
}

/**
 * Get projects by delivery partner ID
 * @param {string} deliveryPartnerId - The delivery partner ID
 * @param {import('@hapi/hapi').Request} request - The Hapi request object
 * @returns {Promise<Array>} - Array of projects for this delivery partner
 */
async function getProjectsByDeliveryPartner(deliveryPartnerId, request) {
  try {
    request.logger.info(
      { deliveryPartnerId },
      'Starting to find projects for delivery partner'
    )

    // Get all projects
    const allProjects = await getProjects(request)
    request.logger.info(
      { totalProjects: allProjects.length, deliveryPartnerId },
      'Retrieved all projects, now checking each for delivery partner assignment'
    )

    // For each project, check if this delivery partner is assigned to it
    const projectsWithDeliveryPartner = []

    for (const project of allProjects) {
      const matchingProject = await checkProjectForDeliveryPartner(
        project,
        deliveryPartnerId,
        request
      )

      if (matchingProject) {
        projectsWithDeliveryPartner.push(matchingProject)
      }
    }

    request.logger.info(
      {
        deliveryPartnerId,
        matchingProjects: projectsWithDeliveryPartner.length,
        projectNames: projectsWithDeliveryPartner.map((p) => p.name)
      },
      'Completed search for projects with delivery partner'
    )

    // Sort projects alphabetically by name
    return projectsWithDeliveryPartner.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, {
        sensitivity: 'base'
      })
    )
  } catch (error) {
    request.logger.error(
      { error, deliveryPartnerId },
      'Error fetching projects for delivery partner'
    )
    return []
  }
}

export const deliveryPartnersController = {
  get: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info(
        { deliveryPartnerId: id },
        'Getting delivery partner details'
      )

      // Fetch delivery partner and its projects in parallel
      const [deliveryPartner, projects] = await Promise.all([
        getDeliveryPartnerById(id, request),
        getProjectsByDeliveryPartner(id, request)
      ])

      if (!deliveryPartner) {
        request.logger.warn(
          { deliveryPartnerId: id },
          'Delivery partner not found'
        )
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.DELIVERY_PARTNER_NOT_FOUND
          })
          .code(statusCodes.notFound)
      }

      // Handle both PascalCase and camelCase field names
      const partnerName = deliveryPartner.Name || deliveryPartner.name
      const partnerLead = deliveryPartner.Lead || deliveryPartner.lead

      request.logger.info(
        { deliveryPartnerId: id, projectCount: projects?.length || 0 },
        'Successfully fetched delivery partner and projects'
      )

      return h.view(VIEW_TEMPLATES.DELIVERY_PARTNERS_DETAIL, {
        pageTitle: `${partnerName} | Delivery Partner`,
        deliveryPartner: {
          id,
          name: partnerName,
          lead: partnerLead
        },
        projects: projects || [],
        breadcrumbs: getDeliveryPartnerDetailBreadcrumbs(
          truncateBreadcrumbText(partnerName)
        )
      })
    } catch (error) {
      request.logger.error(
        { error, deliveryPartnerId: id },
        'Error loading delivery partner details'
      )
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  }
}
