import Boom from '@hapi/boom'
import { createProject } from '~/src/server/services/projects.js'
import {
  STATUS,
  STATUS_CLASS,
  STATUS_LABEL
} from '~/src/server/constants/status.js'

const PAGE_TITLE = 'Add Project | DDTS Assurance'
const PAGE_HEADING = 'Add Project'
const VIEW_TEMPLATE = 'projects/add/index'

const STATUS_ORDER = [
  STATUS.GREEN,
  STATUS.GREEN_AMBER,
  STATUS.AMBER,
  STATUS.AMBER_RED,
  STATUS.RED
]

const STATUS_OPTIONS = [
  { text: 'Select status', value: '' },
  ...STATUS_ORDER.map((value) => ({ value, text: STATUS_LABEL[value] }))
]

export const addProjectController = {
  get: (_request, h) => {
    return h.view(VIEW_TEMPLATE, {
      pageTitle: PAGE_TITLE,
      heading: PAGE_HEADING,
      values: {},
      errors: {},
      statusOptions: STATUS_OPTIONS,
      statusClassMap: STATUS_CLASS,
      statusLabelMap: STATUS_LABEL
    })
  },

  post: async (request, h) => {
    const { name, status, commentary } = request.payload

    try {
      // Validate required fields
      if (!name || !status || !commentary) {
        return h.view(VIEW_TEMPLATE, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_HEADING,
          errorMessage: 'Please fill in all required fields',
          values: request.payload,
          errors: {
            name: !name,
            status: !status,
            commentary: !commentary
          },
          statusOptions: STATUS_OPTIONS,
          statusClassMap: STATUS_CLASS,
          statusLabelMap: STATUS_LABEL
        })
      }

      try {
        await createProject({ name, status, commentary }, request)
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
            values: { name, status, commentary },
            statusOptions: STATUS_OPTIONS,
            statusClassMap: STATUS_CLASS,
            statusLabelMap: STATUS_LABEL,
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
            values: { name, status, commentary },
            statusOptions: STATUS_OPTIONS,
            statusClassMap: STATUS_CLASS,
            statusLabelMap: STATUS_LABEL,
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
