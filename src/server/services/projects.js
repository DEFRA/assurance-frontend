import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { config } from '~/src/config/config.js'
import { API_AUTH_MESSAGES } from '~/src/server/common/constants/log-messages.js'

// API endpoint constants
const API_BASE_PATH = 'projects'
const HISTORY_PATH = '/history'
const ARCHIVE_PATH = '/archive'
const PROFESSIONS_PATH = '/professions'
const STANDARDS_PATH = '/standards'
const ASSESSMENT_PATH = '/assessment'
const SUPPRESS_HISTORY_QUERY = '?suppressHistory=true'

// API configuration constants
const API_VERSION_KEY = 'api.version'
const API_BASE_PREFIX = '/api'

// Helper functions to reduce complexity
const buildQueryParams = (options) => {
  const queryParams = new URLSearchParams()
  if (options.startDate) {
    queryParams.append('start_date', options.startDate)
  }
  if (options.endDate) {
    queryParams.append('end_date', options.endDate)
  }
  if (options.tag) {
    queryParams.append('tag', options.tag)
  }
  return queryParams
}

const buildFullEndpoint = (endpoint, queryParams) => {
  return queryParams.toString()
    ? `${endpoint}?${queryParams.toString()}`
    : endpoint
}

const fetchProjectsData = async (fullEndpoint, request) => {
  let data
  // ALWAYS use authenticated fetcher if request is provided
  if (request) {
    logger.info(
      `${API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER} for projects API`
    )
    const authedFetch = authedFetchJsonDecorator(request)
    data = await authedFetch(fullEndpoint)
  } else {
    // Fall back to unauthenticated fetcher only if no request context
    logger.warn(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT)
    data = await fetcher(fullEndpoint)
  }
  return data
}

const validateProjectsData = (data) => {
  // Handle case where data is null, undefined, or not an array
  if (!data || !Array.isArray(data)) {
    logger.warn('Invalid data returned from API', { data })
    return []
  }
  return data
}

const logDeliveryPartnerWarning = (options) => {
  // TODO: Delivery partner filtering should be handled by backend
  // Note: Backend needs to support deliveryPartnerIds query parameters
  // For now, delivery partner filtering is disabled until backend endpoints are available
  if (options.deliveryPartnerIds && options.deliveryPartnerIds.length > 0) {
    logger.warn(
      { deliveryPartnerIds: options.deliveryPartnerIds },
      'Delivery partner filtering requested but not yet supported by backend - ignoring filter'
    )
  }
}

export async function getProjects(request, options = {}) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}`

    // Build query parameters if provided
    const queryParams = buildQueryParams(options)
    const fullEndpoint = buildFullEndpoint(endpoint, queryParams)

    logger.info({ endpoint: fullEndpoint }, 'Fetching projects from API')

    // Fetch the data using appropriate fetcher
    const rawData = await fetchProjectsData(fullEndpoint, request)

    // Validate and clean the data
    const data = validateProjectsData(rawData)

    // Log warning about unsupported delivery partner filtering
    logDeliveryPartnerWarning(options)

    logger.info({ count: data.length }, 'Projects retrieved successfully')

    if (data.length > 0) {
      logger.info(
        {
          sampleProject: {
            id: data[0].id,
            standards: Array.isArray(data[0].standards)
              ? data[0].standards.map((s) => ({
                  standardId: s.standardId,
                  status: s.status
                }))
              : []
          }
        },
        'Sample project structure'
      )
    }
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch projects'
    )

    throw error // Let the controller handle the error
  }
}

export async function createProject(projectData, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}`
    logger.info({ projectData }, 'Creating new project')

    // Get service standards if available, but don't require them
    let standards = []
    try {
      standards = (await getServiceStandards(request)) || []
      logger.info(
        { standardsCount: standards.length },
        'Service standards retrieved'
      )
    } catch (error) {
      logger.warn(
        { error: error.message },
        'Service standards not available, continuing without them'
      )
      // Continue without standards if fetch fails
    }

    // Format date as UK readable string
    const now = new Date()
    const formattedDate = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    // Prepare standards array if standards are available
    let projectStandards = []
    if (standards.length > 0) {
      // Sort standards by number first
      const sortedStandards = [...standards].sort((a, b) => a.number - b.number)

      projectStandards = sortedStandards.map((standard) => ({
        standardId: standard.number.toString(), // Keep as string for API
        status: 'GREEN',
        commentary: `Initial assessment for Standard ${standard.number}: ${standard.name}`
      }))
    }

    // Create project data with optional standards
    const projectWithStandards = {
      id: '', // API will generate this
      name: projectData.name,
      phase: projectData.phase,
      defCode: projectData.defCode,
      status: projectData.status,
      commentary: projectData.commentary,
      lastUpdated: formattedDate,
      standards: projectStandards
    }

    logger.info({ projectWithStandards }, 'Creating project with standards')

    let result
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      result = await authedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(projectWithStandards)
      })
    } else {
      // Fall back to unauthenticated fetcher
      result = await fetcher(endpoint, {
        method: 'POST',
        body: JSON.stringify(projectWithStandards)
      })
    }

    // Check if result is a Boom error (400 Bad Request)
    if (result.isBoom) {
      logger.error(
        {
          statusCode: result.output.statusCode,
          error: result.output.payload
        },
        'API validation failed'
      )
      throw new Error('Failed to create project: Invalid data')
    }

    if (!result) {
      logger.error('Failed to create project - no response from API')
      throw new Error('Failed to create project')
    }

    logger.info(
      {
        projectId: result.id,
        standardsCount: projectWithStandards.standards.length
      },
      'Project created successfully with standards'
    )
    return result
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectData
      },
      'Failed to create project'
    )
    throw error
  }
}

