import Boom from '@hapi/boom'
import { getProjects } from '~/src/server/services/projects.js'

export const programmesController = {
  handler: async (request, h) => {
    try {
      const projects = await getProjects()

      // Extract unique programmes from project tags
      const programmes = projects
        .flatMap((p) => p.tags)
        .filter((tag) => tag?.startsWith('Portfolio:'))
        .map((tag) => tag.split(': ')[1])
        .filter((value, index, self) => self.indexOf(value) === index)
        .sort()
        .map((programme) => {
          const programmeProjects = projects.filter((p) =>
            p.tags?.some((t) => t === `Portfolio: ${programme}`)
          )
          return {
            name: programme,
            projectCount: programmeProjects.length,
            redCount: programmeProjects.filter((p) => p.status === 'RED')
              .length,
            amberCount: programmeProjects.filter((p) => p.status === 'AMBER')
              .length,
            greenCount: programmeProjects.filter((p) => p.status === 'GREEN')
              .length
          }
        })

      return h.view('programmes/index', {
        pageTitle: 'Programmes | DDTS Assurance',
        programmes
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getProgramme: async (request, h) => {
    const { programme } = request.params

    try {
      const projects = await getProjects()

      // Filter projects for this programme
      const programmeProjects = projects
        .filter((p) => p.tags?.some((t) => t === `Portfolio: ${programme}`))
        .map((project) => ({
          name: project.name,
          status: project.status,
          standardsNotMet: project.standards.filter((s) => s.status === 'RED')
            .length,
          id: project.id
        }))

      return h.view('programmes/detail', {
        pageTitle: `${programme} Programme | DDTS Assurance`,
        programme,
        projects: programmeProjects
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  }
}
