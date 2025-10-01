import Boom from '@hapi/boom'
import {
  getProjects,
  getProjectHistory,
  getAssessmentHistory
} from '~/src/server/services/projects.js'
import { getDeliveryGroups } from '~/src/server/services/delivery-groups.js'
import { getDeliveryPartners } from '~/src/server/services/delivery-partners.js'
import { VIEW_TEMPLATES } from '~/src/server/constants/notifications.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { PROJECT_STATUS } from '~/src/server/constants/status.js'
import { getHomeBreadcrumbs } from '~/src/server/common/helpers/breadcrumbs.js'

/**
 * Calculate status counts for projects
 * @param {Array} projects - Array of projects
 * @returns {object} Status counts object
 */
const calculateStatusCounts = (projects) => {
  const statusCounts = {
    RED: 0,
    AMBER_RED: 0,
    AMBER: 0,
    GREEN_AMBER: 0,
    GREEN: 0,
    TBC: 0,
    PENDING: 0, // New explicit pending status
    EXCLUDED: 0, // New excluded status
    OTHER: 0
  }

  projects.forEach((project) => {
    const status = project.status?.toUpperCase()
    if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
      statusCounts[status]++
    } else {
      statusCounts.OTHER++
    }
  })

  return statusCounts
}

/**
 * Process a single project's history entry
 * @param {object} entry - History entry
 * @returns {object|null} Processed timeline entry or null
 */
const processProjectHistoryEntry = (entry) => {
  if (!entry.changes) {
    return null
  }

  const hasChanges =
    entry.changes.name ||
    entry.changes.status ||
    entry.changes.commentary ||
    entry.changes.phase ||
    entry.changes.tags

  if (!hasChanges) {
    return null
  }

  return {
    id: entry.id || entry.timestamp,
    timestamp: entry.timestamp,
    changedBy: entry.changedBy,
    changes: entry.changes
  }
}

/**
 * Process project level changes from history
 * @param {Array} history - Project history array
 * @param {Date} sinceDate - Only include changes after this date
 * @returns {Array} Processed timeline entries (max 2 most recent events from the specified period, plus previous change for context)
 */
const processProjectLevelChanges = (history, sinceDate) => {
  if (!history || history.length === 0) {
    return []
  }

  // First, process all entries and sort by timestamp (newest first)
  const allProcessedEntries = history
    .map(processProjectHistoryEntry)
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  // Find entries within the date range
  const recentEntries = allProcessedEntries.filter((entry) => {
    const entryDate = new Date(entry.timestamp)
    return entryDate >= sinceDate
  })

  // If we have recent entries, also include the immediate previous entry for context
  // (even if it's outside the 7-day window)
  const result = []

  if (recentEntries.length > 0) {
    // Add the recent entries (max 2)
    result.push(...recentEntries.slice(0, 2))

    // Find the entry that immediately precedes our oldest recent entry
    const oldestRecentEntry = recentEntries[recentEntries.length - 1]
    const oldestRecentIndex = allProcessedEntries.findIndex(
      (entry) => entry.id === oldestRecentEntry.id
    )

    // If there's a previous entry and we don't already have 2 entries, include it for context
    if (
      oldestRecentIndex + 1 < allProcessedEntries.length &&
      result.length < 2
    ) {
      const previousEntry = allProcessedEntries[oldestRecentIndex + 1]
      result.push(previousEntry)
    }
  }

  // Return entries sorted by timestamp (newest first), max 2 total
  return result
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 2)
}

/**
 * Process assessment history entry
 * @param {object} entry - Assessment history entry
 * @param {string} standardId - Standard ID
 * @param {string} professionId - Profession ID
 * @returns {object|null} Processed timeline entry or null
 */
const processAssessmentHistoryEntry = (entry, standardId, professionId) => {
  if (!entry.changes || (!entry.changes.status && !entry.changes.commentary)) {
    return null
  }

  return {
    id: entry.id || entry.timestamp,
    timestamp: entry.timestamp,
    changedBy: entry.changedBy,
    standardId,
    professionId,
    changes: entry.changes
  }
}