// Helper function to build base project object
function buildBaseProject(currentProject, projectData) {
  return {
    id: currentProject.id, // Explicitly preserve the ID
    name: projectData.name || currentProject.name,
    phase: projectData.phase || currentProject.phase,
    defCode: projectData.defCode || currentProject.defCode,
    status: projectData.status || currentProject.status,
    commentary: projectData.commentary || currentProject.commentary,
    // Preserve other important fields that shouldn't be overwritten
    tags: projectData.tags || currentProject.tags
  }
}

// Helper function to handle delivery group ID conversion
function handleDeliveryGroupId(projectData, updatedProject) {
  if (projectData.deliveryGroupId !== undefined) {
    updatedProject.DeliveryGroupId =
      projectData.deliveryGroupId === null || projectData.deliveryGroupId === ''
        ? null
        : projectData.deliveryGroupId
  }
}

// Helper function to handle update date
function handleUpdateDate(projectData, updatedProject) {
  if (projectData.updateDate) {
    logger.info(
      {
        updateDate: projectData.updateDate,
        type: typeof projectData.updateDate
      },
      'Passing updateDate to backend'
    )
    updatedProject.updateDate = projectData.updateDate
  }
}

// Helper function to build updated project object
function buildUpdatedProject(currentProject, projectData) {
  const updatedProject = buildBaseProject(currentProject, projectData)
  handleDeliveryGroupId(projectData, updatedProject)
  handleUpdateDate(projectData, updatedProject)
  return updatedProject
}

// Helper function to merge standards with existing ones
function mergeProjectStandards(currentProject, projectData, updatedProject) {
  if (!projectData.standards) {
    return
  }

  updatedProject.standards = currentProject.standards.map((standard) => {
    const updatedStandard = projectData.standards.find(
      (s) => s.standardId === standard.standardId
    )
    return updatedStandard
      ? {
          ...standard,
          status: updatedStandard.status || standard.status,
          commentary: updatedStandard.commentary || standard.commentary
        }
      : standard
  })
}

// Helper function to update professions
function updateProjectProfessions(projectData, updatedProject) {
  if (!projectData.professions) {
    return
  }

  // Initialize professions array if it doesn't exist
  updatedProject.professions = updatedProject.professions || []
  updatedProject.professions = projectData.professions
  logger.info(
    { professions: updatedProject.professions },
    'Updating project professions'
  )
}

// Helper function to make API request
async function makeProjectUpdateRequest(endpoint, updatedProject, request) {
  const requestOptions = {
    method: 'PUT',
    body: JSON.stringify(updatedProject)
  }

  return request
    ? await authedFetchJsonDecorator(request)(endpoint, requestOptions)
    : await fetcher(endpoint, requestOptions)
}

