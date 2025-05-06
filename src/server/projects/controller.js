/**
 * Project details controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import {
  getProjects,
  getProjectById,
  updateProject,
  getStandardHistory,
  getProjectHistory,
  getProfessionHistory
} from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProfessions } from '~/src/server/services/professions.js'
import { config } from '~/src/config/config.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'

export const NOTIFICATIONS = {
  NOT_FOUND: 'Project not found',
  UPDATE_SUCCESS: 'Project updated successfully',
  VALIDATION_ERROR: 'Please check your input - some fields are invalid',
  STANDARDS_ERROR: 'Unable to update project: Service standards not available',
  GENERAL_ERROR: 'Failed to update project. Please try again.'
}

// Helper to get profession name from either the professions array or project data
function getProfessionName(profession, professions, project) {
  // Input validation
  if (!profession) {
    return 'Unknown profession'
  }

  let name = 'Unknown profession'

  // First try to find the profession in the professions list by ID
  if (Array.isArray(professions)) {
    const professionFromList = professions.find(
      (p) => p && p.id === profession.professionId
    )
    if (professionFromList?.name) {
      name = professionFromList.name
    }
  }

  // Next check if the profession itself has a name property (some APIs include this)
  if (!name && profession.name) {
    name = profession.name
  }

  // Look for the profession in the project's professions array
  if (!name && project && Array.isArray(project.professions)) {
    const professionInProject = project.professions.find(
      (p) => p && p.professionId === profession.professionId && p.name
    )
    if (professionInProject?.name) {
      name = professionInProject.name
    }
  }

  // Look for this profession history in other professions
  if (
    !name &&
    profession.changedBy &&
    typeof profession.changedBy === 'string'
  ) {
    name = profession.changedBy
  }

  // Format to title case (first letter of each word capitalized)
  return name.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

// Helper function to map standards with details
function mapStandardsWithDetails(projectStandards, serviceStandards) {
  return projectStandards
    .map((assessment) => {
      const standard = serviceStandards.find(
        (s) => s.number.toString() === assessment.standardId
      )
      return {
        ...assessment,
        number: standard?.number || parseInt(assessment.standardId, 10),
        name: standard?.name
      }
    })
    .sort((a, b) => (a.number || 0) - (b.number || 0))
}

export const projectsController = {
  getAll: async (request, h) => {
    try {
      const projects = await getProjects(request)
      const isAuthenticated = request.auth.isAuthenticated

      return h.view('projects/index', {
        pageTitle: 'Projects',
        heading: 'Projects',
        projects,
        isAuthenticated
      })
    } catch (error) {
      request.logger.error('Error fetching projects')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getById: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)

      if (!project) {
        return h
          .view('errors/not-found', {
            pageTitle: 'Project Not Found'
          })
          .code(404)
      }

      return h.view('projects/detail/index', {
        pageTitle: project.name,
        project,
        isTestEnvironment: config.get('env') === 'test'
      })
    } catch (error) {
      request.logger.error('Error fetching project')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  get: async (request, h) => {
    const { id } = request.params
    const isAuthenticated = request.auth.isAuthenticated

    try {
      // Get the project details
      const project = await getProjectById(id, request)

      if (!project) {
        request.logger.error('Project not found', { id })
        return h.redirect('/?notification=Project not found')
      }

      request.logger.info({ id }, 'Project retrieved')

      let standards = []
      const professions = await getProfessions(request)

      // Get service standards for reference
      try {
        standards = await getServiceStandards(request)
      } catch (error) {
        request.logger.error({ error }, 'Error fetching service standards')
        // Continue with empty standards list if fetch fails
      }

      // Map standards to project assessments and ensure proper numeric sorting
      if (project.standards?.length > 0) {
        project.standards = mapStandardsWithDetails(
          project.standards,
          standards
        ).sort((a, b) => a.number - b.number)
      }

      // Enhance profession data with name
      if (project.professions?.length > 0) {
        project.professions = project.professions.map((profession) => {
          const professionData = professions.find(
            (p) => p.id === profession.professionId
          )
          return {
            ...profession,
            name:
              professionData?.name || `Profession ${profession.professionId}`
          }
        })
      }

      // Get project history for the timeline
      let projectHistory = []
      try {
        // Get basic project history
        const historyEntries = await getProjectHistory(id, request)

        // Start building the combined timeline
        let combinedHistory = []

        // Add project delivery updates to the timeline
        if (historyEntries && historyEntries.length > 0) {
          // Filter for status and commentary changes
          const deliveryUpdates = historyEntries.filter((entry) => {
            return (
              (entry.changes?.status?.from !== entry.changes?.status?.to &&
                entry.changes?.status?.to) ||
              entry.changes?.commentary?.to
            )
          })

          combinedHistory = combinedHistory.concat(
            deliveryUpdates.map((entry) => {
              return {
                ...entry,
                changedBy: '', // Remove default changedBy for project updates
                type: 'project',
                historyType: 'delivery'
              }
            })
          )
        }

        // Get profession history for each profession in the project
        if (project.professions && project.professions.length > 0) {
          for (const profession of project.professions) {
            try {
              const professionHistory = await getProfessionHistory(
                id,
                profession.professionId,
                request
              )

              if (professionHistory && professionHistory.length > 0) {
                // Get the profession name using our helper
                const professionName = getProfessionName(
                  profession,
                  professions,
                  project
                )

                // For profession history, we only want to show commentary changes for external users
                // We don't show RAG status changes for professions in the timeline
                const commentaryUpdates = professionHistory.filter((entry) => {
                  return entry.changes?.commentary?.to
                })

                // Add profession commentary updates to the timeline
                combinedHistory = combinedHistory.concat(
                  commentaryUpdates.map((entry) => {
                    return {
                      timestamp: entry.timestamp,
                      changedBy: professionName,
                      message: `${professionName} comment: ${entry.changes.commentary.to}`,
                      professionName,
                      type: 'profession',
                      historyType: 'comment',
                      changes: entry.changes
                    }
                  })
                )
              }
            } catch (err) {
              request.logger.error(
                `Error fetching history for profession ${profession.professionId}:`,
                err
              )
              // Continue with other professions if one fails
            }
          }
        }

        // Sort the timeline by timestamp, most recent first
        projectHistory = combinedHistory.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )
      } catch (error) {
        request.logger.error({ error }, 'Error fetching project history')
        // Continue with empty history if fetch fails
      }

      // Extract distinct standards statuses for pie chart
      const standardsStatuses = project.standards.map((standard) => ({
        status: standard.status
      }))

      return h.view('projects/detail/index', {
        pageTitle: `${project.name} | DDTS Assurance`,
        heading: project.name,
        project,
        projectHistory,
        standards: standardsStatuses,
        isAuthenticated
      })
    } catch (error) {
      request.logger.error({ error }, 'Error getting project')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getEdit: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Get project history for recent delivery updates
      let deliveryHistory = []
      try {
        const projectHistory = await getProjectHistory(id, request)
        if (projectHistory && projectHistory.length > 0) {
          // Filter for status and commentary changes
          const deliveryUpdates = projectHistory.filter((entry) => {
            return (
              (entry.changes?.status?.from !== entry.changes?.status?.to &&
                entry.changes?.status?.to) ||
              entry.changes?.commentary?.to
            )
          })

          // Sort by timestamp (newest first) and take top 3
          deliveryHistory = deliveryUpdates
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 3)
            .map((entry) => ({
              ...entry,
              type: 'project',
              historyType: 'delivery'
            }))
        }
      } catch (error) {
        request.logger.error({ error }, 'Error fetching project history')
        // Continue with empty history if fetch fails
      }

      // Get professions with proper error handling
      let professions = []
      try {
        professions = (await getProfessions(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching professions')
        // Continue with empty professions rather than failing completely
      }

      // Create a map of profession IDs to names for the template - ensure no nulls/undefined
      const professionNames = {}
      if (Array.isArray(professions)) {
        professions.forEach((profession) => {
          if (profession?.id) {
            professionNames[profession.id] =
              profession.name || 'Unknown Profession'
          }
        })
      }

      // Add names to project professions with explicit null checks
      if (Array.isArray(project.professions)) {
        project.professions = project.professions.map((prof) => {
          if (!prof)
            return {
              professionId: 'unknown',
              name: 'Unknown Profession',
              status: '',
              commentary: ''
            }

          return {
            ...prof,
            name:
              prof.professionId && professionNames[prof.professionId]
                ? professionNames[prof.professionId]
                : 'Unknown Profession'
          }
        })
      } else {
        // Ensure project.professions is always an array
        project.professions = []
      }

      // Prepare profession options for the dropdown - do this in JavaScript instead of in the template
      const professionOptions = [{ value: '', text: 'Select a profession' }]

      // Show ALL professions in the dropdown - any profession can make an update
      if (Array.isArray(professions)) {
        professions.forEach((profession, index) => {
          // Use profession name as ID if no ID exists
          const professionId = profession?.id || `profession-${index}`
          const professionName = profession?.name || 'Unknown Profession'

          // Build an ID-to-name map for all professions
          if (professionId) {
            professionNames[professionId] = professionName
          }

          // Add ALL professions to options
          professionOptions.push({
            value: professionId,
            text: professionName
          })
        })
      }

      return h.view('projects/detail/edit', {
        pageTitle: `Edit ${project.name} | DDTS Assurance`,
        heading: `Edit ${project.name}`,
        project,
        professions: professions || [],
        professionNames,
        professionOptions,
        statusOptions: [
          { value: 'RED', text: 'Red' },
          { value: 'AMBER', text: 'Amber' },
          { value: 'GREEN', text: 'Green' }
        ],
        deliveryHistory
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postEdit: async (request, h) => {
    const { id } = request.params
    const {
      status,
      commentary,
      tags,
      // For profession updates
      profession,
      'profession-status': professionStatus,
      'profession-commentary': professionCommentary
    } = request.payload
    const updateType = request.query.type || 'delivery'

    try {
      // Get current project to modify
      const currentProject = await getProjectById(id, request)
      if (!currentProject) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Initialize the project data that will be updated
      let projectData = {}

      if (updateType === 'delivery') {
        // Process tags - split by comma and trim whitespace
        const processedTags = tags
          ? tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : []

        // Create updated project data for delivery status
        projectData = {
          status,
          commentary,
          tags: processedTags
        }

        request.logger.info(
          {
            status,
            commentary: commentary?.substring(0, 50) + '...',
            tags: processedTags
          },
          'Updating project delivery status'
        )
      } else if (updateType === 'profession') {
        // Handle profession update
        if (profession && professionStatus) {
          request.logger.info(
            { profession, professionStatus, professionCommentary },
            'Updating profession update'
          )

          // Get the profession name - handle both catalog professions and dynamic professions
          let professionName = ''
          try {
            const allProfessions = (await getProfessions(request)) || []
            // Look for the profession by ID
            const professionData = allProfessions.find(
              (p) => p.id === profession || p.name === profession
            )

            if (professionData) {
              professionName = professionData.name || ''
            } else if (profession.startsWith('profession-')) {
              // This is a dynamically assigned ID - Extract index and find by index
              const index = parseInt(profession.replace('profession-', ''), 10)
              if (!isNaN(index) && index < allProfessions.length) {
                professionName = allProfessions[index].name || ''
              }
            }
          } catch (error) {
            request.logger.error('Error fetching profession details', { error })
          }

          // Get existing professions
          const existingProfessions = currentProject.professions || []

          // Filter out the profession we're updating if it exists (normalize ID format if needed)
          const otherProfessions = existingProfessions.filter(
            (p) => p.professionId !== profession
          )

          // Add the updated profession
          const updatedProfessions = [
            ...otherProfessions,
            {
              professionId: profession,
              name: professionName,
              status: professionStatus,
              commentary: professionCommentary || ''
            }
          ]

          request.logger.info(
            {
              updatedProfessions: updatedProfessions.map((p) => ({
                id: p.professionId,
                status: p.status
              }))
            },
            'Updated project professions'
          )

          // Add professions to project data
          projectData.professions = updatedProfessions
        } else {
          // Missing required fields
          return h.redirect(
            `/projects/${id}/edit?tab=professions&notification=${NOTIFICATIONS.VALIDATION_ERROR}`
          )
        }
      }

      const result = await updateProject(id, projectData, request)

      request.logger.info(
        {
          result: result ? 'success' : 'failure',
          updateType,
          professions: result?.professions?.map((p) => ({
            id: p.professionId,
            status: p.status
          }))
        },
        'Project update result'
      )

      // Redirect to the appropriate tab after save
      const redirectTab = updateType === 'profession' ? '?tab=professions' : ''
      return h.redirect(
        `/projects/${id}${redirectTab}${redirectTab ? '&' : '?'}notification=${NOTIFICATIONS.UPDATE_SUCCESS}`
      )
    } catch (error) {
      request.logger.error(
        {
          error,
          payload: request.payload
        },
        'Failed to update project'
      )

      try {
        // Get project data to re-render form with errors
        await getProjectById(id, request)
        const professions = await getProfessions(request)

        // Create a map of profession IDs to names for the template
        const professionNames = {}
        professions.forEach((profession) => {
          professionNames[profession.id] = profession.name
        })

        // Redirect to the appropriate tab with error
        const redirectTab =
          updateType === 'profession' ? '?tab=professions' : ''
        return h.redirect(
          `/projects/${id}/edit${redirectTab}${redirectTab ? '&' : '?'}notification=${NOTIFICATIONS.GENERAL_ERROR}`
        )
      } catch (fetchError) {
        request.logger.error(fetchError)
        throw Boom.boomify(fetchError, { statusCode: 500 })
      }
    }
  },

  getStandardHistory: async (request, h) => {
    const { id, standardId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      const standard = project.standards.find(
        (s) => s.standardId === standardId
      )
      if (!standard) {
        return h.redirect(`/projects/${id}?notification=Standard not found`)
      }

      const history = await getStandardHistory(id, standardId, request)

      return h.view('projects/detail/standard-history', {
        pageTitle: `Standard ${standardId} History | ${project.name}`,
        heading: `Standard ${standardId} History`,
        project,
        standard,
        history
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getProjectHistory: async (request, h) => {
    try {
      const { id } = request.params

      // Fetch project and history
      const project = await getProjectById(id, request)

      if (!project) {
        return h.response({ error: 'Project not found' }).code(404)
      }

      // Fetch the project history
      const history = await getProjectHistory(id, request)

      // Get the professions for name lookup
      const professions = await getProfessions(request)

      // Create a timeline with all entries
      let timeline = []

      // Add delivery status updates to the timeline (only include status and commentary changes)
      if (history && history.length > 0) {
        // Filter for status and commentary changes
        const deliveryUpdates = history.filter((entry) => {
          return (
            (entry.changes?.status?.from !== entry.changes?.status?.to &&
              entry.changes?.status?.to) ||
            entry.changes?.commentary?.to
          )
        })

        timeline = timeline.concat(
          deliveryUpdates.map((entry) => {
            return {
              ...entry,
              changedBy: '', // Remove default changedBy for project updates
              type: 'project',
              historyType: 'delivery'
            }
          })
        )
      }

      // Get profession history for each profession in the project
      if (project.professions && project.professions.length > 0) {
        for (const profession of project.professions) {
          try {
            const professionHistory = await getProfessionHistory(
              id,
              profession.professionId,
              request
            )

            if (professionHistory && professionHistory.length > 0) {
              // Get the profession name using our helper
              const professionName = getProfessionName(
                profession,
                professions,
                project
              )

              // For profession history, we only want to show commentary changes for external users
              // We don't show RAG status changes for professions in the timeline
              const commentaryUpdates = professionHistory.filter((entry) => {
                return entry.changes?.commentary?.to
              })

              // Add profession commentary updates to the timeline
              timeline = timeline.concat(
                commentaryUpdates.map((entry) => {
                  return {
                    timestamp: entry.timestamp,
                    changedBy: professionName,
                    message: `${professionName} comment: ${entry.changes.commentary.to}`,
                    professionName,
                    type: 'profession',
                    historyType: 'comment',
                    changes: entry.changes
                  }
                })
              )
            }
          } catch (err) {
            request.logger.error(
              `Error fetching history for profession ${profession.professionId}:`,
              err
            )
            // Continue with other professions if one fails
          }
        }
      }

      // Sort the timeline by timestamp, most recent first
      timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      return h.response({ history: timeline }).code(200)
    } catch (error) {
      request.logger.error('Error fetching project history:', error)
      return h.response({ error: 'Failed to fetch project history' }).code(500)
    }
  },

  getStandards: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Get service standards to merge with project standards
      const standards = await getServiceStandards(request)

      // Map standards to project assessments and ensure proper numeric sorting
      const standardsWithDetails = mapStandardsWithDetails(
        project.standards,
        standards
      )

      return h.view('projects/detail/standards', {
        pageTitle: `Standards Progress | ${project.name}`,
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

  edit: async (request, h) => {
    const { id } = request.params
    const isNew = !id

    try {
      let project = null
      let standards = []

      if (!isNew) {
        project = await getProjectById(id, request)
        if (!project) {
          return h
            .view('errors/not-found', {
              pageTitle: 'Project Not Found'
            })
            .code(404)
        }
      }

      try {
        standards = await getServiceStandards(request)
      } catch (error) {
        request.logger.error({ error }, 'Error fetching service standards')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      return h.view('projects/edit/index', {
        pageTitle: isNew ? 'Create Project' : `Edit ${project.name}`,
        project,
        standards,
        formAction: isNew ? '/projects/new' : `/projects/${id}/edit`,
        cancelUrl: isNew ? '/projects' : `/projects/${id}`,
        errors: request.pre.errors,
        isTestEnvironment: config.get('env') === 'test'
      })
    } catch (error) {
      request.logger.error({ error, id }, 'Error preparing project edit form')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  update: async (request, h) => {
    const { id } = request.params
    const payload = request.payload

    try {
      // Get the existing project
      const existingProject = await getProjectById(id, request)
      if (!existingProject) {
        return h.redirect(`/?notification=Project not found`)
      }

      // Update the project with the new data
      const result = await updateProject(id, payload, request)

      if (!result) {
        return h.redirect(
          `/projects/${id}?notification=Failed to update project`
        )
      }

      return h.redirect(
        `/projects/${id}?notification=Project updated successfully`
      )
    } catch (error) {
      request.logger.error({ error, id }, 'Error updating project')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getHistory: async (request, h) => {
    try {
      const { id } = request.params
      // Force authentication for this route
      if (!request.auth.isAuthenticated) {
        return h.redirect(
          '/auth/login?redirectTo=' +
            encodeURIComponent(`/projects/${id}/history`)
        )
      }

      // Get project details first
      const project = await getProjectById(id, request)

      if (!project) {
        request.logger.error(`Project not found with ID: ${id}`)
        return h.view('errors/not-found', {
          pageTitle: 'Project Not Found'
        })
      }

      // Get project history
      const projectHistory = await getProjectHistory(id, request)

      // Get the professions for name lookup
      const professions = await getProfessions(request)

      // Create a timeline with all entries
      let combinedHistory = []

      // Add delivery status updates to the timeline (only include status and commentary changes)
      if (projectHistory && projectHistory.length > 0) {
        // Filter for status and commentary changes
        const deliveryUpdates = projectHistory.filter((entry) => {
          return (
            (entry.changes?.status?.from !== entry.changes?.status?.to &&
              entry.changes?.status?.to) ||
            entry.changes?.commentary?.to
          )
        })

        combinedHistory = combinedHistory.concat(
          deliveryUpdates.map((entry) => {
            return {
              ...entry,
              changedBy: '', // Remove default changedBy for project updates
              type: 'project',
              historyType: 'delivery'
            }
          })
        )
      }

      // Get profession history for each profession in the project
      if (project.professions && project.professions.length > 0) {
        for (const profession of project.professions) {
          try {
            const professionHistory = await getProfessionHistory(
              id,
              profession.professionId,
              request
            )

            if (professionHistory && professionHistory.length > 0) {
              // Get the profession name using our helper
              const professionName = getProfessionName(
                profession,
                professions,
                project
              )

              // For profession history, we only want to show commentary changes for external users
              // We don't show RAG status changes for professions in the timeline
              const commentaryUpdates = professionHistory.filter((entry) => {
                return entry.changes?.commentary?.to
              })

              // Add profession commentary updates to the timeline
              commentaryUpdates.forEach((entry) => {
                combinedHistory.push({
                  ...entry,
                  professionName,
                  type: 'profession',
                  historyType: 'comment',
                  // Ensure the changedBy is the profession name for consistency
                  changedBy: professionName
                })
              })
            }
          } catch (err) {
            request.logger.error(
              `Error fetching history for profession ${profession.professionId}:`,
              err
            )
            // Continue with other professions if one fails
          }
        }
      }

      // Sort the timeline by timestamp, most recent first
      combinedHistory.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )

      return h.view('projects/detail/project-history', {
        pageTitle: `Project History: ${project.name}`,
        project,
        history: combinedHistory
      })
    } catch (error) {
      request.logger.error(
        { error: error.message },
        'Error getting project history'
      )
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getProfessionHistory: async (request, h) => {
    const { id, professionId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      const profession = project.professions?.find(
        (p) => p.professionId === professionId
      )
      if (!profession) {
        return h.redirect(
          `/projects/${id}?notification=Profession not found in this project`
        )
      }

      // Find the profession name from the service
      const professions = await getProfessions(request)
      const professionInfo = professions.find((p) => p.id === professionId)
      const professionName =
        professionInfo?.name || `Profession ${professionId}`

      // Get the profession history
      const history = await getProfessionHistory(id, professionId, request)

      // Sort by timestamp, most recent first
      const sortedHistory = history.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )

      return h.view('projects/detail/profession-history', {
        pageTitle: `${professionName} History | ${project.name}`,
        heading: `${professionName} Assessment History`,
        project,
        profession: {
          ...profession,
          name: professionName
        },
        history: sortedHistory
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getEditProfession: async (request, h) => {
    const { id, professionId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      const profession = project.professions?.find(
        (p) => p.professionId === professionId
      )
      if (!profession) {
        return h.redirect(
          `/projects/${id}?notification=Profession not found in this project`
        )
      }

      // Find the profession name from the service
      const professions = await getProfessions(request)
      const professionInfo = professions.find((p) => p.id === professionId)
      const professionName =
        professionInfo?.name || `Profession ${professionId}`

      return h.view('projects/detail/edit-profession', {
        pageTitle: `Edit ${professionName} Assessment | ${project.name}`,
        heading: `Edit ${professionName} Assessment`,
        project,
        profession: {
          ...profession,
          name: professionName
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

  postEditProfession: async (request, h) => {
    const { id, professionId } = request.params
    const { status, commentary } = request.payload

    try {
      // Get current project to modify
      const currentProject = await getProjectById(id, request)
      if (!currentProject) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Initialize the project data
      const projectData = {
        id
      }

      // Get existing professions
      const existingProfessions = currentProject.professions || []

      // Filter out the profession we're updating
      const otherProfessions = existingProfessions.filter(
        (p) => p.professionId !== professionId
      )

      // Add the updated profession
      const updatedProfessions = [
        ...otherProfessions,
        {
          professionId,
          status,
          commentary: commentary || ''
        }
      ]

      projectData.professions = updatedProfessions

      const result = await updateProject(id, projectData, request)

      request.logger.info(
        {
          result: result ? 'success' : 'failure',
          professionId,
          status
        },
        'Profession update result'
      )

      return h.redirect(
        `/projects/${id}?tab=professions&notification=${NOTIFICATIONS.UPDATE_SUCCESS}`
      )
    } catch (error) {
      request.logger.error(
        {
          error,
          payload: request.payload
        },
        'Failed to update profession'
      )

      return h.redirect(
        `/projects/${id}/edit/profession/${professionId}?notification=${NOTIFICATIONS.GENERAL_ERROR}`
      )
    }
  },

  getDeleteProfession: async (request, h) => {
    const { id, professionId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      const profession = project.professions?.find(
        (p) => p.professionId === professionId
      )
      if (!profession) {
        return h.redirect(
          `/projects/${id}?notification=Profession not found in this project`
        )
      }

      // Find the profession name from the service
      const professions = await getProfessions(request)
      const professionInfo = professions.find((p) => p.id === professionId)
      const professionName =
        professionInfo?.name || `Profession ${professionId}`

      return h.view('projects/detail/delete-profession', {
        pageTitle: `Remove ${professionName} Assessment | ${project.name}`,
        heading: `Remove ${professionName} Assessment`,
        project,
        profession: {
          ...profession,
          name: professionName
        }
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postDeleteProfession: async (request, h) => {
    const { id, professionId } = request.params

    try {
      // Get current project to modify
      const currentProject = await getProjectById(id, request)
      if (!currentProject) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Find the profession name from the service (for logging)
      const professions = await getProfessions(request)
      const professionInfo = professions.find((p) => p.id === professionId)
      const professionName =
        professionInfo?.name || `Profession ${professionId}`

      // Initialize the project data
      const projectData = {
        id
      }

      // Get existing professions
      const existingProfessions = currentProject.professions || []

      // Filter out the profession we're removing
      const updatedProfessions = existingProfessions.filter(
        (p) => p.professionId !== professionId
      )

      projectData.professions = updatedProfessions

      const result = await updateProject(id, projectData, request)

      request.logger.info(
        {
          result: result ? 'success' : 'failure',
          professionId,
          professionName
        },
        'Profession removed'
      )

      return h.redirect(
        `/projects/${id}?tab=professions&notification=Profession update removed`
      )
    } catch (error) {
      request.logger.error(
        {
          error,
          id,
          professionId
        },
        'Failed to remove profession'
      )

      return h.redirect(
        `/projects/${id}/delete/profession/${professionId}?notification=${NOTIFICATIONS.GENERAL_ERROR}`
      )
    }
  },

  getEditDelivery: async (request, h) => {
    const { id, historyId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Get project history
      const projectHistory = await getProjectHistory(id, request)
      if (!projectHistory || projectHistory.length === 0) {
        return h.redirect(
          `/projects/${id}?notification=No history found for this project`
        )
      }

      // Find the specific history entry
      const historyEntry = projectHistory.find(
        (entry) => entry.id === historyId
      )
      if (!historyEntry) {
        return h.redirect(
          `/projects/${id}?notification=History entry not found`
        )
      }

      // Create the update object
      const update = {
        id: historyEntry.id,
        status: historyEntry.changes?.status?.to || project.status,
        commentary: historyEntry.changes?.commentary?.to || '',
        timestamp: historyEntry.timestamp
      }

      return h.view('projects/detail/edit-delivery', {
        pageTitle: `Edit Delivery Update | ${project.name}`,
        heading: 'Edit Delivery Update',
        project,
        update,
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

  postEditDelivery: async (request, h) => {
    const { id, historyId } = request.params
    const { status, commentary } = request.payload

    try {
      // Get current project to modify
      const currentProject = await getProjectById(id, request)
      if (!currentProject) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Get project history
      const projectHistory = await getProjectHistory(id, request)
      if (!projectHistory || projectHistory.length === 0) {
        return h.redirect(
          `/projects/${id}?notification=No history found for this project`
        )
      }

      // Find the specific history entry
      const historyEntry = projectHistory.find(
        (entry) => entry.id === historyId
      )
      if (!historyEntry) {
        return h.redirect(
          `/projects/${id}?notification=History entry not found`
        )
      }

      // Prepare data for API call to update history
      const updatedEntry = {
        ...historyEntry,
        changes: {
          ...historyEntry.changes,
          status: {
            from: historyEntry.changes?.status?.from || '',
            to: status
          },
          commentary: {
            from: historyEntry.changes?.commentary?.from || '',
            to: commentary || ''
          }
        }
      }

      // Call API to update history entry
      try {
        // Use project update API to handle history updates
        // Note: This may need to be adjusted based on your actual API structure
        const authedFetch = authedFetchJsonDecorator(request)
        await authedFetch(`/projects/${id}/history/${historyId}`, {
          method: 'PUT',
          body: JSON.stringify(updatedEntry)
        })

        request.logger.info(
          {
            projectId: id,
            historyId,
            status
          },
          'Delivery update history entry updated'
        )

        return h.redirect(
          `/projects/${id}/edit?tab=delivery&notification=${NOTIFICATIONS.UPDATE_SUCCESS}`
        )
      } catch (error) {
        // If API update fails, fall back to updating the project current status/commentary
        request.logger.warn(
          {
            error,
            projectId: id,
            historyId
          },
          'Failed to update history entry directly. Updating project instead.'
        )

        // Update project with new status/commentary
        const result = await updateProject(
          id,
          {
            status,
            commentary: commentary || currentProject.commentary
          },
          request
        )

        if (!result) {
          throw new Error('Failed to update project')
        }

        return h.redirect(
          `/projects/${id}/edit?tab=delivery&notification=History entry could not be updated directly. Project status has been updated instead.`
        )
      }
    } catch (error) {
      request.logger.error(
        {
          error,
          payload: request.payload
        },
        'Failed to update delivery status'
      )

      return h.redirect(
        `/projects/${id}/edit?tab=delivery&notification=${NOTIFICATIONS.GENERAL_ERROR}`
      )
    }
  },

  getDeleteDelivery: async (request, h) => {
    const { id, historyId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Get project history
      const projectHistory = await getProjectHistory(id, request)
      if (!projectHistory || projectHistory.length === 0) {
        return h.redirect(
          `/projects/${id}?notification=No history found for this project`
        )
      }

      // Find the specific history entry
      const historyEntry = projectHistory.find(
        (entry) => entry.id === historyId
      )
      if (!historyEntry) {
        return h.redirect(
          `/projects/${id}?notification=History entry not found`
        )
      }

      // Create the update object
      const update = {
        id: historyEntry.id,
        status: historyEntry.changes?.status?.to || '',
        commentary: historyEntry.changes?.commentary?.to || '',
        timestamp: historyEntry.timestamp
      }

      return h.view('projects/detail/delete-delivery', {
        pageTitle: `Delete Delivery Update | ${project.name}`,
        heading: 'Delete Delivery Update',
        project,
        update
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postDeleteDelivery: async (request, h) => {
    const { id, historyId } = request.params

    try {
      // Get current project to verify
      const currentProject = await getProjectById(id, request)
      if (!currentProject) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Call API to delete history entry
      try {
        // Use project API to handle history deletion
        const authedFetch = authedFetchJsonDecorator(request)
        await authedFetch(`/projects/${id}/history/${historyId}`, {
          method: 'DELETE'
        })

        request.logger.info(
          {
            projectId: id,
            historyId
          },
          'Delivery update history entry deleted'
        )

        return h.redirect(
          `/projects/${id}/edit?tab=delivery&notification=Delivery update successfully removed`
        )
      } catch (error) {
        request.logger.error(
          {
            error,
            projectId: id,
            historyId
          },
          'Failed to delete history entry'
        )

        return h.redirect(
          `/projects/${id}/edit?tab=delivery&notification=Failed to remove delivery update`
        )
      }
    } catch (error) {
      request.logger.error(
        {
          error,
          id,
          historyId
        },
        'Failed to delete delivery update'
      )

      return h.redirect(
        `/projects/${id}/delete/delivery/${historyId}?notification=${NOTIFICATIONS.GENERAL_ERROR}`
      )
    }
  }
}
