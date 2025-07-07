/**
 * Project standards controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import { config } from '~/src/config/config.js'
import {
  getProjectById,
  getStandardHistory,
  updateAssessment,
  getAssessment,
  getAssessmentHistory,
  archiveAssessmentHistoryEntry,
  replaceAssessment
} from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProfessions } from '~/src/server/services/professions.js'
import {
  filterStandardsByProfessionAndPhase,
  PROFESSION_STANDARD_MATRIX
} from '~/src/server/services/profession-standard-matrix.js'
import {
  NOTIFICATIONS,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'
import { SERVICE_STANDARD_STATUS_OPTIONS } from '~/src/server/constants/status.js'

export const NOTIFICATIONS_LEGACY = {
  NOT_FOUND: NOTIFICATIONS.PROJECT_NOT_FOUND
}

// Constants for duplicated literals
const CHOOSE_PROFESSION_TEXT = 'Choose a profession'
const CHOOSE_SERVICE_STANDARD_TEXT = 'Choose a service standard'

// Feature flag and error constants
const FEATURE_FLAGS = {
  EDIT_ASSESSMENTS: 'featureFlags.editAssessments'
}

const ERROR_MESSAGES = {
  PAGE_NOT_FOUND: 'Page not found',
  ASSESSMENT_NOT_FOUND: 'Assessment not found',
  COULD_NOT_LOAD_ASSESSMENT: 'Could not load assessment for editing',
  ERROR_FETCHING_ASSESSMENT: 'Error fetching existing assessment for edit',
  ERROR_LOADING_ASSESSMENT_SCREEN: 'Error loading assessment screen',
  ERROR_SAVING_ASSESSMENT: 'Error saving assessment',
  ERROR_UPDATING_ASSESSMENT: 'Error updating assessment',
  ERROR_LOADING_ASSESSMENT_HISTORY: 'Error loading assessment history',
  ERROR_LOADING_ARCHIVE_PAGE: 'Error loading archive assessment page',
  ERROR_ARCHIVING_ASSESSMENT: 'Error archiving assessment entry'
}

const HTTP_STATUS = {
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
}

// Route path patterns
const ROUTE_PATTERNS = {
  PROJECT_STANDARDS_DETAIL: (id, standardId) =>
    `/projects/${id}/standards/${standardId}`,
  PROJECT_REDIRECT: (id) => `/projects/${id}`,
  PROJECT_ASSESSMENT_HISTORY: (id, standardId, professionId) =>
    `/projects/${id}/standards/${standardId}/professions/${professionId}/history`
}

// Helper function to create profession items for dropdowns
function createProfessionItems(professions, selectedProfessionId = '') {
  const items = [{ value: '', text: CHOOSE_PROFESSION_TEXT }]

  if (professions && Array.isArray(professions)) {
    items.push(
      ...professions.map((profession) => ({
        value: profession.id,
        text: profession.name,
        selected: profession.id === selectedProfessionId
      }))
    )
  }

  return items
}

// Helper function to create standard items for dropdowns
function createStandardItems(standards, selectedStandardId = '') {
  const items = [{ value: '', text: CHOOSE_SERVICE_STANDARD_TEXT }]

  if (standards && Array.isArray(standards)) {
    items.push(
      ...standards.map((standard) => ({
        value: standard.id,
        text: `${standard.number}. ${standard.name}`,
        selected: standard.id === selectedStandardId
      }))
    )
  }

  return items
}

// Helper function to create assessment view data
function createAssessmentViewData(
  project,
  professionItems,
  standardItems,
  selectedValues,
  error = null
) {
  return {
    pageTitle: `Assess Standards | ${project.name}`,
    project,
    projectId: project.id,
    projectPhase: project.phase ?? '',
    allStandards: JSON.stringify([]), // Will be replaced with actual standards
    professionItems,
    standardItems,
    selectedValues,
    error,
    statusOptions: SERVICE_STANDARD_STATUS_OPTIONS,
    professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX),
    values: {},
    errors: {}
  }
}

// Helper function to handle validation errors
async function handleValidationError(
  request,
  h,
  project,
  professionId,
  standardId,
  status,
  commentary,
  errorMessage
) {
  const [professions, serviceStandards] = await Promise.all([
    getProfessions(request),
    getServiceStandards(request)
  ])

  const professionItems = createProfessionItems(professions, professionId)

  // Filter standards based on selected profession and project phase
  let filteredStandards = serviceStandards || []
  if (professionId && project.phase) {
    filteredStandards = filterStandardsByProfessionAndPhase(
      serviceStandards,
      project.phase,
      professionId
    )
  }

  const standardItems = createStandardItems(filteredStandards, standardId)
  const selectedValues = { professionId, standardId, status, commentary }

  const viewData = createAssessmentViewData(
    project,
    professionItems,
    standardItems,
    selectedValues,
    errorMessage
  )
  viewData.allStandards = JSON.stringify(serviceStandards || [])

  return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT, viewData)
}

// Helper function to validate profession-standard combination
async function validateProfessionStandardCombination(
  request,
  h,
  project,
  professionId,
  standardId,
  status,
  commentary
) {
  const serviceStandards = await getServiceStandards(request)
  const selectedStandard = serviceStandards?.find((s) => s.id === standardId)

  if (!selectedStandard || !project.phase) {
    return null // No validation needed
  }

  const filteredStandards = filterStandardsByProfessionAndPhase(
    serviceStandards,
    project.phase,
    professionId
  )

  const isValidCombination = filteredStandards.some((s) => s.id === standardId)

  if (!isValidCombination) {
    const errorMessage = `This profession cannot assess the selected standard in the ${project.phase} phase. Please select a different standard.`
    return await handleValidationError(
      request,
      h,
      project,
      professionId,
      standardId,
      status,
      commentary,
      errorMessage
    )
  }

  return null // Validation passed
}

// Helper function to handle assessment save errors
async function handleAssessmentError(
  request,
  h,
  project,
  professionId,
  standardId,
  status,
  commentary,
  error
) {
  let errorMessage = NOTIFICATIONS.FAILED_TO_SAVE_ASSESSMENT

  // Check if this is the known backend update issue
  if (
    error.message?.includes('Internal Server Error') ||
    error.message?.includes('500')
  ) {
    errorMessage =
      'Unable to update existing assessment - this is a known backend issue. New assessments work correctly.'
  }

  return await handleValidationError(
    request,
    h,
    project,
    professionId,
    standardId,
    status,
    commentary,
    errorMessage
  )
}

// Helper function to create 404 error view
function createNotFoundView(h, message = ERROR_MESSAGES.PAGE_NOT_FOUND) {
  return h
    .view('error/index', {
      pageTitle: ERROR_MESSAGES.PAGE_NOT_FOUND,
      statusCode: HTTP_STATUS.NOT_FOUND,
      message
    })
    .code(HTTP_STATUS.NOT_FOUND)
}

// Helper function to create project not found view
function createProjectNotFoundView(h) {
  return h
    .view('projects/not-found', {
      pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
    })
    .code(HTTP_STATUS.NOT_FOUND)
}

// Helper function to check edit mode feature flag
function checkEditModeAccess(isEditMode) {
  if (isEditMode) {
    const canEditAssessments = config.get(FEATURE_FLAGS.EDIT_ASSESSMENTS)
    return canEditAssessments
  }
  return true // Non-edit mode always has access
}

// Helper function to handle edit mode redirect
function createEditModeRedirect(h, id, standardId, message) {
  return h
    .redirect(ROUTE_PATTERNS.PROJECT_STANDARDS_DETAIL(id, standardId))
    .takeover()
    .message(message)
}

// Helper function to fetch existing assessment for edit
async function fetchExistingAssessmentForEdit(
  id,
  standardId,
  professionId,
  request,
  h
) {
  try {
    const existingAssessment = await getAssessment(
      id,
      standardId,
      professionId,
      request
    )

    if (!existingAssessment) {
      return {
        redirect: createEditModeRedirect(
          h,
          id,
          standardId,
          ERROR_MESSAGES.ASSESSMENT_NOT_FOUND
        )
      }
    }

    const selectedValues = {
      professionId,
      standardId,
      status: existingAssessment.status,
      commentary: existingAssessment.commentary ?? ''
    }

    return { existingAssessment, selectedValues }
  } catch (error) {
    request.logger.error({ error }, ERROR_MESSAGES.ERROR_FETCHING_ASSESSMENT)
    return {
      redirect: createEditModeRedirect(
        h,
        id,
        standardId,
        ERROR_MESSAGES.COULD_NOT_LOAD_ASSESSMENT
      )
    }
  }
}

// Helper function to process assessment save operation
async function processAssessmentSave(
  isEditMode,
  id,
  standardId,
  professionId,
  assessmentData,
  request
) {
  if (isEditMode) {
    await replaceAssessment(
      id,
      standardId,
      professionId,
      assessmentData,
      request
    )
    request.logger.info(
      { projectId: id, standardId, professionId },
      'Assessment replaced successfully'
    )
  } else {
    await updateAssessment(
      id,
      standardId,
      professionId,
      assessmentData,
      request
    )
    request.logger.info(
      { projectId: id, standardId, professionId },
      NOTIFICATIONS.ASSESSMENT_SAVED_SUCCESSFULLY
    )
  }
}

// Helper function to create success redirect URL
function createSuccessRedirect(h, isEditMode, id, standardId) {
  const successMessage = isEditMode
    ? 'Assessment updated successfully'
    : NOTIFICATIONS.ASSESSMENT_SAVED_SUCCESSFULLY

  const redirectUrl = isEditMode
    ? `${ROUTE_PATTERNS.PROJECT_STANDARDS_DETAIL(id, standardId)}?notification=${successMessage}`
    : `${ROUTE_PATTERNS.PROJECT_REDIRECT(id)}?notification=${successMessage}`

  return h.redirect(redirectUrl)
}

// Helper function to handle edit mode logic
async function handleEditModeLogic(
  isEditMode,
  id,
  standardId,
  professionId,
  request,
  h
) {
  if (!isEditMode) {
    return { selectedValues: {} }
  }

  return await fetchExistingAssessmentForEdit(
    id,
    standardId,
    professionId,
    request,
    h
  )
}

// Helper function to create assessment screen view
function createAssessmentScreenView(
  h,
  project,
  professions,
  serviceStandards,
  selectedValues,
  existingAssessment,
  isEditMode
) {
  // Transform data for dropdowns - pre-select values if editing
  const professionItems = createProfessionItems(
    professions,
    selectedValues.professionId
  )

  // Filter standards based on selected profession and project phase if editing
  let filteredStandards = serviceStandards || []
  if (isEditMode && selectedValues.professionId && project.phase) {
    filteredStandards = filterStandardsByProfessionAndPhase(
      serviceStandards,
      project.phase,
      selectedValues.professionId
    )
  }

  const standardItems = createStandardItems(
    filteredStandards,
    selectedValues.standardId
  )

  const viewData = createAssessmentViewData(
    project,
    professionItems,
    standardItems,
    selectedValues
  )
  viewData.allStandards = JSON.stringify(serviceStandards || [])
  viewData.isEditMode = isEditMode
  viewData.existingAssessment = existingAssessment

  return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT, viewData)
}

// Helper function to validate assessment input
async function validateAssessmentInput(
  request,
  h,
  project,
  professionId,
  standardId,
  status,
  commentary
) {
  // Validate required fields
  if (!professionId || !standardId || !status) {
    return await handleValidationError(
      request,
      h,
      project,
      professionId,
      standardId,
      status,
      commentary,
      'Please select a profession, service standard, and status'
    )
  }

  // Additional validation: Check if the profession can assess this standard in this phase
  return await validateProfessionStandardCombination(
    request,
    h,
    project,
    professionId,
    standardId,
    status,
    commentary
  )
}

// Helper function to handle post assessment errors
async function handlePostAssessmentError(
  error,
  request,
  h,
  id,
  isEditMode,
  professionId,
  standardId,
  status,
  commentary
) {
  const errorAction = isEditMode ? 'updating' : 'saving'
  request.logger.error({ error }, `Error ${errorAction} assessment`)

  // Try to get project for error handling
  let project
  try {
    project = await getProjectById(id, request)
  } catch (projectError) {
    request.logger.error(
      { projectError },
      'Failed to load project for error handling'
    )
    throw Boom.boomify(error, { statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR })
  }

  if (!project) {
    throw Boom.boomify(error, { statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR })
  }

  return await handleAssessmentError(
    request,
    h,
    project,
    professionId,
    standardId,
    status,
    commentary,
    error
  )
}

// Helper function to fetch required data for standard detail
async function fetchStandardDetailData(id, request) {
  return await Promise.all([
    getProjectById(id, request),
    getProfessions(request),
    getServiceStandards(request)
  ])
}

// Helper function to validate project and find standard
function validateProjectAndStandard(
  project,
  serviceStandards,
  standardId,
  id,
  h
) {
  if (!project) {
    return h
      .view('projects/not-found', {
        pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
      })
      .code(HTTP_STATUS.NOT_FOUND)
  }

  // Find the specific standard
  const standard = serviceStandards?.find((s) => s.id === standardId)
  if (!standard) {
    return h.redirect(
      `${ROUTE_PATTERNS.PROJECT_REDIRECT(id)}?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
    )
  }

  return { project, standard }
}

// Helper function to build assessments with profession details and history
async function buildAssessmentsWithDetails(
  professionAssessments,
  professions,
  id,
  standardId,
  request
) {
  return await Promise.all(
    professionAssessments.map(async (assessment) => {
      const professionInfo = professions?.find(
        (p) => p.id === assessment.professionId
      )

      // Get the most recent history entry for this profession/standard combination
      let mostRecentHistoryId = null
      try {
        const history = await getAssessmentHistory(
          id,
          standardId,
          assessment.professionId,
          request
        )
        if (history && history.length > 0) {
          // Get the most recent non-archived entry
          const recentEntry = history.find((entry) => !entry.archived)
          mostRecentHistoryId = recentEntry?.id
        }
      } catch (error) {
        request.logger.warn(
          { error },
          'Could not fetch assessment history for archive link'
        )
      }

      return {
        ...assessment,
        professionName: professionInfo?.name || assessment.professionId,
        professionDisplayName:
          professionInfo?.name || `Profession ${assessment.professionId}`,
        mostRecentHistoryId
      }
    })
  )
}

// Helper function to create standard detail view data
function createStandardDetailView(
  h,
  project,
  standard,
  standardSummary,
  assessmentsWithDetails,
  request,
  notification
) {
  return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_DETAIL, {
    pageTitle: `Standard ${standard.number} | ${project.name}`,
    project,
    standard,
    standardSummary,
    assessments: assessmentsWithDetails,
    isAuthenticated: request.auth.isAuthenticated,
    canEditAssessments: config.get(FEATURE_FLAGS.EDIT_ASSESSMENTS),
    notification
  })
}

export const standardsController = {
  getStandards: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`)
      }

      // Get service standards for reference
      const standards = await getServiceStandards(request)

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_LIST, {
        pageTitle: `Standards Progress | ${project.name}`,
        project,
        standards
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  },

  getStandardDetail: async (request, h) => {
    const { id, standardId } = request.params
    const { notification } = request.query

    try {
      // Fetch required data
      const [project, professions, serviceStandards] =
        await fetchStandardDetailData(id, request)

      // Validate project and find standard
      const validationResult = validateProjectAndStandard(
        project,
        serviceStandards,
        standardId,
        id,
        h
      )
      if (validationResult.project) {
        // Validation passed, extract validated data
        const { project: validProject, standard } = validationResult

        // Find the standard summary in the project
        const standardSummary = validProject.standardsSummary?.find(
          (s) => s.standardId === standardId
        )

        // Get all profession assessments for this standard
        const professionAssessments = standardSummary?.professions || []

        // Build assessments with profession details and history
        const assessmentsWithDetails = await buildAssessmentsWithDetails(
          professionAssessments,
          professions,
          id,
          standardId,
          request
        )

        // Create and return the view
        return createStandardDetailView(
          h,
          validProject,
          standard,
          standardSummary,
          assessmentsWithDetails,
          request,
          notification
        )
      } else {
        // Validation failed, return the error response
        return validationResult
      }
    } catch (error) {
      request.logger.error({ error }, 'Error loading standard detail')
      throw Boom.boomify(error, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  },

  getStandardHistory: async (request, h) => {
    const { id, standardId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`)
      }

      // Find the standard in standardsSummary
      const standard = project.standardsSummary?.find(
        (s) => s.standardId === standardId || s.StandardId === standardId
      )
      if (!standard) {
        return h.redirect(
          `${ROUTE_PATTERNS.PROJECT_REDIRECT(id)}?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
        )
      }

      const history = await getStandardHistory(id, standardId, request)

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_HISTORY, {
        pageTitle: `Standard ${standardId} History | ${project.name}`,
        heading: `Standard ${standardId} History`,
        project,
        standard,
        history
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  },

  getAssessmentScreen: async (request, h) => {
    const { id } = request.params
    const { edit, standardId, professionId } = request.query || {}

    // Check if this is edit mode
    const isEditMode = edit === 'true' && !!standardId && !!professionId

    try {
      // Check feature flag access for edit mode
      if (!checkEditModeAccess(isEditMode)) {
        return createNotFoundView(h)
      }

      // Fetch required data
      const [project, professions, serviceStandards] = await Promise.all([
        getProjectById(id, request),
        getProfessions(request),
        getServiceStandards(request)
      ])

      if (!project) {
        return createProjectNotFoundView(h)
      }

      // Handle edit mode logic
      const editResult = await handleEditModeLogic(
        isEditMode,
        id,
        standardId,
        professionId,
        request,
        h
      )

      if (editResult.redirect) {
        return editResult.redirect
      }

      // Prepare view data
      return createAssessmentScreenView(
        h,
        project,
        professions,
        serviceStandards,
        editResult.selectedValues ?? {},
        editResult.existingAssessment,
        isEditMode
      )
    } catch (error) {
      request.logger.error(
        { error },
        ERROR_MESSAGES.ERROR_LOADING_ASSESSMENT_SCREEN
      )
      throw Boom.boomify(error, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  },

  postAssessmentScreen: async (request, h) => {
    const { id } = request.params
    const { professionId, standardId, status, commentary } = request.payload
    const { edit } = request.query || {}

    // Check if this is edit mode
    const isEditMode = edit === 'true'

    try {
      // Check feature flag access for edit mode
      if (!checkEditModeAccess(isEditMode)) {
        return createNotFoundView(h)
      }

      // Get and validate project
      const project = await getProjectById(id, request)
      if (!project) {
        return createProjectNotFoundView(h)
      }

      // Validate input data
      const validationResult = await validateAssessmentInput(
        request,
        h,
        project,
        professionId,
        standardId,
        status,
        commentary
      )

      if (validationResult) {
        return validationResult
      }

      // Process the assessment save
      const assessmentData = { status, commentary: commentary ?? '' }
      await processAssessmentSave(
        isEditMode,
        id,
        standardId,
        professionId,
        assessmentData,
        request
      )

      // Create success redirect
      return createSuccessRedirect(h, isEditMode, id, standardId)
    } catch (error) {
      return await handlePostAssessmentError(
        error,
        request,
        h,
        id,
        isEditMode,
        professionId,
        standardId,
        status,
        commentary
      )
    }
  },

  getAssessmentHistory: async (request, h) => {
    const { id, standardId, professionId } = request.params

    try {
      // Fetch project, profession info, standard info, and history
      const [project, professions, serviceStandards, history] =
        await Promise.all([
          getProjectById(id, request),
          getProfessions(request),
          getServiceStandards(request),
          getAssessmentHistory(id, standardId, professionId, request)
        ])

      if (!project) {
        return createProjectNotFoundView(h)
      }

      // Find the specific standard and profession
      const standard = serviceStandards?.find((s) => s.id === standardId)
      const profession = professions?.find((p) => p.id === professionId)

      if (!standard) {
        return h.redirect(
          `${ROUTE_PATTERNS.PROJECT_REDIRECT(id)}?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
        )
      }

      if (!profession) {
        return h.redirect(
          `${ROUTE_PATTERNS.PROJECT_REDIRECT(id)}?notification=${NOTIFICATIONS.PROFESSION_NOT_FOUND}`
        )
      }

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT_HISTORY, {
        pageTitle: `${profession.name} Assessment History | Standard ${standard.number} | ${project.name}`,
        project,
        standard,
        profession,
        history
      })
    } catch (error) {
      request.logger.error(
        { error },
        ERROR_MESSAGES.ERROR_LOADING_ASSESSMENT_HISTORY
      )
      throw Boom.boomify(error, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  },

  getArchiveAssessment: async (request, h) => {
    const { id, standardId, professionId, historyId } = request.params

    try {
      // Fetch project, profession info, standard info, and history
      const [project, professions, serviceStandards, history] =
        await Promise.all([
          getProjectById(id, request),
          getProfessions(request),
          getServiceStandards(request),
          getAssessmentHistory(id, standardId, professionId, request)
        ])

      if (!project) {
        return h
          .view('projects/not-found', {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(HTTP_STATUS.NOT_FOUND)
      }

      // Find the specific standard and profession
      const standard = serviceStandards?.find((s) => s.id === standardId)
      const profession = professions?.find((p) => p.id === professionId)

      if (!standard || !profession) {
        return h.redirect(
          `/projects/${id}?notification=${NOTIFICATIONS.STANDARD_OR_PROFESSION_NOT_FOUND}`
        )
      }

      // Find the specific history entry
      const historyEntry = history?.find((entry) => entry.id === historyId)
      if (!historyEntry) {
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=${NOTIFICATIONS.HISTORY_ENTRY_NOT_FOUND}`
        )
      }

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ARCHIVE_ASSESSMENT, {
        pageTitle: `Archive Assessment | ${profession.name} | Standard ${standard.number} | ${project.name}`,
        project,
        standard,
        profession,
        historyEntry
      })
    } catch (error) {
      request.logger.error({ error }, ERROR_MESSAGES.ERROR_LOADING_ARCHIVE_PAGE)
      throw Boom.boomify(error, {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }
  },

  postArchiveAssessment: async (request, h) => {
    const { id, standardId, professionId, historyId } = request.params
    const { returnTo } = request.query || {}

    try {
      // Archive the assessment history entry
      await archiveAssessmentHistoryEntry(
        id,
        standardId,
        professionId,
        historyId,
        request
      )

      // Redirect based on where the user came from
      if (returnTo === 'detail') {
        return h.redirect(
          `/projects/${id}/standards/${standardId}?notification=${NOTIFICATIONS.ASSESSMENT_ARCHIVED_SUCCESSFULLY}`
        )
      } else {
        // Default redirect to assessment history page
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=${NOTIFICATIONS.ASSESSMENT_ARCHIVED_SUCCESSFULLY}`
        )
      }
    } catch (error) {
      request.logger.error({ error }, ERROR_MESSAGES.ERROR_ARCHIVING_ASSESSMENT)

      // Redirect back with error message based on context
      if (returnTo === 'detail') {
        return h.redirect(
          `/projects/${id}/standards/${standardId}?notification=${NOTIFICATIONS.FAILED_TO_ARCHIVE_ASSESSMENT}`
        )
      } else {
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=${NOTIFICATIONS.FAILED_TO_ARCHIVE_ASSESSMENT}`
        )
      }
    }
  }
}
