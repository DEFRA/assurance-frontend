import Boom from '@hapi/boom'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import {
  getProjects,
  deleteProject,
  getProjectById,
  createProject,
  updateProject
} from '~/src/server/services/projects.js'
import { getProfessions } from '~/src/server/services/professions.js'
import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { defaultServiceStandards } from '~/src/server/data/service-standards.js'
import { defaultProjects } from '~/src/server/data/projects.js'
import { defaultProfessions } from '~/src/server/data/professions.js'
import { config } from '~/src/config/config.js'

export const adminController = {
  get: async (request, h) => {
    try {
      let standards = []
      let projects = []
      let professions = []

      // Try to get standards from API, fall back to defaults if not available
      try {
        standards = (await getServiceStandards(request)) || []
      } catch (error) {
        request.logger.warn(
          { error },
          'Could not fetch standards from API, using defaults'
        )
        standards = defaultServiceStandards
      }

      try {
        projects = (await getProjects(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching projects')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      try {
        professions = (await getProfessions(request)) || []
      } catch (error) {
        request.logger.error({ error }, 'Error fetching professions')
        throw Boom.boomify(error, { statusCode: 500 })
      }

      // Get environment from config or use a default for testing
      const isTestEnvironment = config.get
        ? config.get('env') === 'test'
        : false

      const isDevelopment = config.get
        ? config.get('env') === 'development'
        : false

      return h.view('admin/index', {
        pageTitle: 'Data Management',
        heading: 'Data Management',
        standardsCount: standards?.length || 0,
        projectsCount: projects?.length || 0,
        professionsCount: professions?.length || 0,
        projects,
        notification: request.query.notification,
        isTestEnvironment,
        isDevelopment
      })
    } catch (error) {
      request.logger.error({ error }, 'Error fetching admin dashboard data')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  deleteStandards: async (request, h) => {
    try {
      request.logger.info('Deleting all standards')

      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/serviceStandards/seed', {
        method: 'POST',
        body: JSON.stringify([])
      })

      request.logger.info('Standards deleted successfully')
      return h.redirect('/admin?notification=Standards deleted successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete standards')
      return h.redirect('/admin?notification=Failed to delete standards')
    }
  },

  deleteProject: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ id }, 'Deleting project')

      const result = await deleteProject(id, request)

      if (!result) {
        request.logger.warn({ id }, 'Project not found for deletion')
        return h.redirect('/admin?notification=Project not found')
      }

      request.logger.info({ id }, 'Project deleted successfully')
      return h.redirect('/admin?notification=Project deleted successfully')
    } catch (error) {
      request.logger.error({ error }, 'Failed to delete project')
      return h.redirect('/admin?notification=Failed to delete project')
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

      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Project Deletion',
        heading: 'Delete Project',
        message: `Are you sure you want to delete the project "${projectName}"?`,
        confirmUrl: `/admin/projects/${id}/delete`,
        cancelUrl: id ? `/projects/${id}` : '/admin',
        backLink: id ? `/projects/${id}` : '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
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
      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Standards',
        heading: 'Delete All Standards',
        message:
          'Are you sure you want to delete ALL service standards? This will remove all standard definitions from the system.',
        confirmUrl: '/admin/standards/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
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
      return h.view('admin/confirm-delete', {
        pageTitle: 'Confirm Delete All Professions',
        heading: 'Delete All Professions',
        message:
          'Are you sure you want to delete ALL professions? This will remove all profession definitions from the system.',
        confirmUrl: '/admin/professions/delete',
        cancelUrl: '/admin',
        backLink: '/admin'
      })
    } catch (error) {
      request.logger.error({ error }, 'Failed to show delete confirmation')
      return h.redirect(
        '/admin?notification=Failed to show delete confirmation'
      )
    }
  },

  deleteProfessions: async (request, h) => {
    request.logger.info('Deleting all professions')

    try {
      // Use the correct endpoint and HTTP method for the backend API
      const result = await authedFetchJsonDecorator(request)(
        '/professions/deleteAll',
        {
          method: 'POST'
        }
      )

      request.logger.info(
        { result: result || 'no response data' },
        'Delete professions result'
      )

      return h.redirect('/admin?notification=Professions deleted successfully')
    } catch (error) {
      request.logger.warn(
        {
          error: error.message
        },
        'Error deleting professions'
      )

      return h.redirect('/admin?notification=Failed to delete professions')
    }
  },

  /**
   * Seed professions with default data (dev only)
   */
  seedProfessionsDev: async (request, h) => {
    try {
      // Delete existing professions first
      const authedFetch = authedFetchJsonDecorator(request)
      await authedFetch('/professions/deleteAll', {
        method: 'POST'
      })

      // Create each profession individually
      for (const profession of defaultProfessions) {
        await authedFetch('/professions', {
          method: 'POST',
          body: JSON.stringify(profession)
        })
      }

      request.logger.info('Professions seeded (dev only)')
      return h.redirect('/admin?notification=Professions seeded (dev only)')
    } catch (error) {
      request.logger.error(error, 'Failed to seed professions (dev only)')
      return h.redirect(
        '/admin?notification=Failed to seed professions (dev only)'
      )
    }
  },

  seedProjectsDev: async (request, h) => {
    try {
      // First seed professions as they are required for projects
      await adminController.seedProfessionsDev(request, h)

      // Get all professions to use in projects
      const professions = await getProfessions(request)

      // Create projects with historic data
      for (const project of defaultProjects) {
        try {
          // Add some random professions to each project
          const allStatuses = [
            'RED',
            'AMBER_RED',
            'AMBER',
            'GREEN_AMBER',
            'GREEN'
          ]
          project.professions = professions
            .slice(0, Math.floor(Math.random() * 3) + 1) // 1-3 professions per project
            .map((prof) => ({
              professionId: prof.id,
              status:
                allStatuses[Math.floor(Math.random() * allStatuses.length)],
              commentary: `Initial assessment for ${prof.name}`
            }))

          // Create the project
          const createdProject = await createProject(project, request)
          request.logger.info(
            { projectId: createdProject.id },
            'Created project'
          )

          // Generate historic updates for the project
          const now = new Date()
          const daysAgo = 180 // Generate 6 months of history

          for (let i = daysAgo; i >= 0; i -= 10) {
            // Update every 10 days
            const updateDate = new Date(now)
            updateDate.setDate(updateDate.getDate() - i)
            const formattedDate = updateDate.toISOString()

            // Update project status and commentary
            await updateProject(
              createdProject.id,
              {
                status:
                  allStatuses[Math.floor(Math.random() * allStatuses.length)],
                commentary: `Historic update from ${formattedDate}`,
                updateDate: formattedDate
              },
              request
            )

            // Update each profession's status and commentary
            for (const profession of project.professions) {
              const professionName =
                professions.find((p) => p.id === profession.professionId)
                  ?.name || 'Unknown Profession'
              // Add some randomness to the profession update dates to make them look more natural
              const professionUpdateDate = new Date(updateDate)
              professionUpdateDate.setHours(
                professionUpdateDate.getHours() + Math.floor(Math.random() * 24)
              )
              const professionFormattedDate = professionUpdateDate.toISOString()

              // Create a new profession update with the historic date
              const professionUpdate = {
                professionId: profession.professionId,
                status:
                  allStatuses[Math.floor(Math.random() * allStatuses.length)],
                commentary: `Historic update for ${professionName} from ${professionFormattedDate}`
              }

              // Update the project with the profession update and historic date
              await updateProject(
                createdProject.id,
                {
                  professions: [professionUpdate],
                  updateDate: professionFormattedDate
                },
                request
              )
            }
          }
        } catch (error) {
          request.logger.error(
            { error, projectName: project.name },
            'Failed to create project or generate history'
          )
          // Continue with next project instead of failing completely
          continue
        }
      }

      request.logger.info('Projects and history seeded (dev only)')
      return h.redirect(
        '/admin?notification=Projects and history seeded (dev only)'
      )
    } catch (error) {
      request.logger.error(
        error,
        'Failed to seed projects and history (dev only)'
      )
      return h.redirect(
        '/admin?notification=Failed to seed projects and history (dev only)'
      )
    }
  }
}
