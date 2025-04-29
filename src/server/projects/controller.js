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
  getProjectHistory
} from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { config } from '~/src/config/config.js'

export const NOTIFICATIONS = {
  NOT_FOUND: 'Project not found',
  UPDATE_SUCCESS: 'Project updated successfully',
  VALIDATION_ERROR: 'Please check your input - some fields are invalid',
  STANDARDS_ERROR: 'Unable to update project: Service standards not available',
  GENERAL_ERROR: 'Failed to update project. Please try again.'
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
      return h.view('projects/index', {
        pageTitle: 'Projects',
        heading: 'Projects',
        projects
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

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Get service standards to merge with project standards
      const standards = await getServiceStandards(request)
      const projectHistory = await getProjectHistory(id, request)

      // Get standards with their current status
      const standardsStatus = project.standards.map((standard) => ({
        status: standard.status || 'NOT_STARTED'
      }))

      const standardsWithDetails = mapStandardsWithDetails(
        project.standards,
        standards
      )

      return h.view('projects/detail/index', {
        pageTitle: `${project.name} | DDTS Assurance`,
        heading: project.name,
        project: {
          ...project,
          standards: standardsWithDetails
        },
        projectHistory: projectHistory || [],
        standards: standardsStatus
      })
    } catch (error) {
      request.logger.error('Error fetching project details')
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

      // Get service standards to enrich project data
      const serviceStandards = await getServiceStandards(request)

      // Enrich standards with names and numbers
      const enrichedStandards = project.standards
        .map((standard) => {
          const serviceStandard = serviceStandards.find(
            (s) => s.number.toString() === standard.standardId
          )
          return {
            ...standard,
            number:
              serviceStandard?.number || parseInt(standard.standardId, 10),
            name: serviceStandard?.name,
            description: serviceStandard?.description
          }
        })
        .sort((a, b) => (a.number || 0) - (b.number || 0))

      return h.view('projects/detail/edit', {
        pageTitle: `Edit ${project.name} | DDTS Assurance`,
        heading: `Edit ${project.name}`,
        project: {
          ...project,
          standards: enrichedStandards
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

  postEdit: async (request, h) => {
    const { id } = request.params
    const { status, commentary, tags, ...payload } = request.payload

    try {
      // Restructure standards data from form
      const standards = []
      Object.keys(payload).forEach((key) => {
        if (key.startsWith('standards.')) {
          const [, standardId, field] = key.split('.')

          // Initialize standard object if it doesn't exist
          if (!standards[standardId]) {
            standards[standardId] = { standardId }
          }

          // Add field to standard object
          standards[standardId][field] = payload[key]
        }
      })

      // Filter out empty entries and convert to array
      const parsedStandards = Object.values(standards).filter(Boolean)

      // Validate standards
      const hasInvalidStandards = parsedStandards.some(
        (standard) => !standard.status || standard.status.trim() === ''
      )
      if (hasInvalidStandards) {
        return h.view('projects/detail/edit', {
          pageTitle: `Edit ${request.payload.name} | DDTS Assurance`,
          heading: `Edit ${request.payload.name}`,
          project: {
            id,
            ...request.payload,
            standards: parsedStandards
          },
          statusOptions: [
            { value: 'RED', text: 'Red' },
            { value: 'AMBER', text: 'Amber' },
            { value: 'GREEN', text: 'Green' }
          ],
          errorMessage: NOTIFICATIONS.VALIDATION_ERROR
        })
      }

      // Process tags - split by comma and trim whitespace
      const processedTags = tags
        ? tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : []

      await updateProject(
        id,
        {
          status,
          commentary,
          tags: processedTags,
          standards: parsedStandards
        },
        request
      )

      return h.redirect(
        `/projects/${id}?notification=${NOTIFICATIONS.UPDATE_SUCCESS}`
      )
    } catch (error) {
      request.logger.error(
        {
          error,
          payload: request.payload
        },
        'Failed to update project standards'
      )

      try {
        // Get project data to re-render form with errors
        const project = await getProjectById(id, request)
        const standards = await getServiceStandards(request)

        // Map standards to project assessments and ensure proper numeric sorting
        const standardsWithDetails = mapStandardsWithDetails(
          project.standards,
          standards
        )

        return h.view('projects/detail/edit', {
          pageTitle: `Edit ${project.name} | DDTS Assurance`,
          heading: `Edit ${project.name}`,
          project,
          standards: standardsWithDetails,
          statusOptions: [
            { value: 'RED', text: 'Red' },
            { value: 'AMBER', text: 'Amber' },
            { value: 'GREEN', text: 'Green' }
          ],
          errorMessage: NOTIFICATIONS.GENERAL_ERROR
        })
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
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      const history = await getProjectHistory(id, request)

      return h.view('projects/detail/project-history', {
        pageTitle: `Project History | ${project.name}`,
        heading: 'Project History',
        project,
        history
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
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

      if (request.auth.isAuthenticated) {
        // Get token from session
        let token = null
        if (request.auth?.credentials?.token) {
          token = request.auth.credentials.token
        }

        // Try to get from cache if not in session
        if (!token && request.server?.app?.cache) {
          try {
            const cached = await request.server.app.cache.get(
              request.auth.credentials.id
            )
            if (cached?.token) {
              token = cached.token
            }
          } catch (error) {
            request.logger.error('Error getting token from cache')
          }
        }

        if (request.auth.credentials?.id) {
          // Try getting from cache as well
          try {
            const cached = await request.server.app.cache.get(
              request.auth.credentials.id
            )
            if (cached) {
              if (cached.token) {
                // Update credentials with token from cache if not already present
                if (!request.auth.credentials.token) {
                  request.auth.credentials.token = cached.token
                }
              }
            }
          } catch (cacheError) {
            request.logger.error(
              { error: cacheError.message },
              `[HISTORY_DEBUG] Error accessing cache`
            )
          }
        }
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
      const history = await getProjectHistory(id, request)

      return h.view('projects/detail/project-history', {
        pageTitle: `Project History: ${project.name}`,
        project,
        history
      })
    } catch (error) {
      request.logger.error(
        { error: error.message },
        'Error getting project history'
      )
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
