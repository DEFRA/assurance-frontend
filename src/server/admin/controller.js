import Boom from '@hapi/boom'
import {
  getServiceStandards,
  getAllServiceStandards,
  createServiceStandard,
  updateServiceStandard,
  deleteServiceStandard,
  restoreServiceStandard,
  getServiceStandardById
} from '~/src/server/services/service-standards.js'
import {
  getProjects,
  deleteProject,
  getProjectById
} from '~/src/server/services/projects.js'
import {
  getProfessions,
  getAllProfessions,
  createProfession,
  updateProfession,
  deleteProfession,
  restoreProfession
} from '~/src/server/services/professions.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProfessions } from '~/src/server/data/professions.js'
import { config } from '~/src/config/config.js'
import {
  NOTIFICATIONS,
  PAGE_TITLES,
  HEADINGS,
  VIEW_TEMPLATES,
  ADMIN_NOTIFICATIONS,
  LOG_MESSAGES
} from '~/src/server/constants/notifications.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

// API endpoint constants for admin operations
const SERVICESTANDARDS_DELETE_ALL = 'servicestandards/deleteAll'
const SERVICESTANDARDS_SEED = 'servicestandards/seed'
const PROFESSIONS_DELETE_ALL = 'professions/deleteAll'
const PROFESSIONS_SEED = 'professions/seed'

// URL constants
const ADMIN_BASE_URL = '/admin'

// API configuration constants
const API_VERSION_KEY = 'api.version'
const API_BASE_PREFIX = '/api'

// Helper functions to reduce complexity
const fetchStandardsData = async (request) => {
  try {
    const standards = (await getServiceStandards(request)) || []
    const allStandards = (await getAllServiceStandards(request)) || []
    return { standards, allStandards }
  } catch (error) {
    request.logger.warn(
      { error },
      'Could not fetch standards from API, using defaults'
    )
    return {
      standards: defaultServiceStandards,
      allStandards: defaultServiceStandards
    }
  }
}

const fetchProjectsData = async (request) => {
  try {
    return (await getProjects(request)) || []
  } catch (error) {
    request.logger.error({ error }, 'Error fetching projects')
    throw Boom.boomify(error, {
      statusCode: statusCodes.internalServerError
    })
  }
}

const fetchProfessionsData = async (request) => {
  try {
    const professions = (await getProfessions(request)) || []
    const allProfessions = (await getAllProfessions(request)) || []
    return { professions, allProfessions }
  } catch (error) {
    request.logger.error({ error }, 'Error fetching professions')
    return {
      professions: defaultProfessions,
      allProfessions: defaultProfessions
    }
  }
}

const getEnvironmentFlags = () => {
  const isTestEnvironment = config.get ? config.get('env') === 'test' : false
  const isDevelopment = config.get ? config.get('env') === 'development' : false
  return { isTestEnvironment, isDevelopment }
}