export async function updateProject(
  id,
  projectData,
  request,
  suppressHistory = false
) {
  try {
    // Build endpoint - add suppressHistory parameter if true
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}${
      suppressHistory ? SUPPRESS_HISTORY_QUERY : ''
    }`

    logger.info({ id, projectData, suppressHistory }, 'Updating project')

    // Get current project to preserve existing data
    const currentProject = await getProjectById(id, request)
    if (!currentProject) {
      throw new Error('Project not found')
    }

    // Build the updated project object
    const updatedProject = buildUpdatedProject(currentProject, projectData)

    // Merge standards and professions
    mergeProjectStandards(currentProject, projectData, updatedProject)
    updateProjectProfessions(projectData, updatedProject)

    // Make the API request
    const result = await makeProjectUpdateRequest(
      endpoint,
      updatedProject,
      request
    )

    // Check if result exists and is a Boom error (400 Bad Request)
    if (result?.isBoom) {
      logger.error(
        {
          statusCode: result.output.statusCode,
          error: result.output.payload
        },
        'API validation failed'
      )
      throw new Error('Failed to update project: Invalid data')
    }

    if (!result) {
      logger.error('Failed to update project - no response from API')
      throw new Error('Failed to update project')
    }

    logger.info({ projectId: id }, 'Project updated successfully')
    return result
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id,
        projectData
      },
      'Failed to update project'
    )
    throw error
  }
}

export async function getProjectById(id, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
    logger.info({ endpoint, id }, 'Fetching project from API')

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint)
    }

    if (!data) {
      logger.warn('Project not found', { id })
      return null
    }

    logger.info('Project retrieved successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to fetch project'
    )
    throw error
  }
}

export async function getStandardHistory(projectId, standardId, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${STANDARDS_PATH}/${standardId}${HISTORY_PATH}`
    logger.info({ projectId, standardId }, 'Fetching standard history from API')

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint)
    }

    if (!data) {
      logger.warn('No history found', { projectId, standardId })
      return []
    }

    logger.info(
      { historyCount: data.length },
      'Standard history retrieved successfully'
    )
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        standardId
      },
      'Failed to fetch standard history'
    )
    throw error
  }
}

/**
 * Normalize history data to ensure consistent structure
 * @param {object} entry - The history entry to normalize
 * @param {string} entryType - The type of history entry ('project' or 'profession')
 * @returns {object} - Normalized history entry
 */
function normalizeHistoryEntry(entry, entryType = 'project') {
  // Create a new object to avoid mutating the original
  const normalizedEntry = { ...entry }

  // Ensure timestamp is present
  normalizedEntry.timestamp =
    entry.timestamp || entry.changeDate || new Date().toISOString()

  // Add type property if not present
  normalizedEntry.type = entry.type || entryType

  // Ensure changes object exists
  if (!normalizedEntry.changes) {
    normalizedEntry.changes = {}
  }

  // Handle status changes
  if (entry.status && !normalizedEntry.changes.status) {
    normalizedEntry.changes.status = {
      from: '',
      to: entry.status
    }
  } else if (typeof normalizedEntry.changes.status === 'string') {
    // Convert string status to proper object
    normalizedEntry.changes.status = {
      from: '',
      to: normalizedEntry.changes.status
    }
  }

  // Ensure commentary changes have proper structure
  if (entry.commentary && !normalizedEntry.changes.commentary) {
    normalizedEntry.changes.commentary = {
      from: '',
      to: entry.commentary
    }
  }

  return normalizedEntry
}

