import Boom from '@hapi/boom'
import { createProject } from '~/src/server/services/projects.js'

const PAGE_TITLE = 'Add Project | DDTS Assurance'
const PAGE_HEADING = 'Add Project'
const VIEW_TEMPLATE = 'projects/add/index'

const STATUS_OPTIONS = [
  {
    text: 'Select status',
    value: ''
  },
  { value: 'RED', text: 'Red' },
  { value: 'AMBER_RED', text: 'Amber/Red' },
  { value: 'AMBER', text: 'Amber' },
  { value: 'GREEN_AMBER', text: 'Green/Amber' },
  { value: 'GREEN', text: 'Green' },
  { value: 'TBC', text: 'TBC' }
]

const PHASE_OPTIONS = [
  {
    text: 'Select phase',
    value: ''
  },
  { value: 'Discovery', text: 'Discovery' },
  { value: 'Alpha', text: 'Alpha' },
  { value: 'Private Beta', text: 'Private Beta' },
  { value: 'Public Beta', text: 'Public Beta' },
  { value: 'Live', text: 'Live' }
]

export const addProjectController = {
  get: (_request, h) => {
    return h.view(VIEW_TEMPLATE, {
      pageTitle: PAGE_TITLE,
      heading: PAGE_HEADING,
      values: {},
      errors: {},
      statusOptions: STATUS_OPTIONS,
      phaseOptions: PHASE_OPTIONS
    })
  },

  post: async (request, h) => {
    const { name, phase, defCode, status, commentary } = request.payload

    try {
      // Validate required fields (defCode is optional)
      if (!name || !phase || !status || !commentary) {
        return h.view(VIEW_TEMPLATE, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_HEADING,
          errorMessage: 'Please fill in all required fields',
          values: request.payload,
          errors: {
            name: !name,
            phase: !phase,
            status: !status,
            commentary: !commentary
          },
          statusOptions: STATUS_OPTIONS,
          phaseOptions: PHASE_OPTIONS
        })
      }

      try {
        await createProject(
          { name, phase, defCode, status, commentary },
          request
        )
        request.logger.info(`Project "${name}" created successfully`)
        return h.redirect('/?notification=Project created successfully')
      } catch (error) {
        request.logger.error({ error }, 'Failed to create project')

        // Handle validation errors
        if (error.message?.includes('Invalid data')) {
          return h.view(VIEW_TEMPLATE, {
            pageTitle: PAGE_TITLE,
            heading: PAGE_HEADING,
            errorMessage: 'Please check your input - some fields are invalid',
            values: { name, phase, defCode, status, commentary },
            statusOptions: STATUS_OPTIONS,
            phaseOptions: PHASE_OPTIONS,
            errors: {}
          })
        }

        // Handle standards-related errors
        if (error.message?.includes('standards')) {
          return h.view(VIEW_TEMPLATE, {
            pageTitle: PAGE_TITLE,
            heading: PAGE_HEADING,
            errorMessage:
              'Unable to create project: Service standards not available',
            values: { name, phase, defCode, status, commentary },
            statusOptions: STATUS_OPTIONS,
            phaseOptions: PHASE_OPTIONS,
            errors: {}
          })
        }

        throw error
      }
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
