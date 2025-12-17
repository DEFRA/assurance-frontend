import { authedFetchJsonDecorator } from '~/src/server/common/helpers/fetch/authed-fetch-json.js'
import { config } from '~/src/config/config.js'

// Constants
const API_VERSION_KEY = 'api.version'

/**
 * Generate a MongoDB-compatible ObjectId (24 hex characters)
 * Format: 4-byte timestamp + 5-byte random + 3-byte counter
 * @returns {string} - A valid MongoDB ObjectId string
 */
function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0')
  const randomPart = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
  return timestamp + randomPart
}

// API endpoint constants
const getThemesEndpoint = (apiVersion) => `/api/${apiVersion}/themes`
const getThemeByIdEndpoint = (apiVersion, id) =>
  `/api/${apiVersion}/themes/${id}`
const archiveThemeEndpoint = (apiVersion, id) =>
  `/api/${apiVersion}/themes/${id}/archive`
const restoreThemeEndpoint = (apiVersion, id) =>
  `/api/${apiVersion}/themes/${id}/restore`
const getThemesByProjectEndpoint = (apiVersion, projectId) =>
  `/api/${apiVersion}/themes/by-project/${projectId}`

/**
 * Get all active themes
 * @param {object} request - Hapi request object
 * @returns {Promise<Array>} List of active themes
 */
export const getThemes = async (request) => {
  request.logger?.info('Fetching active themes from API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    const response = await authedFetch(getThemesEndpoint(apiVersion))

    // Sort by creation date (newest first)
    return (response || []).sort(
      (a, b) =>
        new Date(b.createdAt || b.CreatedAt) -
        new Date(a.createdAt || a.CreatedAt)
    )
  } catch (error) {
    request.logger?.error({ error }, 'Failed to fetch themes from API')
    throw error
  }
}

/**
 * Get all themes including archived
 * @param {object} request - Hapi request object
 * @returns {Promise<Array>} List of all themes
 */
export const getAllThemes = async (request) => {
  request.logger?.info('Fetching all themes including archived from API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    const response = await authedFetch(
      `${getThemesEndpoint(apiVersion)}?includeArchived=true`
    )

    return (response || []).sort(
      (a, b) =>
        new Date(b.createdAt || b.CreatedAt) -
        new Date(a.createdAt || a.CreatedAt)
    )
  } catch (error) {
    request.logger?.error({ error }, 'Failed to fetch all themes from API')
    throw error
  }
}

/**
 * Get a theme by ID
 * @param {string} id - Theme ID
 * @param {object} request - Hapi request object
 * @returns {Promise<object>} Theme object
 */
export const getThemeById = async (id, request) => {
  request.logger?.info({ id }, 'Fetching theme by ID from API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    const response = await authedFetch(getThemeByIdEndpoint(apiVersion, id))

    if (!response) {
      throw new Error(`Theme with ID ${id} not found`)
    }

    return response
  } catch (error) {
    request.logger?.error({ error, id }, 'Failed to fetch theme by ID from API')
    throw error
  }
}

/**
 * Create a new theme
 * @param {object} themeData - Theme data
 * @param {object} request - Hapi request object
 * @returns {Promise<object>} Created theme
 */
export const createTheme = async (themeData, request) => {
  request.logger?.info({ themeData }, 'Creating theme via API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    // Transform frontend data structure to match backend ThemeModel (PascalCase)
    // This follows the same pattern as delivery-partners.js
    // ThemeModel requires a valid MongoDB ObjectId for the Id field
    const themeModel = {
      Id: generateObjectId(),
      Name: themeData.name,
      Description: themeData.description,
      ProjectIds: themeData.projectIds || [],
      IsActive: true,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    }

    request.logger?.info(
      { model: themeModel },
      'Transformed theme data for backend'
    )

    const response = await authedFetch(getThemesEndpoint(apiVersion), {
      method: 'POST',
      body: JSON.stringify(themeModel)
    })

    return response
  } catch (error) {
    request.logger?.error(
      { error, themeData },
      'Failed to create theme via API'
    )
    throw error
  }
}

/**
 * Update an existing theme
 * @param {string} id - Theme ID
 * @param {object} updateData - Updated theme data
 * @param {object} request - Hapi request object
 * @returns {Promise<object>} Updated theme
 */
export const updateTheme = async (id, updateData, request) => {
  request.logger?.info({ id, updateData }, 'Updating theme via API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    // Get the existing theme first
    const existingTheme = await getThemeById(id, request)

    // Transform frontend data to match backend ThemeModel (PascalCase)
    // Merge with existing theme data, preserving backend field names
    const updatePayload = {
      Id: existingTheme.id || existingTheme.Id,
      Name: updateData.name ?? existingTheme.name ?? existingTheme.Name,
      Description:
        updateData.description ??
        existingTheme.description ??
        existingTheme.Description,
      ProjectIds:
        updateData.projectIds ??
        existingTheme.projectIds ??
        existingTheme.ProjectIds ??
        [],
      IsActive: existingTheme.isActive ?? existingTheme.IsActive ?? true,
      CreatedAt: existingTheme.createdAt || existingTheme.CreatedAt,
      UpdatedAt: new Date().toISOString()
    }

    request.logger?.info(
      { model: updatePayload },
      'Transformed theme update data for backend'
    )

    const response = await authedFetch(getThemeByIdEndpoint(apiVersion, id), {
      method: 'PUT',
      body: JSON.stringify(updatePayload)
    })

    return response
  } catch (error) {
    request.logger?.error(
      { error, id, updateData },
      'Failed to update theme via API'
    )
    throw error
  }
}

/**
 * Archive a theme
 * @param {string} id - Theme ID
 * @param {object} request - Hapi request object
 * @returns {Promise<void>}
 */
export const archiveTheme = async (id, request) => {
  request.logger?.info({ id }, 'Archiving theme via API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    await authedFetch(archiveThemeEndpoint(apiVersion, id), {
      method: 'PUT'
    })
  } catch (error) {
    request.logger?.error({ error, id }, 'Failed to archive theme via API')
    throw error
  }
}

/**
 * Restore an archived theme
 * @param {string} id - Theme ID
 * @param {object} request - Hapi request object
 * @returns {Promise<void>}
 */
export const restoreTheme = async (id, request) => {
  request.logger?.info({ id }, 'Restoring theme via API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    await authedFetch(restoreThemeEndpoint(apiVersion, id), {
      method: 'PUT'
    })
  } catch (error) {
    request.logger?.error({ error, id }, 'Failed to restore theme via API')
    throw error
  }
}

/**
 * Get themes by project ID
 * @param {string} projectId - Project ID
 * @param {object} request - Hapi request object
 * @returns {Promise<Array>} List of themes for the project
 */
export const getThemesByProject = async (projectId, request) => {
  request.logger?.info({ projectId }, 'Fetching themes by project from API')

  try {
    const authedFetch = authedFetchJsonDecorator(request)
    const apiVersion = config.get(API_VERSION_KEY)

    const response = await authedFetch(
      getThemesByProjectEndpoint(apiVersion, projectId)
    )

    return response || []
  } catch (error) {
    request.logger?.error(
      { error, projectId },
      'Failed to fetch themes by project from API'
    )
    throw error
  }
}
