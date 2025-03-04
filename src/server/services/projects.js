import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { fetcher } from '~/src/server/common/helpers/fetch/fetcher.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'

export async function getProjects() {
  const logger = createLogger()
  try {
    const endpoint = '/projects'
    logger.info({ endpoint }, 'Fetching projects from API')

    const data = await fetcher(endpoint)

    // Handle case where data is null, undefined, or not an array
    if (!data || !Array.isArray(data)) {
      logger.warn('Invalid data returned from API', { data })
      return []
    }

    logger.info({ count: data.length }, 'Projects retrieved successfully')
    if (data.length > 0) {
      logger.info(
        {
          sampleProject: {
            id: data[0].id,
            standards: Array.isArray(data[0].standards)
              ? data[0].standards.map((s) => ({
                  standardId: s.standardId,
                  status: s.status
                }))
              : []
          }
        },
        'Sample project structure'
      )
    }
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code
      },
      'Failed to fetch projects'
    )
    throw error // Let the controller handle the error
  }
}

export async function createProject(projectData) {
  const logger = createLogger()
  try {
    const endpoint = '/projects'
    logger.info({ projectData }, 'Creating new project')

    // Get all service standards
    const standards = await getServiceStandards()

    if (!standards || standards.length === 0) {
      logger.error('No service standards available')
      throw new Error(
        'Failed to create project: No service standards available'
      )
    }

    // Sort standards by number first
    const sortedStandards = [...standards].sort((a, b) => a.number - b.number)

    // Format date as UK readable string
    const now = new Date()
    const formattedDate = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    // Create project data with standards
    const projectWithStandards = {
      id: '', // API will generate this
      name: projectData.name,
      status: projectData.status,
      commentary: projectData.commentary,
      lastUpdated: formattedDate,
      standards: sortedStandards.map((standard) => ({
        standardId: standard.number.toString(), // Keep as string for API
        status: 'GREEN',
        commentary: `Initial assessment for Standard ${standard.number}: ${standard.name}`
      }))
    }

    logger.info({ projectWithStandards }, 'Creating project with standards')

    const result = await fetcher(endpoint, {
      method: 'POST',
      body: JSON.stringify(projectWithStandards)
    })

    // Check if result is a Boom error (400 Bad Request)
    if (result.isBoom) {
      logger.error(
        {
          statusCode: result.output.statusCode,
          error: result.output.payload
        },
        'API validation failed'
      )
      throw new Error('Failed to create project: Invalid data')
    }

    if (!result) {
      logger.error('Failed to create project - no response from API')
      throw new Error('Failed to create project')
    }

    logger.info(
      {
        projectId: result.id,
        standardsCount: projectWithStandards.standards.length
      },
      'Project created successfully with standards'
    )
    return result
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectData
      },
      'Failed to create project'
    )
    throw error
  }
}

export async function updateProject(id, projectData) {
  const logger = createLogger()
  try {
    const endpoint = `/projects/${id}`
    logger.info({ id, projectData }, 'Updating project')

    // Get current project to preserve existing data
    const currentProject = await getProjectById(id)
    if (!currentProject) {
      throw new Error('Project not found')
    }

    // Update project data while preserving other fields
    const updatedProject = {
      ...currentProject,
      status: projectData.status || currentProject.status,
      commentary: projectData.commentary || currentProject.commentary,
      lastUpdated: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    }

    // If we're updating standards, merge them with existing standards
    if (projectData.standards) {
      updatedProject.standards = currentProject.standards.map((standard) => {
        const updatedStandard = projectData.standards.find(
          (s) => s.standardId === standard.standardId
        )
        if (updatedStandard) {
          return {
            ...standard,
            status: updatedStandard.status || standard.status,
            commentary: updatedStandard.commentary || standard.commentary
          }
        }
        return standard
      })
    }

    logger.info({ updatedProject }, 'Sending update to API')

    const result = await fetcher(endpoint, {
      method: 'PUT',
      body: JSON.stringify(updatedProject)
    })

    // Check if result exists and is a Boom error (400 Bad Request)
    if (result?.isBoom) {
      logger.error(
        {
          statusCode: result.output.statusCode,
          error: result.output.payload
        },
        'API validation failed'
      )
      throw new Error('Failed to update project: Invalid data')
    }

    if (!result) {
      logger.error('Failed to update project - no response from API')
      throw new Error('Failed to update project')
    }

    logger.info({ projectId: id }, 'Project updated successfully')
    return result
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id,
        projectData
      },
      'Failed to update project'
    )
    throw error
  }
}

export async function getProjectById(id) {
  const logger = createLogger()
  try {
    const endpoint = `/projects/${id}`
    logger.info({ endpoint, id }, 'Fetching project from API')

    const data = await fetcher(endpoint)

    if (!data) {
      logger.warn('Project not found', { id })
      return null
    }

    logger.info({ project: data }, 'Project retrieved successfully')
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to fetch project'
    )
    throw error
  }
}

export async function getStandardHistory(projectId, standardId) {
  const logger = createLogger()
  try {
    const endpoint = `/projects/${projectId}/standards/${standardId}/history`
    logger.info({ projectId, standardId }, 'Fetching standard history from API')

    const data = await fetcher(endpoint)

    if (!data) {
      logger.warn('No history found', { projectId, standardId })
      return []
    }

    logger.info(
      { historyCount: data.length },
      'Standard history retrieved successfully'
    )
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId,
        standardId
      },
      'Failed to fetch standard history'
    )
    throw error
  }
}

export async function getProjectHistory(projectId) {
  const logger = createLogger()
  try {
    const endpoint = `/projects/${projectId}/history`
    logger.info({ projectId }, 'Fetching project history from API')

    const data = await fetcher(endpoint)

    if (!data) {
      logger.warn('No history found', { projectId })
      return []
    }

    logger.info(
      { historyCount: data.length },
      'Project history retrieved successfully'
    )
    return data
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        projectId
      },
      'Failed to fetch project history'
    )
    throw error
  }
}

/**
 * Deletes a project by ID
 * @param {string} id - The project ID to delete
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export async function deleteProject(id) {
  const logger = createLogger()
  try {
    const endpoint = `/projects/${id}`
    logger.info({ id }, 'Deleting project')

    await fetcher(endpoint, {
      method: 'DELETE'
    })

    // A successful delete returns 204 No Content
    logger.info({ id }, 'Project deleted successfully')
    return true
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        code: error.code,
        id
      },
      'Failed to delete project'
    )
    throw error
  }
}