export async function getProjectHistory(projectId, request) {
  try {
    // Build endpoint - omit cache parameter for tests
    const apiVersion = config.get(API_VERSION_KEY)
    let endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${HISTORY_PATH}`

    // Only add cache parameter in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      const timestamp = new Date().toISOString().split('T')[0] // Just use date part for daily cache
      const separator = endpoint.includes('?') ? '&' : '?'
      endpoint += `${separator}_cache=${timestamp}`
    }

    let token = null
    try {
      if (request?.auth?.credentials?.token) {
        token = request.auth.credentials.token
        logger.info(
          `[AUTH_CHECK] Token found directly in credentials, length: ${token.length}`
        )
      }
    } catch (tokenError) {
      logger.error(
        { error: tokenError.message },
        '[AUTH_CHECK] Error accessing token'
      )
    }

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      logger.info(`[API_CALL] Making authenticated request to ${endpoint}`)
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      logger.info(`[API_CALL] Making unauthenticated request to ${endpoint}`)
      data = await fetcher(endpoint)
    }

    if (!data) {
      logger.warn('No history found', { projectId })
      return []
    }

    // Filter out archived entries and ensure we have valid data
    const activeData = data.filter((entry) => {
      // Check if entry exists and is not archived
      return entry && !entry.archived
    })

    // Log the filtering results
    logger.info(
      {
        totalEntries: data.length,
        activeEntries: activeData.length,
        archivedEntries: data.length - activeData.length
      },
      'Filtered project history entries'
    )

    // Normalize all history entries
    const normalizedData = activeData.map((entry) =>
      normalizeHistoryEntry(entry, 'project')
    )

    logger.info(
      { historyCount: normalizedData.length },
      'Project history retrieved successfully'
    )
    return normalizedData
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId
      },
      'Failed to fetch project history'
    )
    throw error
  }
}

/**
 * Archives a project history entry
 * @param {string} projectId - The project ID
 * @param {string} historyId - The history entry ID to archive
 * @param {object} request - Hapi request object
 * @returns {Promise<boolean>} - True if archiving was successful
 */
export async function archiveProjectHistoryEntry(
  projectId,
  historyId,
  request
) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${HISTORY_PATH}/${historyId}${ARCHIVE_PATH}`
    logger.info({ projectId, historyId }, 'Archiving project history entry')

    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, {
        method: 'PUT'
      })
    } else {
      // Fall back to unauthenticated fetcher
      await fetcher(endpoint, {
        method: 'PUT'
      })
    }

    logger.info(
      { projectId, historyId },
      'Project history entry archived successfully'
    )
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        historyId
      },
      'Failed to archive project history entry'
    )
    throw error
  }
}

/**
 * Deletes a project by ID
 * @param {string} id - The project ID to delete
 * @param {object} request - Hapi request object
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export async function deleteProject(id, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${id}`
    logger.info({ id }, 'Deleting project')

    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, {
        method: 'DELETE'
      })
    } else {
      // Fall back to unauthenticated fetcher
      await fetcher(endpoint, {
        method: 'DELETE'
      })
    }

    // A successful delete returns 204 No Content
    logger.info({ id }, 'Project deleted successfully')
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to delete project'
    )
    throw error
  }
}

/**
 * Get history for a specific profession on a project.
 * This optimized version will cache results per day to reduce API load.
 * @param {string} projectId - The project ID
 * @param {string} professionId - The profession ID
 * @param {object} request - Hapi request object
 * @returns {Promise<Array>} - Array of profession history items
 */
export async function getProfessionHistory(projectId, professionId, request) {
  try {
    // Build endpoint - omit cache parameter for tests
    const apiVersion = config.get(API_VERSION_KEY)
    let endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${PROFESSIONS_PATH}/${professionId}${HISTORY_PATH}`

    // Only add cache parameter in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      const timestamp = new Date().toISOString().split('T')[0] // Just use date part for daily cache
      const separator = endpoint.includes('?') ? '&' : '?'
      endpoint += `${separator}_cache=${timestamp}`
    }

    logger.info(
      { projectId, professionId },
      'Fetching profession history from API'
    )

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint)
    }

    if (!data) {
      logger.warn('No history found', { projectId, professionId })
      return []
    }

    // Normalize all profession history entries
    const normalizedData = data.map((entry) =>
      normalizeHistoryEntry(entry, 'profession')
    )

    logger.info(
      { historyCount: normalizedData.length },
      'Profession history retrieved successfully'
    )
    return normalizedData
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        professionId
      },
      'Failed to fetch profession history'
    )
    throw error
  }
}

/**
 * Archives a profession history entry
 * @param {string} projectId - The project ID
 * @param {string} professionId - The profession ID
 * @param {string} historyId - The history entry ID to archive
 * @param {object} request - Hapi request object
 * @returns {Promise<boolean>} - True if archiving was successful
 */
export async function archiveProfessionHistoryEntry(
  projectId,
  professionId,
  historyId,
  request
) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${PROFESSIONS_PATH}/${professionId}${HISTORY_PATH}/${historyId}${ARCHIVE_PATH}`
    logger.info(
      { projectId, professionId, historyId },
      'Archiving profession history entry'
    )

    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, {
        method: 'PUT'
      })
    } else {
      // Fall back to unauthenticated fetcher
      await fetcher(endpoint, {
        method: 'PUT'
      })
    }

    logger.info(
      { projectId, professionId, historyId },
      'Profession history entry archived successfully'
    )
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        professionId,
        historyId
      },
      'Failed to archive profession history entry'
    )
    throw error
  }
}