export const adminController = {
  get: async (request, h) => {
    try {
      const { standards, allStandards } = await fetchStandardsData(request)
      const projects = await fetchProjectsData(request)
      const { professions, allProfessions } =
        await fetchProfessionsData(request)
      const { isTestEnvironment, isDevelopment } = getEnvironmentFlags()

      return h.view(VIEW_TEMPLATES.ADMIN_INDEX, {
        pageTitle: PAGE_TITLES.DATA_MANAGEMENT,
        heading: HEADINGS.DATA_MANAGEMENT,
        standardsCount: standards?.length || 0,
        projectsCount: projects?.length || 0,
        professionsCount: professions?.length || 0,
        projects,
        standards: allStandards,
        professions: allProfessions,
        notification: request.query.notification,
        isTestEnvironment,
        isDevelopment
      })
    } catch (error) {
      request.logger.error({ error }, 'Error fetching admin dashboard data')
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  deleteStandards: async (request, h) => {
    try {
      request.logger.info(LOG_MESSAGES.STANDARDS_DELETED)

      const authedFetch = authedFetchJsonDecorator(request)
      const apiVersion = config.get(API_VERSION_KEY)

      // Use the versioned controller endpoint for deleting all standards
      await authedFetch(
        `${API_BASE_PREFIX}/${apiVersion}/${SERVICESTANDARDS_DELETE_ALL}`,
        {
          method: 'POST'
        }
      )

      request.logger.info('Standards deleted successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.STANDARDS_DELETED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete standards')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_DELETE_STANDARDS}`
      )
    }
  },

  deleteProject: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ id }, 'Deleting project')

      const result = await deleteProject(id, request)

      if (!result) {
        request.logger.warn({ id }, LOG_MESSAGES.PROJECT_NOT_FOUND_FOR_DELETION)
        return h.redirect(
          `${ADMIN_BASE_URL}?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`
        )
      }

      request.logger.info({ id }, LOG_MESSAGES.PROJECT_DELETED)
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.PROJECT_DELETED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, LOG_MESSAGES.FAILED_TO_DELETE_PROJECT)
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_DELETE_PROJECT}`
      )
    }
  },

  confirmDeleteProject: async (request, h) => {
    const { id } = request.params

    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteProject(request, h)
      }

      // Otherwise show confirmation page
      let projectName = 'this project'

      try {
        const project = await getProjectById(id, request)
        if (project) {
          projectName = project.name
        }
      } catch (error) {
        request.logger.warn(
          { error, id },
          'Failed to fetch project for confirmation page'
        )
        // Continue with generic name if project fetch fails
      }

      return h.view(VIEW_TEMPLATES.ADMIN_CONFIRM_DELETE, {
        pageTitle: PAGE_TITLES.CONFIRM_PROJECT_DELETION,
        heading: HEADINGS.DELETE_PROJECT,
        message: `Are you sure you want to delete the project "${projectName}"?`,
        confirmUrl: `${ADMIN_BASE_URL}/projects/${id}/delete`,
        cancelUrl: id ? `/projects/${id}` : ADMIN_BASE_URL,
        backLink: id ? `/projects/${id}` : ADMIN_BASE_URL
      })
    } catch (error) {
      request.logger.error(
        { error },
        LOG_MESSAGES.FAILED_TO_SHOW_DELETE_CONFIRMATION
      )
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SHOW_DELETE_CONFIRMATION}`
      )
    }
  },

  confirmDeleteAllStandards: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteStandards(request, h)
      }

      // Otherwise show confirmation page
      return h.view(VIEW_TEMPLATES.ADMIN_CONFIRM_DELETE, {
        pageTitle: PAGE_TITLES.CONFIRM_DELETE_ALL_STANDARDS,
        heading: HEADINGS.DELETE_ALL_STANDARDS,
        message:
          'Are you sure you want to delete ALL service standards? This will remove all standard definitions from the system.',
        confirmUrl: `${ADMIN_BASE_URL}/standards/delete`,
        cancelUrl: ADMIN_BASE_URL,
        backLink: ADMIN_BASE_URL
      })
    } catch (error) {
      request.logger.error(
        { error },
        LOG_MESSAGES.FAILED_TO_SHOW_DELETE_CONFIRMATION
      )
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SHOW_DELETE_CONFIRMATION}`
      )
    }
  },

  confirmDeleteAllProfessions: async (request, h) => {
    try {
      // If this is a POST with confirmed=true, proceed with deletion
      if (request.method === 'post' && request.payload.confirmed === 'true') {
        return await adminController.deleteProfessions(request, h)
      }

      // Otherwise show confirmation page
      return h.view(VIEW_TEMPLATES.ADMIN_CONFIRM_DELETE, {
        pageTitle: PAGE_TITLES.CONFIRM_DELETE_ALL_PROFESSIONS,
        heading: HEADINGS.DELETE_ALL_PROFESSIONS,
        message:
          'Are you sure you want to delete ALL professions? This will remove all profession definitions from the system.',
        confirmUrl: `${ADMIN_BASE_URL}/professions/delete`,
        cancelUrl: ADMIN_BASE_URL,
        backLink: ADMIN_BASE_URL
      })
    } catch (error) {
      request.logger.error(
        { error },
        LOG_MESSAGES.FAILED_TO_SHOW_DELETE_CONFIRMATION
      )
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SHOW_DELETE_CONFIRMATION}`
      )
    }
  },

  deleteProfessions: async (request, h) => {
    try {
      const authedFetch = authedFetchJsonDecorator(request)
      const apiVersion = config.get(API_VERSION_KEY)

      // Use the versioned controller endpoint for deleting all professions
      const result = await authedFetch(
        `${API_BASE_PREFIX}/${apiVersion}/${PROFESSIONS_DELETE_ALL}`,
        {
          method: 'POST'
        }
      )

      request.logger.info(
        { result: result || 'no response data' },
        'Delete professions result via versioned controller'
      )

      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.PROFESSIONS_DELETED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, 'Error deleting professions')
      // Continue to admin page even if there's an error
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_DELETE_PROFESSIONS}`
      )
    }
  },

  seedStandards: async (request, h) => {
    try {
      const authedFetch = authedFetchJsonDecorator(request)
      const apiVersion = config.get(API_VERSION_KEY)

      // Use the versioned controller endpoint for seeding standards
      await authedFetch(
        `${API_BASE_PREFIX}/${apiVersion}/${SERVICESTANDARDS_SEED}`,
        {
          method: 'POST',
          body: JSON.stringify(defaultServiceStandards)
        }
      )

      request.logger.info('Service standards seeded successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.SERVICE_STANDARDS_SEEDED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error(error, 'Failed to seed service standards')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SEED_SERVICE_STANDARDS}`
      )
    }
  },

  seedProfessions: async (request, h) => {
    try {
      const authedFetch = authedFetchJsonDecorator(request)
      const apiVersion = config.get(API_VERSION_KEY)

      // Use the versioned controller endpoint for seeding professions
      await authedFetch(
        `${API_BASE_PREFIX}/${apiVersion}/${PROFESSIONS_SEED}`,
        {
          method: 'POST',
          body: JSON.stringify(defaultProfessions)
        }
      )

      request.logger.info('Professions seeded successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.PROFESSIONS_SEEDED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error(error, 'Failed to seed professions')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=${ADMIN_NOTIFICATIONS.FAILED_TO_SEED_PROFESSIONS}`
      )
    }
  },

  // Profession CRUD operations
  createProfession: async (request, h) => {
    try {
      const { name, description } = request.payload

      if (!name || !description) {
        return h.redirect(
          `${ADMIN_BASE_URL}?notification=Name and description are required&tab=professions`
        )
      }

      // Generate ID from name (kebab-case)
      const id = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      const professionData = {
        Id: id,
        Name: name,
        Description: description,
        IsActive: true,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      }
      await createProfession(professionData, request)

      request.logger.info({ id, name }, 'Profession created successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Profession created successfully&tab=professions`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to create profession')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to create profession&tab=professions`
      )
    }
  },

  updateProfession: async (request, h) => {
    try {
      const { id, name } = request.payload

      if (!id || !name) {
        return h.redirect(
          `${ADMIN_BASE_URL}?notification=Please select a profession and enter a new name&tab=professions`
        )
      }

      await updateProfession(
        id,
        { Name: name, UpdatedAt: new Date().toISOString() },
        request
      )

      request.logger.info({ id, name }, 'Profession updated successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Profession updated successfully&tab=professions`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to update profession')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to update profession&tab=professions`
      )
    }
  },

  archiveProfession: async (request, h) => {
    try {
      const { id } = request.params
      await deleteProfession(id, request)

      request.logger.info({ id }, 'Profession archived successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Profession archived successfully&tab=professions`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to archive profession')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to archive profession&tab=professions`
      )
    }
  },

  restoreProfession: async (request, h) => {
    try {
      const { id } = request.params
      await restoreProfession(id, request)

      request.logger.info({ id }, 'Profession restored successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Profession restored successfully&tab=professions`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to restore profession')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to restore profession&tab=professions`
      )
    }
  },

  // Service Standard CRUD operations
  createServiceStandard: async (request, h) => {
    try {
      const { number, name, description, guidance } = request.payload

      if (!number || !name || !description) {
        return h.redirect(
          `${ADMIN_BASE_URL}?notification=Number, name and description are required&tab=standards`
        )
      }

      // Generate ID from number
      const id = `standard-${number}`

      const standardData = {
        id,
        number: parseInt(number, 10),
        name,
        description,
        guidance: guidance || '' // Provide empty string as default
      }

      await createServiceStandard(standardData, request)

      request.logger.info(
        { id, name, number },
        'Service standard created successfully'
      )
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Service standard created successfully&tab=standards`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to create service standard')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to create service standard&tab=standards`
      )
    }
  },

  updateServiceStandard: async (request, h) => {
    try {
      const { id, name, description, guidance } = request.payload

      if (!id || !name) {
        return h.redirect(
          `${ADMIN_BASE_URL}?notification=Please select a service standard and enter a new name&tab=standards`
        )
      }

      // Fetch the existing service standard to get all current values
      const existingStandard = await getServiceStandardById(id, request)
      if (!existingStandard) {
        return h.redirect(
          `${ADMIN_BASE_URL}?notification=Service standard not found&tab=standards`
        )
      }

      // Update with new values while preserving existing data
      const updatedStandard = {
        ...existingStandard,
        name,
        description: description || existingStandard.description,
        guidance: guidance || existingStandard.guidance,
        updatedAt: new Date().toISOString()
      }

      await updateServiceStandard(id, updatedStandard, request)

      request.logger.info({ id, name }, 'Service standard updated successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Service standard updated successfully&tab=standards`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to update service standard')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to update service standard&tab=standards`
      )
    }
  },

  archiveServiceStandard: async (request, h) => {
    try {
      const { id } = request.params
      await deleteServiceStandard(id, request)

      request.logger.info({ id }, 'Service standard archived successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Service standard archived successfully&tab=standards`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to archive service standard')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to archive service standard&tab=standards`
      )
    }
  },

  restoreServiceStandard: async (request, h) => {
    try {
      const { id } = request.params
      await restoreServiceStandard(id, request)

      request.logger.info({ id }, 'Service standard restored successfully')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Service standard restored successfully&tab=standards`
      )
    } catch (error) {
      request.logger.error({ error }, 'Failed to restore service standard')
      return h.redirect(
        `${ADMIN_BASE_URL}?notification=Failed to restore service standard&tab=standards`
      )
    }
  }
}
