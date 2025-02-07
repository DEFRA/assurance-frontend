/**
 * Project details controller
 * @satisfies {Partial<ServerRoute>}
 */
import { getProjects } from '../services/projects.js'
import { getServiceStandards } from '../services/service-standards.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'

export const projectsController = {
  handler: async (request, h) => {
    const logger = createLogger()
    const { id } = request.params

    try {
      const projects = await getProjects()
      logger.info({ count: projects.length }, 'Fetched projects')

      // Find project by MongoDB ID
      const project = projects.find((p) => p.id === id)
      logger.info(
        {
          projectId: id,
          projectName: project?.name
        },
        'Project lookup'
      )

      if (!project) {
        logger.warn({ projectId: id }, 'Project not found')
        return h.redirect('/')
      }

      const standards = await getServiceStandards()
      logger.info({ count: standards.length }, 'Fetched standards')
      logger.info(
        {
          projectStandardIds: project.standards.map((s) => s.standardId),
          apiStandardIds: standards.map((s) => s.id)
        },
        'Comparing standard IDs'
      )

      // Map standards to project assessments
      const standardsWithDetails = project.standards
        .map((assessment) => {
          const standard = standards.find(
            (s) => s.number.toString() === assessment.standardId
          )
          logger.info(
            {
              standardId: assessment.standardId,
              foundStandard: standard,
              allStandardNumbers: standards.map((s) => s.number)
            },
            'Standard mapping attempt'
          )
          return {
            id: assessment.standardId,
            number: standard?.number,
            name: standard?.name,
            status: assessment.status,
            commentary: assessment.commentary
          }
        })
        .sort((a, b) => a.number - b.number)

      logger.info(
        {
          mappedStandards: standardsWithDetails,
          originalStandards: standards,
          projectStandards: project.standards
        },
        'Standards mapping complete'
      )

      return h.view('projects/details', {
        pageTitle: `${project.name} - Technical Assessment`,
        heading: project.name,
        project: {
          ...project,
          standards: standardsWithDetails
        }
      })
    } catch (error) {
      logger.error('Error in project controller:', error)
      throw error
    }
  }
}