// New: Get a single assessment for a standard/profession
export async function getAssessment(
  projectId,
  standardId,
  professionId,
  request
) {
  const apiVersion = config.get(API_VERSION_KEY)
  const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${STANDARDS_PATH}/${standardId}${PROFESSIONS_PATH}/${professionId}${ASSESSMENT_PATH}`
  logger.info({ endpoint }, 'Fetching assessment from API')

  try {
    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint)
    }

    if (!data) {
      logger.warn({ endpoint }, 'No assessment data returned')
      return null
    }

    logger.info({ endpoint }, 'Assessment retrieved successfully')
    return data
  } catch (error) {
    // Handle 404 as expected behavior (assessment doesn't exist yet)
    if (error.message?.includes('Not Found') || error.status === 404) {
      logger.info({ endpoint }, 'Assessment not found - will create new one')
      return null
    }

    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        endpoint
      },
      'Failed to fetch assessment'
    )
    throw error
  }
}

// New: Update (or create) an assessment
export async function updateAssessment(
  projectId,
  standardId,
  professionId,
  assessmentData,
  request
) {
  const apiVersion = config.get(API_VERSION_KEY)
  const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${STANDARDS_PATH}/${standardId}${PROFESSIONS_PATH}/${professionId}${ASSESSMENT_PATH}`
  logger.info({ endpoint, assessmentData }, 'Updating assessment via API')

  try {
    let result
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      result = await authedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      // Fall back to unauthenticated fetcher
      result = await fetcher(endpoint, {
        method: 'POST',
        body: JSON.stringify(assessmentData),
        headers: { 'Content-Type': 'application/json' }
      })
    }

    logger.info({ endpoint }, 'Assessment updated successfully')
    return result
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        endpoint,
        assessmentData
      },
      'Failed to update assessment'
    )
    throw error
  }
}

// New: Get assessment history for a specific profession/standard combination
export async function getAssessmentHistory(
  projectId,
  standardId,
  professionId,
  request
) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${STANDARDS_PATH}/${standardId}${PROFESSIONS_PATH}/${professionId}${HISTORY_PATH}`
    logger.info(
      { projectId, standardId, professionId },
      'Fetching assessment history from API'
    )

    let data
    if (request) {
      // Use authenticated fetcher if request is provided
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      // Fall back to unauthenticated fetcher
      data = await fetcher(endpoint)
    }

    if (!data) {
      logger.warn('No assessment history found', {
        projectId,
        standardId,
        professionId
      })
      return []
    }

    logger.info(
      { historyCount: data.length },
      'Assessment history retrieved successfully'
    )
    return data
  } catch (error) {
    // Handle 404 as expected behavior (endpoint doesn't exist yet)
    if (error.message?.includes('Not Found') || error.status === 404) {
      logger.info(
        { projectId, standardId, professionId },
        'Assessment history endpoint not available yet - returning empty array'
      )
      return []
    }

    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        standardId,
        professionId
      },
      'Failed to fetch assessment history'
    )
    throw error
  }
}

// New: Archive an assessment history entry
export async function archiveAssessmentHistoryEntry(
  projectId,
  standardId,
  professionId,
  historyId,
  request
) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/${projectId}${STANDARDS_PATH}/${standardId}${PROFESSIONS_PATH}/${professionId}${HISTORY_PATH}/${historyId}${ARCHIVE_PATH}`
    logger.info(
      { projectId, standardId, professionId, historyId },
      'Archiving assessment history entry via API'
    )

    let result
    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      result = await authedFetch(endpoint, {
        method: 'POST'
      })
    } else {
      result = await fetcher(endpoint, {
        method: 'POST'
      })
    }

    logger.info('Assessment history entry archived successfully')
    return result
  } catch (error) {
    // Handle 404 as expected behavior (endpoint doesn't exist yet)
    if (error.message?.includes('Not Found') || error.status === 404) {
      logger.warn(
        { projectId, standardId, professionId, historyId },
        'Archive assessment endpoint not available yet'
      )
      throw new Error(
        'Archive functionality is not yet available on the backend'
      )
    }

    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        standardId,
        professionId,
        historyId
      },
      'Failed to archive assessment history entry'
    )
    throw error
  }
}