/**
 * Process assessment history for a standard/profession combination
 * @param {Array} history - Assessment history array
 * @param {string} standardId - Standard ID
 * @param {string} professionId - Profession ID
 * @param {Date} sinceDate - Only include changes after this date
 * @returns {Array} Processed timeline entries (max 2 most recent events from the specified period, plus previous change for context)
 */
const processAssessmentHistory = (
  history,
  standardId,
  professionId,
  sinceDate
) => {
  if (!history || history.length === 0) {
    return []
  }

  // First, process all entries and sort by timestamp (newest first)
  const allProcessedEntries = history
    .map((entry) =>
      processAssessmentHistoryEntry(entry, standardId, professionId)
    )
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  // Find entries within the date range
  const recentEntries = allProcessedEntries.filter((entry) => {
    const entryDate = new Date(entry.timestamp)
    return entryDate >= sinceDate
  })

  // If we have recent entries, also include the immediate previous entry for context
  // (even if it's outside the 7-day window)
  const result = []

  if (recentEntries.length > 0) {
    // Add the recent entries (max 2)
    result.push(...recentEntries.slice(0, 2))

    // Find the entry that immediately precedes our oldest recent entry
    const oldestRecentEntry = recentEntries[recentEntries.length - 1]
    const oldestRecentIndex = allProcessedEntries.findIndex(
      (entry) => entry.id === oldestRecentEntry.id
    )

    // If there's a previous entry and we don't already have 2 entries, include it for context
    if (
      oldestRecentIndex + 1 < allProcessedEntries.length &&
      result.length < 2
    ) {
      const previousEntry = allProcessedEntries[oldestRecentIndex + 1]
      result.push(previousEntry)
    }
  }

  // Return entries sorted by timestamp (newest first), max 2 total
  return result
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 2)
}

/**
 * Fetch project history for a single project
 * @param {object} project - Project object
 * @param {object} request - Hapi request object
 * @param {Date} sinceDate - Only include changes after this date
 * @returns {Promise<object>} Project history result
 */
const fetchSingleProjectHistory = async (project, request, sinceDate) => {
  try {
    const history = await getProjectHistory(project.id, request)
    const changes = processProjectLevelChanges(history, sinceDate)

    return {
      projectId: project.id,
      projectName: project.name,
      changes
    }
  } catch (error) {
    request.logger.warn(
      `Error fetching project history for project ${project.id}:`,
      error
    )
    return {
      projectId: project.id,
      projectName: project.name,
      changes: []
    }
  }
}

/**
 * Fetch assessment history for a single standard/profession combination
 * @param {object} params - Parameters object
 * @param {string} params.projectId - Project ID
 * @param {string} params.standardId - Standard ID
 * @param {string} params.professionId - Profession ID
 * @param {object} params.request - Hapi request object
 * @param {Date} params.sinceDate - Only include changes after this date
 * @returns {Promise<Array>} Assessment history entries
 */
const fetchAssessmentHistoryForStandard = async ({
  projectId,
  standardId,
  professionId,
  request,
  sinceDate
}) => {
  try {
    const history = await getAssessmentHistory(
      projectId,
      standardId,
      professionId,
      request
    )
    return processAssessmentHistory(
      history,
      standardId,
      professionId,
      sinceDate
    )
  } catch (error) {
    request.logger.warn(
      `Error fetching assessment history for ${projectId}/${standardId}/${professionId}:`,
      error
    )
    return []
  }
}

/**
 * Fetch assessment history for a single project
 * @param {object} project - Project object
 * @param {object} request - Hapi request object
 * @param {Date} sinceDate - Only include changes after this date
 * @returns {Promise<object>} Assessment history result
 */
