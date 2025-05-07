/**
 * Professions controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import { getProfessions } from '~/src/server/services/professions.js'
import { getProjects } from '~/src/server/services/projects.js'

export const professionsController = {
  getAll: async (request, h) => {
    try {
      // Get all professions
      const professions = await getProfessions(request)

      if (!professions || professions.length === 0) {
        return h.view('professions/index', {
          pageTitle: 'Professions',
          heading: 'Professions',
          professions: [],
          message:
            'No professions found. Please add professions through the Admin interface.'
        })
      }

      // Format profession names for display (Title Case)
      const formattedProfessions = professions.map((profession) => ({
        ...profession,
        displayName: profession.name
          ? profession.name
              .toLowerCase()
              .replace(/\b\w/g, (char) => char.toUpperCase())
          : 'Unknown Profession'
      }))

      return h.view('professions/index', {
        pageTitle: 'Professions',
        heading: 'Professions',
        professions: formattedProfessions
      })
    } catch (error) {
      request.logger.error('Error fetching professions')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getById: async (request, h) => {
    const { id } = request.params

    try {
      // Get all professions to find the one requested
      const professions = await getProfessions(request)
      const profession = professions.find((p) => p.id === id)

      if (!profession) {
        return h
          .view('errors/not-found', {
            pageTitle: 'Profession Not Found'
          })
          .code(404)
      }

      // Format profession name for display (Title Case)
      const formattedProfession = {
        ...profession,
        displayName: profession.name
          ? profession.name
              .toLowerCase()
              .replace(/\b\w/g, (char) => char.toUpperCase())
          : 'Unknown Profession'
      }

      // Get all projects to find assessments for this profession
      const projects = await getProjects(request)

      // Filter projects to only those that have this profession
      const projectsWithProfession = projects
        .filter((project) =>
          project.professions?.some((p) => p.professionId === id)
        )
        .map((project) => {
          // Find the profession assessment for this project
          const professionAssessment = project.professions.find(
            (p) => p.professionId === id
          )

          return {
            id: project.id,
            name: project.name,
            status: project.status, // Overall project status
            lastUpdated: project.lastUpdated,
            professionAssessment: {
              status: professionAssessment?.status || 'NOT_UPDATED',
              commentary:
                professionAssessment?.commentary || 'No update provided'
            }
          }
        })
        // Sort by status (RED first, then AMBER, then GREEN)
        .sort((a, b) => {
          const statusOrder = { RED: 0, AMBER: 1, GREEN: 2, NOT_UPDATED: 3 }
          const statusA = statusOrder[a.professionAssessment.status] || 3
          const statusB = statusOrder[b.professionAssessment.status] || 3
          return statusA - statusB
        })

      return h.view('professions/detail', {
        pageTitle: `${formattedProfession.displayName} overview`,
        heading: formattedProfession.displayName,
        profession: formattedProfession,
        projects: projectsWithProfession,
        summary: {
          total: projectsWithProfession.length,
          red: projectsWithProfession.filter(
            (p) => p.professionAssessment.status === 'RED'
          ).length,
          amber: projectsWithProfession.filter(
            (p) => p.professionAssessment.status === 'AMBER'
          ).length,
          green: projectsWithProfession.filter(
            (p) => p.professionAssessment.status === 'GREEN'
          ).length,
          notUpdated: projectsWithProfession.filter(
            (p) => p.professionAssessment.status === 'NOT_UPDATED'
          ).length
        }
      })
    } catch (error) {
      request.logger.error('Error fetching profession details')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
