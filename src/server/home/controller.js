import Boom from '@hapi/boom'
import {
  getProjects,
  getProjectHistory,
  getAssessmentHistory
} from '~/src/server/services/projects.js'
import {
  PAGE_TITLES,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'
import { trackProjectSearch } from '~/src/server/common/helpers/analytics.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'
import { PROJECT_STATUS } from '~/src/server/constants/status.js'

/**
 * A GET route for the homepage
 */
export const homeController = {
  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: async (request, h) => {
    const { notification } = request.query
    const isAuthenticated = request.auth.isAuthenticated

    try {
      request.logger.info('Home page - fetching projects')
      const projects = await getProjects(request)

      // Filter out TBC projects for unauthenticated users
      const visibleProjects = isAuthenticated
        ? projects // Authenticated users see all projects
        : projects.filter((project) => project.status !== PROJECT_STATUS.TBC)

      // Get all project names for autocomplete (from visible projects only)
      const projectNames = visibleProjects.map((project) => project.name)

      // Filter projects if search term is provided
      const search = request.query.search
      const filteredProjects = search
        ? visibleProjects.filter((project) =>
            project.name.toLowerCase().includes(search.toLowerCase())
          )
        : visibleProjects

      // Track search if provided
      if (search) {
        await trackProjectSearch(request, search, filteredProjects.length)
      }

      return h.view(VIEW_TEMPLATES.HOME_INDEX, {
        pageTitle: PAGE_TITLES.HOME,
        projects: filteredProjects,
        searchTerm: search,
        projectNames,
        isAuthenticated,
        notification
      })
    } catch (error) {
      request.logger.error('Error fetching projects for homepage')

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
      const projects = await getProjects(request)

      // No need to add mock data - the API now provides ProjectStatus with analytics
      // Authenticated users see all projects (no TBC filtering needed for insights)
      const visibleProjects = projects

      // Get all project names for autocomplete
      const projectNames = visibleProjects.map((project) => project.name)

      // No search filtering for insights page - show all projects
      const filteredProjects = visibleProjects

      // Calculate status counts for summary card
      const statusCounts = {
        RED: 0,
        AMBER_RED: 0,
        AMBER: 0,
        GREEN_AMBER: 0,
        GREEN: 0,
        TBC: 0,
        OTHER: 0
      }

      filteredProjects.forEach((project) => {
        const status = project.status?.toUpperCase()
        if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
          statusCounts[status]++
        } else {
          statusCounts.OTHER++
        }
      })

      // Fetch project history for project changes and service standard changes
      const projectChangesByProject = {}
      const serviceStandardChangesByProject = {}
      try {
        request.logger.info('Fetching project history for timeline views')

        // Fetch history for each project and collect recent changes
        const historyPromises = filteredProjects.map(async (project) => {
          try {
            const history = await getProjectHistory(project.id, request)
            let projectLevelChanges = []

            // Process project-level changes from project history
            if (history && history.length > 0) {
              history.forEach((entry) => {
                // Project-level changes - combine all changes that happen at the same timestamp
                if (
                  entry.changes &&
                  (entry.changes.name ||
                    entry.changes.status ||
                    entry.changes.commentary ||
                    entry.changes.phase ||
                    entry.changes.tags)
                ) {
                  // Create single timeline entry with all changes at this timestamp
                  const timelineEntry = {
                    id: entry.id || entry.timestamp,
                    timestamp: entry.timestamp,
                    changedBy: entry.changedBy,
                    changes: entry.changes
                  }

                  projectLevelChanges.push(timelineEntry)
                }
              })

              // Sort by timestamp and limit to most recent 2 events
              projectLevelChanges.sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
              )
              projectLevelChanges = projectLevelChanges.slice(0, 2)
            }

            return {
              projectId: project.id,
              projectName: project.name,
              changes: projectLevelChanges
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
        })

        // Separate promises for assessment history (service standard changes)
        const assessmentHistoryPromises = filteredProjects.map(
          async (project) => {
            const assessmentChangesByStandard = {}

            try {
              // Get assessment history for each standard/profession combination
              if (
                project.standardsSummary &&
                project.standardsSummary.length > 0
              ) {
                const assessmentPromises = []

                project.standardsSummary.forEach((standard) => {
                  if (standard.professions && standard.professions.length > 0) {
                    standard.professions.forEach((profession) => {
                      assessmentPromises.push(
                        getAssessmentHistory(
                          project.id,
                          standard.standardId,
                          profession.professionId,
                          request
                        )
                          .then((history) => {
                            if (history && history.length > 0) {
                              const standardKey = `${standard.standardId}-${profession.professionId}`

                              const timelineEntries = history
                                .map((entry) => {
                                  // Combine all changes that happen at the same timestamp
                                  if (
                                    entry.changes &&
                                    (entry.changes.status ||
                                      entry.changes.commentary)
                                  ) {
                                    return {
                                      id: entry.id || entry.timestamp,
                                      timestamp: entry.timestamp,
                                      changedBy: entry.changedBy,
                                      standardId: standard.standardId,
                                      professionId: profession.professionId,
                                      changes: entry.changes
                                    }
                                  }
                                  return null
                                })
                                .filter(Boolean)

                              // Sort by timestamp and limit to most recent 2 events per standard
                              timelineEntries.sort(
                                (a, b) =>
                                  new Date(b.timestamp) - new Date(a.timestamp)
                              )
                              const limitedEntries = timelineEntries.slice(0, 2)

                              if (!assessmentChangesByStandard[standardKey]) {
                                assessmentChangesByStandard[standardKey] = {
                                  standardId: standard.standardId,
                                  professionId: profession.professionId,
                                  changes: []
                                }
                              }
                              assessmentChangesByStandard[
                                standardKey
                              ].changes.push(...limitedEntries)
                            }
                            return null
                          })
                          .catch((error) => {
                            request.logger.warn(
                              `Error fetching assessment history for ${project.id}/${standard.standardId}/${profession.professionId}:`,
                              error
                            )
                            return null
                          })
                      )
                    })
                  }
                })

                await Promise.all(assessmentPromises)
              }

              return {
                projectId: project.id,
                projectName: project.name,
                assessmentChanges: assessmentChangesByStandard
              }
            } catch (error) {
              request.logger.warn(
                `Error processing assessment history for project ${project.id}:`,
                error
              )
              return {
                projectId: project.id,
                projectName: project.name,
                assessmentChanges: {}
              }
            }
          }
        )

        // Wait for both project history and assessment history
        const [projectHistoryResults, assessmentHistoryResults] =
          await Promise.all([
            Promise.all(historyPromises),
            Promise.all(assessmentHistoryPromises)
          ])

        // Group changes by project for timeline rendering
        projectHistoryResults.forEach((result) => {
          if (result.changes.length > 0) {
            projectChangesByProject[result.projectId] = {
              projectName: result.projectName,
              changes: result.changes // Already limited to 2 in the processing above
            }
          }
        })

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
                      changes: standard.changes // Already limited to 2 per standard in processing above
                    }
                  }
                  return acc
                },
                {}
              )
            }
          }
        })

        request.logger.info(
          `Grouped changes: ${Object.keys(projectChangesByProject).length} projects with project changes, ${Object.keys(serviceStandardChangesByProject).length} projects with service standard changes (limited to 2 most recent events per project/standard)`
        )
      } catch (error) {
        request.logger.error('Error fetching project history:', error)
        // Continue with empty changes if fetch fails
      }

      return h.view('home/insights', {
        pageTitle: 'Project Insights | Defra Digital Assurance',
        heading: 'Project Insights',
        projects: filteredProjects,
        projectChangesByProject,
        serviceStandardChangesByProject,
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
