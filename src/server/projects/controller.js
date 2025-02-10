/**
 * Project details controller
 * @satisfies {Partial<ServerRoute>}
 */
import { getServiceStandards } from '../services/service-standards.js'
import Boom from '@hapi/boom'
import {
  getProjectById,
  updateProject
} from '~/src/server/services/projects.js'

export const projectsController = {
  get: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id)
      if (!project) {
        return h.redirect('/?notification=Project not found')
      }

      // Get service standards to merge with project standards
      const standards = await getServiceStandards()

      // Map standards to project assessments and ensure proper numeric sorting
      const standardsWithDetails = project.standards
        .map((assessment) => {
          const standard = standards.find(
            (s) => s.number.toString() === assessment.standardId
          )
          return {
            ...assessment,
            number: standard?.number || parseInt(assessment.standardId, 10),
            name: standard?.name
          }
        })
        .sort((a, b) => (a.number || 0) - (b.number || 0))

      return h.view('projects/detail/index', {
        pageTitle: `${project.name} | DDTS Assurance`,
        heading: project.name,
        project: {
          ...project,
          standards: standardsWithDetails
        }
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getEdit: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id)
      if (!project) {
        return h.redirect('/?notification=Project not found')
      }

      // Get service standards to merge with project standards
      const standards = await getServiceStandards()

      // Map standards to project assessments and ensure proper numeric sorting
      const standardsWithDetails = project.standards
        .map((assessment) => {
          const standard = standards.find(
            (s) => s.number.toString() === assessment.standardId
          )
          return {
            ...assessment,
            number: standard?.number || parseInt(assessment.standardId, 10),
            name: standard?.name
          }
        })
        .sort((a, b) => (a.number || 0) - (b.number || 0))

      return h.view('projects/detail/edit', {
        pageTitle: `Edit ${project.name} | DDTS Assurance`,
        heading: `Edit ${project.name}`,
        project: {
          ...project,
          standards: standardsWithDetails
        },
        statusOptions: [
          { value: 'RED', text: 'Red' },
          { value: 'AMBER', text: 'Amber' },
          { value: 'GREEN', text: 'Green' }
        ]
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postEdit: async (request, h) => {
    const { id } = request.params
    const payload = request.payload

    try {
      const { status, commentary } = payload

      // Restructure standards data from form
      const standards = []
      Object.keys(payload).forEach((key) => {
        if (key.startsWith('standards.')) {
          const [, standardId, field] = key.split('.')

          // Initialize standard object if it doesn't exist
          if (!standards[standardId]) {
            standards[standardId] = { standardId }
          }

          // Add field to standard object
          standards[standardId][field] = payload[key]
        }
      })

      // Filter out empty entries and convert to array
      const parsedStandards = Object.values(standards).filter(Boolean)

      // Log the restructured data
      request.logger.info(
        {
          originalPayload: payload,
          parsedStandards: parsedStandards
        },
        'Parsed form data'
      )

      await updateProject(id, {
        status,
        commentary,
        standards: parsedStandards
      })

      return h.redirect(
        `/projects/${id}?notification=Project updated successfully`
      )
    } catch (error) {
      request.logger.error(
        {
          error,
          payload: request.payload
        },
        'Failed to update project standards'
      )

      // Get project data to re-render form with errors
      const project = await getProjectById(id)

      return h.view('projects/detail/edit', {
        pageTitle: `Edit ${project.name} | DDTS Assurance`,
        heading: `Edit ${project.name}`,
        project,
        statusOptions: [
          { value: 'RED', text: 'Red' },
          { value: 'AMBER', text: 'Amber' },
          { value: 'GREEN', text: 'Green' }
        ],
        errorMessage: 'Failed to update project. Please try again.'
      })
    }
  }
}