const fetchSingleProjectAssessmentHistory = async (
  project,
  request,
  sinceDate
) => {
  const assessmentChangesByStandard = {}

  if (!project.standardsSummary || project.standardsSummary.length === 0) {
    return {
      projectId: project.id,
      projectName: project.name,
      assessmentChanges: {}
    }
  }

  const assessmentPromises = []

  project.standardsSummary.forEach((standard) => {
    if (!standard.professions || standard.professions.length === 0) {
      return
    }

    standard.professions.forEach((profession) => {
      const promise = fetchAssessmentHistoryForStandard({
        projectId: project.id,
        standardId: standard.standardId,
        professionId: profession.professionId,
        request,
        sinceDate
      }).then((entries) => {
        if (entries.length > 0) {
          const standardKey = `${standard.standardId}-${profession.professionId}`
          assessmentChangesByStandard[standardKey] = {
            standardId: standard.standardId,
            professionId: profession.professionId,
            changes: entries
          }
        }
        return entries
      })

      assessmentPromises.push(promise)
    })
  })

  await Promise.all(assessmentPromises)

  return {
    projectId: project.id,
    projectName: project.name,
    assessmentChanges: assessmentChangesByStandard
  }
}

/**
 * Group project history results
 * @param {Array} projectHistoryResults - Array of project history results
 * @returns {object} Grouped project changes by project
 */
const groupProjectChanges = (projectHistoryResults) => {
  const projectChangesByProject = {}

  projectHistoryResults.forEach((result) => {
    if (result.changes.length > 0) {
      projectChangesByProject[result.projectId] = {
        projectName: result.projectName,
        changes: result.changes
      }
    }
  })

  return projectChangesByProject
}

/**
 * Group assessment history results
 * @param {Array} assessmentHistoryResults - Array of assessment history results
 * @returns {object} Grouped service standard changes by project
 */
const groupServiceStandardChanges = (assessmentHistoryResults) => {
  const serviceStandardChangesByProject = {}

  assessmentHistoryResults.forEach((result) => {
    const hasChanges = Object.keys(result.assessmentChanges).some(
      (key) => result.assessmentChanges[key].changes.length > 0
    )

    if (hasChanges) {
      serviceStandardChangesByProject[result.projectId] = {
        projectName: result.projectName,
        standardChanges: Object.keys(result.assessmentChanges).reduce(
          (acc, key) => {
            const standard = result.assessmentChanges[key]
            if (standard.changes.length > 0) {
              acc[key] = {
                standardId: standard.standardId,
                professionId: standard.professionId,
                changes: standard.changes
              }
            }
            return acc
          },
          {}
        )
      }
    }
  })

  return serviceStandardChangesByProject
}

/**
 * Fetch all project and assessment history
 * @param {Array} projects - Array of projects (pre-filtered by backend for recent activity)
 * @param {object} request - Hapi request object
 * @param {Date} sinceDate - Only include changes after this date
 * @returns {Promise<object>} Combined history data (max 2 events per project/standard from the specified period)
 */
const fetchAllProjectHistory = async (projects, request, sinceDate) => {
  request.logger.info('Fetching project history for timeline views')

  const historyPromises = projects.map((project) =>
    fetchSingleProjectHistory(project, request, sinceDate)
  )

  const assessmentHistoryPromises = projects.map((project) =>
    fetchSingleProjectAssessmentHistory(project, request, sinceDate)
  )

  const [projectHistoryResults, assessmentHistoryResults] = await Promise.all([
    Promise.all(historyPromises),
    Promise.all(assessmentHistoryPromises)
  ])

  const projectChangesByProject = groupProjectChanges(projectHistoryResults)
  const serviceStandardChangesByProject = groupServiceStandardChanges(
    assessmentHistoryResults
  )

  request.logger.info(
    `Grouped changes: ${Object.keys(projectChangesByProject).length} projects with project changes, ${Object.keys(serviceStandardChangesByProject).length} projects with service standard changes (recent changes with context, max 2 events per project/standard)`
  )

  return {
    projectChangesByProject,
    serviceStandardChangesByProject
  }
}

/**
 * A GET route for the homepage
 */