// New: Replace an assessment (create new + archive old)
export async function replaceAssessment(
  projectId,
  standardId,
  professionId,
  newAssessmentData,
  request
) {
  try {
    logger.info(
      { projectId, standardId, professionId },
      'Starting assessment replacement process'
    )

    // Phase 1: Sequential calls (until backend replace endpoint is ready)

    // 1. Get current assessment to verify it exists
    const currentAssessment = await getAssessment(
      projectId,
      standardId,
      professionId,
      request
    )
    if (!currentAssessment) {
      throw new Error('No existing assessment found to replace')
    }

    // 2. Create new assessment
    logger.info('Creating new assessment')
    const newAssessment = await updateAssessment(
      projectId,
      standardId,
      professionId,
      newAssessmentData,
      request
    )

    // 3. Get the assessment history to find the entry to archive
    logger.info('Getting assessment history to find entry to archive')
    const history = await getAssessmentHistory(
      projectId,
      standardId,
      professionId,
      request
    )

    if (history.length > 0) {
      // Find the most recent non-archived entry (should be the one we just created)
      // We want to archive the previous one, so get the second most recent
      const nonArchivedEntries = history.filter((entry) => !entry.archived)

      if (nonArchivedEntries.length > 1) {
        // Archive the second most recent (the old one)
        const oldestRecentHistoryId = nonArchivedEntries[1].id
        logger.info(
          { historyId: oldestRecentHistoryId },
          'Archiving previous assessment history entry'
        )

        await archiveAssessmentHistoryEntry(
          projectId,
          standardId,
          professionId,
          oldestRecentHistoryId,
          request
        )
      }
    }

    logger.info('Assessment replacement completed successfully')
    return newAssessment
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        projectId,
        standardId,
        professionId
      },
      'Failed to replace assessment'
    )
    throw error
  }
}

// New: Replace a project status (create new + archive old)
export async function replaceProjectStatus(projectId, newProjectData, request) {
  try {
    logger.info({ projectId }, 'Starting project status replacement process')

    // Phase 1: Sequential calls (until backend replace endpoint is ready)

    // 1. Get current project to verify it exists
    const currentProject = await getProjectById(projectId, request)
    if (!currentProject) {
      throw new Error('No existing project found to replace')
    }

    // 2. Update project status/commentary
    logger.info('Updating project status')
    const updatedProject = await updateProject(
      projectId,
      newProjectData,
      request
    )

    // 3. Get the project history to find the entry to archive
    logger.info('Getting project history to find entry to archive')
    const history = await getProjectHistory(projectId, request)

    if (history.length > 0) {
      // Find the most recent non-archived entry (should be the one we just created)
      // We want to archive the previous one, so get the second most recent
      const nonArchivedEntries = history.filter((entry) => !entry.archived)

      if (nonArchivedEntries.length > 1) {
        // Archive the second most recent (the old one)
        const oldestRecentHistoryId = nonArchivedEntries[1].id
        logger.info(
          { historyId: oldestRecentHistoryId },
          'Archiving previous project status history entry'
        )

        await archiveProjectHistoryEntry(
          projectId,
          oldestRecentHistoryId,
          request
        )
      }
    }

    logger.info('Project status replacement completed successfully')
    return updatedProject
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        projectId
      },
      'Failed to replace project status'
    )
    throw error
  }
}

/**
 * Get delivery partners assigned to a specific project
 * Note: This will need backend endpoint: GET /api/v{version}/projects/{projectId}/delivery-partners
 * @param {string} projectId - The project ID
 * @param {object} request - Hapi request object
 * @returns {Promise<Array>} List of delivery partners for the project
 */
