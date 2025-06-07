import { createProject } from '~/src/server/services/projects.js'
import {
  NOTIFICATIONS,
  VIEW_TEMPLATES,
  DDTS_ASSURANCE_SUFFIX
} from '~/src/server/constants/notifications.js'
import { PROJECT_STATUS_OPTIONS } from '~/src/server/constants/status.js'

const PAGE_TITLE = `Add Project${DDTS_ASSURANCE_SUFFIX}`
const PAGE_HEADING = 'Add Project'

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

/**
 * @satisfies {Partial<ServerRoute>}
 */
export const addProjectController = {
  get: (request, h) => {
    try {
      return h.view(VIEW_TEMPLATES.PROJECTS_ADD_INDEX, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_HEADING,
        values: {},
        errors: {},
        statusOptions: PROJECT_STATUS_OPTIONS,
        phaseOptions: PHASE_OPTIONS
      })
    } catch (error) {
      request.logger.error({ error }, 'Error loading add project page')
      throw error
    }
  },

  post: async (request, h) => {
    const { name, description, phase, defCode } = request.payload

    try {
      // Validate required fields
      if (!name || !phase) {
        return h.view(VIEW_TEMPLATES.PROJECTS_ADD_INDEX, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_HEADING,
          values: request.payload,
          errors: {
            name: !name ? { text: 'Enter a project name' } : null,
            phase: !phase ? { text: 'Select a project phase' } : null
          },
          errorMessage: 'Please check your input - some fields are required'
        })
      }

      // Create the project
      await createProject(
        {
          name,
          description,
          phase,
          defCode: defCode || '',
          status: 'TBC',
          commentary: ''
        },
        request
      )

      request.logger.info(`Project "${name}" created successfully`)
      return h.redirect(
        `/?notification=${NOTIFICATIONS.PROJECT_CREATED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, NOTIFICATIONS.FAILED_TO_CREATE_PROJECT)

      return h.view(VIEW_TEMPLATES.PROJECTS_ADD_INDEX, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_HEADING,
        values: request.payload,
        errors: {},
        errorMessage: NOTIFICATIONS.FAILED_TO_CREATE_PROJECT
      })
    }
  }
}

// Alternative constant-based post method
export const postCreateProject = async (request, h) => {
  const { name, description, phase, defCode } = request.payload

  try {
    // Validate required fields
    if (!name || !phase) {
      return h.view(VIEW_TEMPLATES.PROJECTS_ADD_INDEX, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_HEADING,
        values: request.payload,
        errors: {
          name: !name ? { text: 'Enter a project name' } : null,
          phase: !phase ? { text: 'Select a project phase' } : null
        },
        errorMessage: 'Please check your input - some fields are required'
      })
    }

    // Create the project
    await createProject(
      {
        name,
        description,
        phase,
        defCode: defCode || '',
        status: 'TBC',
        commentary: ''
      },
      request
    )

    request.logger.info(`Project "${name}" created successfully`)
    return h.redirect(
      `/?notification=${NOTIFICATIONS.PROJECT_CREATED_SUCCESSFULLY}`
    )
  } catch (error) {
    request.logger.error({ error }, NOTIFICATIONS.FAILED_TO_CREATE_PROJECT)

    return h.view(VIEW_TEMPLATES.PROJECTS_ADD_INDEX, {
      pageTitle: PAGE_TITLE,
      heading: PAGE_HEADING,
      values: request.payload,
      errors: {},
      errorMessage: NOTIFICATIONS.FAILED_TO_CREATE_PROJECT
    })
  }
}
