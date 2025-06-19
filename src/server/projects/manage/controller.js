/**
 * Project management controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import {
  getProjectById,
  updateProject
} from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProfessions } from '~/src/server/services/professions.js'
import { STATUS, STATUS_LABEL } from '~/src/server/constants/status.js'
import {
  NOTIFICATIONS,
  VIEW_TEMPLATES,
  MANAGE_NOTIFICATIONS,
  LOG_MESSAGES
} from '~/src/server/constants/notifications.js'

export const NOTIFICATIONS_LEGACY = {
  NOT_FOUND: NOTIFICATIONS.PROJECT_NOT_FOUND,
  UPDATE_SUCCESS: NOTIFICATIONS.PROJECT_UPDATED_SUCCESSFULLY,
  GENERAL_ERROR: NOTIFICATIONS.FAILED_TO_UPDATE_PROJECT
}

// Constants for repeated literals
const STATUS_OPTIONS = [
  { value: STATUS.GREEN, text: STATUS_LABEL[STATUS.GREEN] },
  { value: STATUS.GREEN_AMBER, text: STATUS_LABEL[STATUS.GREEN_AMBER] },
  { value: STATUS.AMBER, text: STATUS_LABEL[STATUS.AMBER] },
  { value: STATUS.AMBER_RED, text: STATUS_LABEL[STATUS.AMBER_RED] },
  { value: STATUS.RED, text: STATUS_LABEL[STATUS.RED] },
  { value: STATUS.TBC, text: STATUS_LABEL[STATUS.TBC] }
]

// Extracted constants for duplicated literals
const SELECT_STATUS_TEXT = 'Select status'
const SELECT_PHASE_TEXT = 'Select phase'
const STATUS_PRIORITY_ORDER = [
  'RED',
  'AMBER_RED',
  'AMBER',
  'GREEN_AMBER',
  'GREEN',
  'TBC'
]
// For service standards aggregation (3 RAG system)
const CONCERNING_STANDARD_STATUSES = ['RED', 'AMBER']
const PHASE_OPTIONS_LIST = [
  { value: 'Discovery', text: 'Discovery' },
  { value: 'Alpha', text: 'Alpha' },
  { value: 'Private Beta', text: 'Private Beta' },
  { value: 'Public Beta', text: 'Public Beta' },
  { value: 'Live', text: 'Live' }
]

// Helper function to create profession map
function createProfessionMap(professions) {
  const professionMap = {}
  if (professions && Array.isArray(professions)) {
    professions.forEach((profession) => {
      if (profession.id && profession.name) {
        professionMap[profession.id] = profession.name
      }
    })
  }
  return professionMap
}

// Helper function to create status options with selection
function createStatusOptions(selectedStatus = '') {
  const statusOptions = [
    { text: SELECT_STATUS_TEXT, value: '' },
    ...STATUS_OPTIONS
  ]

  // Mark the current values as selected
  statusOptions.forEach((option) => {
    if (option.value === selectedStatus) {
      option.selected = true
    }
  })

  return statusOptions
}

// Helper function to create phase options with selection
function createPhaseOptions(selectedPhase = '') {
  const phaseOptions = [
    { text: SELECT_PHASE_TEXT, value: '' },
    ...PHASE_OPTIONS_LIST
  ]

  // Mark the selected phase
  phaseOptions.forEach((option) => {
    if (option.value === selectedPhase) {
      option.selected = true
    } else {
      option.selected = false // Explicitly set false for non-selected options
    }
  })

  return phaseOptions
}

// Helper function to process profession comments
function processProfessionComments(professions, professionMap) {
  return (
    professions
      ?.filter((p) => p.commentary?.trim())
      ?.map((p) => ({
        professionId: p.professionId,
        professionName: professionMap[p.professionId] || p.professionId,
        commentary: p.commentary,
        status: p.status
      })) || []
  )
}

// Helper function to create standards at risk data
function createStandardsAtRisk(project, serviceStandards, professionMap) {
  const standardsAtRisk = []

  if (!project.standardsSummary || !serviceStandards) {
    return standardsAtRisk
  }

  // Filter to only concerning statuses and process them
  const filteredStandards = project.standardsSummary
    .filter((standardSummary) =>
      ['RED', 'AMBER'].includes(standardSummary.aggregatedStatus)
    )
    .sort(
      (a, b) =>
        STATUS_PRIORITY_ORDER.indexOf(a.aggregatedStatus) -
        STATUS_PRIORITY_ORDER.indexOf(b.aggregatedStatus)
    )

  filteredStandards.forEach((standardSummary) => {
    // Find the service standard by ID
    let serviceStandard = serviceStandards.find(
      (s) => s.id === standardSummary.standardId
    )

    // Create placeholder if not found
    if (!serviceStandard) {
      serviceStandard = {
        id: standardSummary.standardId,
        number: 'Unknown',
        name: 'Unknown Standard',
        description: ''
      }
    }

    // Build profession comments array
    const professionComments = []
    standardSummary.professions.forEach((profession) => {
      if (profession.commentary?.trim()) {
        const professionName =
          professionMap[profession.professionId] || profession.professionId
        professionComments.push({
          professionName,
          commentary: profession.commentary,
          status: profession.status,
          lastUpdated: profession.lastUpdated
        })
      }
    })

    // Add to standards at risk
    standardsAtRisk.push({
      id: serviceStandard.id,
      number: serviceStandard.number,
      name: serviceStandard.name,
      status: standardSummary.aggregatedStatus,
      lastUpdated: standardSummary.lastUpdated,
      professionComments
    })
  })

  return standardsAtRisk
}

// Helper function to create alternative standards at risk (used in validation error cases)
function createAlternativeStandardsAtRisk(
  project,
  serviceStandards,
  professionMap
) {
  const standardsAtRisk = []

  if (!project.standardsSummary || !serviceStandards) {
    return standardsAtRisk
  }

  const standardsWithStatus = project.standardsSummary
    .map((standardSummary) => {
      const standard = serviceStandards.find(
        (s) => s.id === standardSummary.standardId
      )
      if (!standard) {
        return null
      }

      return {
        standard,
        summary: standardSummary,
        statusPriorityIndex: STATUS_PRIORITY_ORDER.indexOf(
          standardSummary.aggregatedStatus
        )
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.statusPriorityIndex - b.statusPriorityIndex)
    .slice(0, 5)

  standardsWithStatus
    .filter((item) =>
      CONCERNING_STANDARD_STATUSES.includes(item.summary.aggregatedStatus)
    )
    .forEach(({ standard, summary }) => {
      const professionComments = processProfessionComments(
        summary.professions,
        professionMap
      )

      standardsAtRisk.push({
        number: standard.number,
        name: standard.name,
        status: summary.aggregatedStatus,
        professionComments,
        lastUpdated: summary.lastUpdated
      })
    })

  return standardsAtRisk
}

export const manageController = {
  getManageProject: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)

      if (!project) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_SELECT, {
        pageTitle: `Manage ${project.name}`,
        project,
        values: {},
        errors: {}
      })
    } catch (error) {
      request.logger.error(
        { error, id },
        'Error loading manage project selection'
      )
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postManageProject: async (request, h) => {
    const { id } = request.params
    const { updateType } = request.payload

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Validate selection
      if (!updateType) {
        return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_SELECT, {
          pageTitle: `Manage ${project.name}`,
          project,
          values: request.payload,
          errors: {
            updateType: { text: 'Select what you would like to update' }
          },
          errorMessage: 'Select what you would like to update'
        })
      }

      // Redirect to the appropriate journey
      if (updateType === 'status') {
        return h.redirect(`/projects/${id}/manage/status`)
      } else if (updateType === 'details') {
        return h.redirect(`/projects/${id}/manage/details`)
      } else {
        // Invalid selection
        return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_SELECT, {
          pageTitle: `Manage ${project.name}`,
          project,
          values: request.payload,
          errors: {
            updateType: { text: 'Select a valid option' }
          },
          errorMessage: 'Select a valid option'
        })
      }
    } catch (error) {
      request.logger.error(
        { error, id },
        'Error processing manage project selection'
      )
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getManageProjectStatus: async (request, h) => {
    const { id } = request.params

    try {
      // Fetch project, standards, professions and assessments for context
      const [project, serviceStandards, professions] = await Promise.all([
        getProjectById(id, request),
        getServiceStandards(request),
        getProfessions(request)
      ])

      if (!project) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Create profession ID to name mapping
      const professionMap = createProfessionMap(professions)
      const statusOptions = createStatusOptions(project.status)
      const standardsAtRisk = createStandardsAtRisk(
        project,
        serviceStandards,
        professionMap
      )

      return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS, {
        pageTitle: `Update Status and Commentary | ${project.name}`,
        project,
        statusOptions,
        standardsAtRisk,
        professionMap,
        values: {},
        errors: {}
      })
    } catch (error) {
      request.logger.error(
        { error, id },
        'Error loading project status management'
      )
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postManageProjectStatus: async (request, h) => {
    const { id } = request.params
    const { status, commentary } = request.payload

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Validate required fields
      if (!status || !commentary) {
        // Re-fetch data for display
        const [serviceStandards, professions] = await Promise.all([
          getServiceStandards(request),
          getProfessions(request)
        ])

        const professionMap = createProfessionMap(professions)
        const statusOptions = createStatusOptions(status)
        const standardsAtRisk = createAlternativeStandardsAtRisk(
          project,
          serviceStandards,
          professionMap
        )

        return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS, {
          pageTitle: `Update Status and Commentary | ${project.name}`,
          project,
          statusOptions,
          standardsAtRisk,
          professionMap,
          values: request.payload,
          errors: {
            status: !status,
            commentary: !commentary
          },
          errorMessage: NOTIFICATIONS.FAILED_TO_UPDATE_PROJECT
        })
      }

      try {
        // Update the project
        await updateProject(id, { status, commentary }, request)
        request.logger.info(
          'Project status and commentary updated successfully'
        )
        return h.redirect(
          `/projects/${id}?notification=${MANAGE_NOTIFICATIONS.PROJECT_STATUS_UPDATED_SUCCESSFULLY}`
        )
      } catch (error) {
        request.logger.error(
          { error },
          LOG_MESSAGES.FAILED_TO_UPDATE_PROJECT_STATUS
        )

        // Re-fetch data for display on error
        const [serviceStandards, professions] = await Promise.all([
          getServiceStandards(request),
          getProfessions(request)
        ])

        const professionMap = createProfessionMap(professions)
        const statusOptions = createStatusOptions()
        const standardsAtRisk = createAlternativeStandardsAtRisk(
          project,
          serviceStandards,
          professionMap
        )

        return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_STATUS, {
          pageTitle: `Update Status and Commentary | ${project.name}`,
          project,
          statusOptions,
          standardsAtRisk,
          professionMap,
          values: request.payload,
          errors: {},
          errorMessage: NOTIFICATIONS.FAILED_TO_UPDATE_PROJECT
        })
      }
    } catch (error) {
      request.logger.error({ error, id }, 'Error managing project status')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getManageProjectDetails: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)

      if (!project) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      const phaseOptions = createPhaseOptions(project.phase)

      return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_DETAILS, {
        pageTitle: `Update Project Details | ${project.name}`,
        project,
        phaseOptions,
        values: {},
        errors: {}
      })
    } catch (error) {
      request.logger.error(
        { error, id },
        'Error loading project details management'
      )
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postManageProjectDetails: async (request, h) => {
    const { id } = request.params
    const { name, phase, defCode } = request.payload

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Validate required fields
      if (!name || !phase) {
        const phaseOptions = createPhaseOptions(phase)

        return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_DETAILS, {
          pageTitle: `Update Project Details | ${project.name}`,
          project,
          phaseOptions,
          values: request.payload,
          errors: {
            name: !name,
            phase: !phase
          },
          errorMessage: 'Please fill in all required fields'
        })
      }

      try {
        // Update the project
        await updateProject(id, { name, phase, defCode }, request)
        request.logger.info(LOG_MESSAGES.PROJECT_DETAILS_UPDATED)
        return h.redirect(
          `/projects/${id}?notification=${MANAGE_NOTIFICATIONS.PROJECT_DETAILS_UPDATED_SUCCESSFULLY}`
        )
      } catch (error) {
        request.logger.error(
          { error },
          LOG_MESSAGES.FAILED_TO_UPDATE_PROJECT_DETAILS
        )

        const phaseOptions = createPhaseOptions(phase)

        return h.view(VIEW_TEMPLATES.PROJECTS_MANAGE_DETAILS, {
          pageTitle: `Update Project Details | ${project.name}`,
          project,
          phaseOptions,
          values: request.payload,
          errors: {},
          errorMessage: NOTIFICATIONS.FAILED_TO_UPDATE_PROJECT
        })
      }
    } catch (error) {
      request.logger.error({ error, id }, 'Error managing project details')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