export async function getProjectDeliveryPartners(projectId, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/projects/${projectId}/delivery-partners`
    logger.info(
      { endpoint, projectId },
      'Fetching project delivery partners from API'
    )

    let data
    if (request) {
      logger.info(
        `${API_AUTH_MESSAGES.USING_AUTHENTICATED_FETCHER} for project delivery partners API`
      )
      const authedFetch = authedFetchJsonDecorator(request)
      data = await authedFetch(endpoint)
    } else {
      logger.warn(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT)
      data = await fetcher(endpoint)
    }

    if (!data || !Array.isArray(data)) {
      logger.warn('Invalid data returned from API', { data })
      return []
    }

    logger.info(
      { projectId, count: data.length },
      'Project delivery partners retrieved successfully'
    )
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId
      },
      'Failed to fetch project delivery partners - returning empty array to prevent blocking other data'
    )
    // Always return empty array for any error to prevent breaking Promise.all
    // This ensures service standards and professions still load even if delivery partners fail
    // TODO: Once backend endpoint is fully implemented, consider more selective error handling
    logger.warn(
      { projectId },
      'Returning empty delivery partners array due to API error'
    )
    return []
  }
}

/**
 * Add a delivery partner to a project
 * Note: This will need backend endpoint: POST /api/v{version}/projects/{projectId}/delivery-partners
 * @param {string} projectId - The project ID
 * @param {string} partnerId - The delivery partner ID to add
 * @param {object} request - Hapi request object
 * @returns {Promise<void>}
 */
export async function addProjectDeliveryPartner(projectId, partnerId, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/projects/${projectId}/delivery-partners`
    logger.info(
      { endpoint, projectId, partnerId },
      'Adding delivery partner to project'
    )

    const requestData = { partnerId }

    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestData)
      })
    } else {
      await fetcher(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestData)
      })
    }

    logger.info(
      { projectId, partnerId },
      'Delivery partner added to project successfully'
    )
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        partnerId
      },
      'Failed to add delivery partner to project'
    )
    // For now, throw a more user-friendly error if endpoint doesn't exist
    // TODO: Remove this fallback once backend endpoint is implemented
    if (error.code === 'ENOTFOUND' || error.message.includes('404')) {
      throw new Error(
        'Project delivery partner management is not yet available'
      )
    }
    throw error
  }
}

/**
 * Remove a delivery partner from a project
 * Note: This will need backend endpoint: DELETE /api/v{version}/projects/{projectId}/delivery-partners/{partnerId}
 * @param {string} projectId - The project ID
 * @param {string} partnerId - The delivery partner ID to remove
 * @param {object} request - Hapi request object
 * @returns {Promise<void>}
 */
export async function removeProjectDeliveryPartner(
  projectId,
  partnerId,
  request
) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/projects/${projectId}/delivery-partners/${partnerId}`
    logger.info(
      { endpoint, projectId, partnerId },
      'Removing delivery partner from project'
    )

    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch(endpoint, { method: 'DELETE' })
    } else {
      await fetcher(endpoint, { method: 'DELETE' })
    }

    logger.info(
      { projectId, partnerId },
      'Delivery partner removed from project successfully'
    )
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        partnerId
      },
      'Failed to remove delivery partner from project'
    )
    // For now, throw a more user-friendly error if endpoint doesn't exist
    // TODO: Remove this fallback once backend endpoint is implemented
    if (error.code === 'ENOTFOUND' || error.message.includes('404')) {
      throw new Error(
        'Project delivery partner management is not yet available'
      )
    }
    throw error
  }
}

/**
 * Get all projects associated with a specific delivery group
 * @param {string} deliveryGroupId - The delivery group ID to filter by
 * @param {object} request - The request object for authentication and logging
 * @returns {Promise<Array>} Array of project objects
 */
export async function getProjectsByDeliveryGroup(deliveryGroupId, request) {
  try {
    const apiVersion = config.get(API_VERSION_KEY)
    const endpoint = `${API_BASE_PREFIX}/${apiVersion}/${API_BASE_PATH}/bydeliverygroup/${deliveryGroupId}`

    if (request) {
      request.logger?.info(
        { deliveryGroupId, endpoint },
        'Fetching projects by delivery group'
      )
    }

    let response
    if (request) {
      const authedFetch = authedFetchJsonDecorator(request)
      response = await authedFetch(endpoint)
    } else {
      logger.warn(API_AUTH_MESSAGES.NO_REQUEST_CONTEXT)
      response = await fetcher(endpoint)
    }

    if (request) {
      request.logger?.info(
        { deliveryGroupId, projectCount: response?.length || 0 },
        'Successfully fetched projects by delivery group'
      )
    }

    return response || []
  } catch (error) {
    if (request) {
      request.logger?.error(
        { error, deliveryGroupId },
        'Failed to fetch projects by delivery group'
      )
    } else {
      logger.error(
        { error, deliveryGroupId },
        'Failed to fetch projects by delivery group'
      )
    }
    throw error
  }
}
