/**
 * Professions controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import {
  getProfessions,
  getProfessionById
} from '~/src/server/services/professions.js'
import { getProjects } from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { filterStandardsByProfessionAndPhase } from '~/src/server/services/profession-standard-matrix.js'
import {
  PAGE_TITLES,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'

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

// Helper function to build filtered standards set
function buildFilteredStandardsSet(projects, allStandards, professionId) {
  const standardsSet = new Map()
  for (const project of projects) {
    const filtered = filterStandardsByProfessionAndPhase(
      allStandards,
      project.phase,
      professionId
    )
    for (const standard of filtered) {
      standardsSet.set(standard.id, standard)
    }
  }
  return Array.from(standardsSet.values())
}

// Helper function to get profession assessment for a project and standard
function getProfessionAssessment(project, standardId, professionId) {
  const standardsSummaryArr = Array.isArray(project.standardsSummary)
    ? project.standardsSummary
    : []

  const standardSummary = standardsSummaryArr.find(
    (s) => s.standardId === standardId
  )

  const professionsArr = Array.isArray(standardSummary?.professions)
    ? standardSummary.professions
    : []

  return professionsArr.find((p) => p.professionId === professionId)
}

// Helper function to build the matrix
function buildMatrix(filteredStandards, projects, professionId) {
  const matrix = {}

  for (const standard of filteredStandards) {
    matrix[standard.id] = {}

    for (const project of projects) {
      const professionAssessment = getProfessionAssessment(
        project,
        standard.id,
        professionId
      )

      matrix[standard.id][project.id] = {
        rag: professionAssessment?.status || 'TBC',
        commentary: professionAssessment?.commentary || ''
      }
    }
  }

  return matrix
}

// Helper function to categorize RAG status
function categorizeRagStatus(rag) {
  if (rag === 'RED') {
    return 'RED'
  }
  if (rag === 'AMBER' || rag === 'AMBER_RED' || rag === 'GREEN_AMBER') {
    return 'AMBER'
  }
  if (rag === 'GREEN') {
    return 'GREEN'
  }
  return 'TBC'
}

// Helper function to compute summary counts
function computeSummaryCounts(matrix) {
  const summaryCounts = { RED: 0, AMBER: 0, GREEN: 0, TBC: 0 }

  for (const standardId of Object.keys(matrix)) {
    for (const projectId of Object.keys(matrix[standardId])) {
      const rag = matrix[standardId][projectId].rag
      const category = categorizeRagStatus(rag)
      summaryCounts[category]++
    }
  }

  return summaryCounts
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
    const { id: professionId } = request.params
    try {
      const [profession, projects, allStandards] = await Promise.all([
        getProfessionById(professionId, request),
        getProjects(request),
        getServiceStandards(request)
      ])

      if (!profession) {
        request.logger.error('Profession not found')
        throw Boom.boomify(new Error('Profession not found'), {
          statusCode: 404
        })
      }

      // Build filtered standards, matrix, and summary counts using helper functions
      const filteredStandards = buildFilteredStandardsSet(
        projects,
        allStandards,
        professionId
      )

      const matrix = buildMatrix(filteredStandards, projects, professionId)
      const summaryCounts = computeSummaryCounts(matrix)

      return h.view(VIEW_TEMPLATES.PROFESSIONS_DETAIL, {
        pageTitle: `${profession.name} overview`,
        heading: profession.name,
        profession,
        projects,
        standards: filteredStandards,
        matrix,
        summaryCounts,
        isAuthenticated: request.auth.isAuthenticated
      })
    } catch (error) {
      // If it's already a Boom error with a specific status code, don't re-wrap it
      if (error.isBoom) {
        throw error
      }
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
