/**
 * Professions controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import { getProfessions } from '~/src/server/services/professions.js'
import { getProjects } from '~/src/server/services/projects.js'
import {
  PAGE_TITLES,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'

// Constants
const STATUS_PRIORITY = {
  RED: 0,
  AMBER_RED: 1,
  AMBER: 2,
  GREEN_AMBER: 3,
  GREEN: 4,
  TBC: 5
}

// Helper function to format profession name to title case
function formatDisplayName(name) {
  if (!name) {
    return 'Unknown'
  }
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper function to create empty professions view
function createEmptyProfessionsView(h, isAuthenticated) {
  return h.view(VIEW_TEMPLATES.PROFESSIONS_INDEX, {
    pageTitle: PAGE_TITLES.PROFESSIONS,
    heading: PAGE_TITLES.PROFESSIONS,
    professions: [],
    message: 'No professions found. Please contact an administrator.',
    isAuthenticated
  })
}

// Helper function to process profession assessments for a project
function processProfessionAssessments(project, professionId, summary) {
  if (!project.professions || !Array.isArray(project.professions)) {
    return null
  }

  const professionAssessment = project.professions.find(
    (p) => p.professionId === professionId
  )

  if (!professionAssessment) {
    return null
  }

  // Update summary counts
  summary.total++
  const status = professionAssessment.status
  if (status === 'RED') {
    summary.red++
  } else if (status === 'AMBER_RED') {
    summary.amberRed++
  } else if (status === 'AMBER') {
    summary.amber++
  } else if (status === 'GREEN_AMBER') {
    summary.amberGreen++
  } else if (status === 'GREEN') {
    summary.green++
  } else {
    summary.notUpdated++
  }

  return {
    ...project,
    professionAssessment
  }
}

// Helper function to build relevant projects list
function buildRelevantProjects(projects, professionId) {
  const relevantProjects = []
  const summary = {
    total: 0,
    red: 0,
    amberRed: 0,
    amber: 0,
    amberGreen: 0,
    green: 0,
    notUpdated: 0
  }

  if (!projects || !Array.isArray(projects)) {
    return { relevantProjects, summary }
  }

  for (const project of projects) {
    const processedProject = processProfessionAssessments(
      project,
      professionId,
      summary
    )
    if (processedProject) {
      relevantProjects.push(processedProject)
    }
  }

  // Sort projects by status priority (RED first, GREEN last)
  relevantProjects.sort((a, b) => {
    const statusA = a.professionAssessment?.status || 'TBC'
    const statusB = b.professionAssessment?.status || 'TBC'
    return STATUS_PRIORITY[statusA] - STATUS_PRIORITY[statusB]
  })

  return { relevantProjects, summary }
}

export const professionsController = {
  getAll: async (request, h) => {
    try {
      const professions = await getProfessions(request)

      // Handle empty or null professions
      if (!professions || professions.length === 0) {
        return createEmptyProfessionsView(h, request.auth.isAuthenticated)
      }

      // Add displayName to each profession
      const formattedProfessions = professions.map((profession) => ({
        ...profession,
        displayName: formatDisplayName(profession.name)
      }))

      return h.view(VIEW_TEMPLATES.PROFESSIONS_INDEX, {
        pageTitle: PAGE_TITLES.PROFESSIONS,
        heading: PAGE_TITLES.PROFESSIONS,
        professions: formattedProfessions,
        isAuthenticated: request.auth.isAuthenticated
      })
    } catch (error) {
      request.logger.error('Error fetching professions')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  get: async (request, h) => {
    const { id } = request.params

    try {
      const [professions, projects] = await Promise.all([
        getProfessions(request),
        getProjects(request)
      ])

      const profession = professions?.find((p) => p.id === id)

      if (!profession) {
        request.logger.warn({ professionId: id }, 'Profession not found')
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: PAGE_TITLES.PROFESSION_NOT_FOUND
          })
          .code(404)
      }

      // Format the profession data for display
      const formattedProfession = {
        ...profession,
        displayName: formatDisplayName(profession.name),
        name: profession.name || `Profession ${id}`
      }

      // Build relevant projects and summary
      const { relevantProjects, summary } = buildRelevantProjects(projects, id)

      return h.view(VIEW_TEMPLATES.PROFESSIONS_DETAIL, {
        pageTitle: `${formattedProfession.displayName} overview`,
        heading: formattedProfession.displayName,
        profession: formattedProfession,
        projects: relevantProjects,
        summary,
        isAuthenticated: request.auth.isAuthenticated
      })
    } catch (error) {
      request.logger.error(
        { error, professionId: id },
        'Error fetching profession details'
      )
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
