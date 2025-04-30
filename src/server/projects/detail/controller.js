import {
  getProjectById,
  getProjectHistory
} from '~/src/server/services/projects.js'

export const getProjectHistoryController = async (request, h) => {
  try {
    const { id } = request.params

    // Get project details first
    const project = await getProjectById(id, request)

    if (!project) {
      request.logger.error(`Project not found with ID: ${id}`)
      return h.view('common/templates/not-found', {
        title: 'Project Not Found'
      })
    }

    // Get project history
    const history = await getProjectHistory(id, request)

    // Render the view
    return h.view('projects/detail/project-history', {
      pageTitle: `Project History: ${project.name}`,
      project,
      history
    })
  } catch (error) {
    request.logger.error('Error getting project history')
    return h.view('common/templates/error', {
      title: 'Error Retrieving Project History',
      message: 'There was a problem retrieving the project history.'
    })
  }
}