export const homeController = {
  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: async (request, h) => {
    const { notification, search } = request.query
    const isAuthenticated = request.auth.isAuthenticated
    const searchTerm = search || ''

    try {
      request.logger.info('Home page - fetching data')

      // Fetch projects, delivery groups, and delivery partners in parallel
      const [projects, deliveryGroups, deliveryPartners] = await Promise.all([
        getProjects(request),
        getDeliveryGroups(request).catch((error) => {
          request.logger.warn(
            'Failed to fetch delivery groups for home page:',
            error
          )
          return [] // Return empty array if delivery groups fail
        }),
        getDeliveryPartners(request).catch((error) => {
          request.logger.warn(
            'Failed to fetch delivery partners for home page:',
            error
          )
          return [] // Return empty array if delivery partners fail
        })
      ])

      // Filter out TBC projects for unauthenticated users
      const visibleProjects = isAuthenticated
        ? projects // Authenticated users see all projects
        : projects.filter((project) => project.status !== PROJECT_STATUS.TBC)

      // Get all project names for autocomplete (from visible projects only)
      const projectNames = visibleProjects.map((project) => project.name)

      return h.view(VIEW_TEMPLATES.HOME_INDEX, {
        pageTitle: 'Defra Digital Assurance',
        projectNames,
        deliveryGroups,
        deliveryPartners,
        isAuthenticated,
        notification,
        searchTerm,
        breadcrumbs: getHomeBreadcrumbs()
      })
    } catch (error) {
      request.logger.error('Error fetching data for homepage')

      // Throw a 500 error to trigger our professional error page
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  insightsHandler: async (request, h) => {
    const { notification } = request.query
    const isAuthenticated = request.auth.isAuthenticated

    try {
      request.logger.info('Insights page - fetching projects with analytics')

      // Fetch ALL projects for the analytics tab (comprehensive view)
      const allProjects = await getProjects(request)

      // No need to add mock data - the API now provides ProjectStatus with analytics
      // Authenticated users see all projects (no TBC filtering needed for insights)
      const visibleProjects = allProjects

      // Get all project names for autocomplete
      const projectNames = visibleProjects.map((project) => project.name)

      // No search filtering for insights page - show all projects
      const filteredProjects = visibleProjects

      // Calculate status counts for summary card (using ALL projects)
      const statusCounts = calculateStatusCounts(filteredProjects)

      // For timeline views, fetch only projects that were updated in the last 7 days
      let projectChangesByProject = {}
      let serviceStandardChangesByProject = {}

      try {
        // Calculate date 7 days ago for timeline filtering
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0) // Set to start of day
        const startDate = sevenDaysAgo.toISOString() // Full ISO format: 2024-01-15T00:00:00.000Z

        // Fetch only projects with recent changes for timeline views
        const recentlyChangedProjects = await getProjects(request, {
          startDate
        })

        request.logger.info(
          `Found ${recentlyChangedProjects.length} projects with activity in last 7 days (out of ${allProjects.length} total projects). Fetching their recent changes plus previous changes for context.`
        )

        const historyData = await fetchAllProjectHistory(
          recentlyChangedProjects,
          request,
          sevenDaysAgo
        )
        projectChangesByProject = historyData.projectChangesByProject
        serviceStandardChangesByProject =
          historyData.serviceStandardChangesByProject
      } catch (error) {
        request.logger.error('Error fetching project history:', error)
        // Continue with empty changes if fetch fails
      }

      return h.view('home/insights', {
        pageTitle: 'Project Insights | Defra Digital Assurance',
        heading: 'Project Insights',
        projects: filteredProjects, // ALL projects for analytics
        projectChangesByProject, // Only recent changes
        serviceStandardChangesByProject, // Only recent changes
        statusCounts,
        projectNames,
        isAuthenticated,
        notification
      })
    } catch (error) {
      request.logger.error('Error fetching projects for insights page')

      // Throw a 500 error to trigger our professional error page
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  }
}

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

// Export helper functions for testing
export {
  calculateStatusCounts,
  processProjectHistoryEntry,
  processProjectLevelChanges,
  processAssessmentHistoryEntry,
  processAssessmentHistory,
  fetchSingleProjectHistory,
  fetchAssessmentHistoryForStandard,
  fetchSingleProjectAssessmentHistory,
  groupProjectChanges,
  groupServiceStandardChanges,
  fetchAllProjectHistory
}
