/**
 * Themes controller
 * Handles CRUD operations for key themes
 */
import Boom from '@hapi/boom'
import {
  getThemes,
  getAllThemes,
  getThemeById,
  createTheme,
  updateTheme,
  archiveTheme,
  restoreTheme
} from '~/src/server/services/themes.js'
import { getProjects } from '~/src/server/services/projects.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

const VIEW_TEMPLATES = {
  THEMES_LIST: 'themes/views/index',
  THEMES_ADD: 'themes/views/add',
  THEMES_DETAIL: 'themes/views/detail',
  THEMES_EDIT: 'themes/views/edit',
  ERRORS_NOT_FOUND: 'errors/not-found'
}

const NOTIFICATIONS = {
  THEME_NOT_FOUND: 'Theme not found',
  THEME_CREATED: 'Theme created successfully',
  THEME_UPDATED: 'Theme updated successfully',
  THEME_ARCHIVED: 'Theme archived successfully',
  THEME_RESTORED: 'Theme restored successfully'
}

/**
 * Get breadcrumbs for themes pages
 * @param {string} currentPage - Current page name
 * @param {object} theme - Theme object (optional)
 * @returns {Array} Breadcrumb items
 */
const getThemesBreadcrumbs = (currentPage, theme = null) => {
  const crumbs = [
    { text: 'Home', href: '/' },
    { text: 'Themes', href: '/themes' }
  ]

  if (theme) {
    crumbs.push({
      text: theme.name || theme.Name,
      href: `/themes/${theme.id || theme.Id}`
    })
  }

  if (currentPage) {
    crumbs.push({ text: currentPage })
  }

  return crumbs
}

export const themesController = {
  /**
   * List all themes
   */
  list: async (request, h) => {
    try {
      request.logger.info('Loading themes list page')

      const showArchived = request.query.showArchived === 'true'
      const themes = showArchived
        ? await getAllThemes(request)
        : await getThemes(request)

      // Normalize field names for template
      const normalizedThemes = themes.map((theme) => ({
        id: theme.id || theme.Id,
        name: theme.name || theme.Name,
        description: theme.description || theme.Description,
        projectIds: theme.projectIds || theme.ProjectIds || [],
        isActive: theme.isActive ?? theme.IsActive ?? true,
        createdAt: theme.createdAt || theme.CreatedAt,
        updatedAt: theme.updatedAt || theme.UpdatedAt
      }))

      return h.view(VIEW_TEMPLATES.THEMES_LIST, {
        pageTitle: 'Key Themes',
        themes: normalizedThemes,
        showArchived,
        breadcrumbs: getThemesBreadcrumbs(null)
      })
    } catch (error) {
      request.logger.error({ error }, 'Error loading themes list')
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  /**
   * Show add theme form
   */
  addForm: async (request, h) => {
    try {
      request.logger.info('Loading add theme form')

      // Get all projects for the tagging dropdown
      const projects = await getProjects(request)

      return h.view(VIEW_TEMPLATES.THEMES_ADD, {
        pageTitle: 'Add Theme',
        projects: projects || [],
        breadcrumbs: getThemesBreadcrumbs('Add')
      })
    } catch (error) {
      request.logger.error({ error }, 'Error loading add theme form')
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  /**
   * Create a new theme
   */
  create: async (request, h) => {
    try {
      const { name, description, projectIds } = request.payload

      request.logger.info({ name }, 'Creating new theme')

      // Parse projectIds - could be array or single value
      let parsedProjectIds = []
      if (projectIds) {
        parsedProjectIds = Array.isArray(projectIds) ? projectIds : [projectIds]
      }

      const themeData = {
        name,
        description,
        projectIds: parsedProjectIds
      }

      await createTheme(themeData, request)

      return h.redirect('/themes?notification=created')
    } catch (error) {
      request.logger.error({ error }, 'Error creating theme')

      // Re-render form with error
      const projects = await getProjects(request)

      return h.view(VIEW_TEMPLATES.THEMES_ADD, {
        pageTitle: 'Add Theme',
        projects: projects || [],
        error: error.message || 'Failed to create theme',
        values: request.payload,
        breadcrumbs: getThemesBreadcrumbs('Add')
      })
    }
  },

  /**
   * Show theme details
   */
  detail: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ themeId: id }, 'Loading theme details')

      const theme = await getThemeById(id, request)

      if (!theme) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.THEME_NOT_FOUND
          })
          .code(statusCodes.notFound)
      }

      // Normalize field names
      const normalizedTheme = {
        id: theme.id || theme.Id,
        name: theme.name || theme.Name,
        description: theme.description || theme.Description,
        projectIds: theme.projectIds || theme.ProjectIds || [],
        isActive: theme.isActive ?? theme.IsActive ?? true,
        createdAt: theme.createdAt || theme.CreatedAt,
        updatedAt: theme.updatedAt || theme.UpdatedAt,
        createdBy: theme.createdBy || theme.CreatedBy,
        updatedBy: theme.updatedBy || theme.UpdatedBy
      }

      // Get project details for the tagged projects
      let taggedProjects = []
      if (normalizedTheme.projectIds.length > 0) {
        const allProjects = await getProjects(request)
        taggedProjects = allProjects.filter((p) =>
          normalizedTheme.projectIds.includes(p.id)
        )
      }

      return h.view(VIEW_TEMPLATES.THEMES_DETAIL, {
        pageTitle: normalizedTheme.name,
        theme: normalizedTheme,
        taggedProjects,
        breadcrumbs: getThemesBreadcrumbs(null, normalizedTheme)
      })
    } catch (error) {
      request.logger.error(
        { error, themeId: id },
        'Error loading theme details'
      )
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  /**
   * Show edit theme form
   */
  editForm: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ themeId: id }, 'Loading edit theme form')

      const theme = await getThemeById(id, request)

      if (!theme) {
        return h
          .view(VIEW_TEMPLATES.ERRORS_NOT_FOUND, {
            pageTitle: NOTIFICATIONS.THEME_NOT_FOUND
          })
          .code(statusCodes.notFound)
      }

      // Normalize field names
      const normalizedTheme = {
        id: theme.id || theme.Id,
        name: theme.name || theme.Name,
        description: theme.description || theme.Description,
        projectIds: theme.projectIds || theme.ProjectIds || [],
        isActive: theme.isActive ?? theme.IsActive ?? true
      }

      // Get all projects for the tagging dropdown
      const projects = await getProjects(request)

      return h.view(VIEW_TEMPLATES.THEMES_EDIT, {
        pageTitle: `Edit ${normalizedTheme.name}`,
        theme: normalizedTheme,
        projects: projects || [],
        breadcrumbs: getThemesBreadcrumbs('Edit', normalizedTheme)
      })
    } catch (error) {
      request.logger.error(
        { error, themeId: id },
        'Error loading edit theme form'
      )
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  /**
   * Update a theme
   */
  update: async (request, h) => {
    const { id } = request.params
    const { name, description, projectIds } = request.payload

    try {
      request.logger.info({ themeId: id, name }, 'Updating theme')

      // Parse projectIds - could be array or single value
      let parsedProjectIds = []
      if (projectIds) {
        parsedProjectIds = Array.isArray(projectIds) ? projectIds : [projectIds]
      }

      const updateData = {
        name,
        description,
        projectIds: parsedProjectIds
      }

      await updateTheme(id, updateData, request)

      return h.redirect(`/themes/${id}?notification=updated`)
    } catch (error) {
      request.logger.error({ error, themeId: id }, 'Error updating theme')

      // Re-render form with error
      const theme = await getThemeById(id, request)
      const projects = await getProjects(request)

      return h.view(VIEW_TEMPLATES.THEMES_EDIT, {
        pageTitle: `Edit ${request.payload.name}`,
        theme: {
          id,
          ...request.payload,
          projectIds: Array.isArray(request.payload.projectIds)
            ? request.payload.projectIds
            : [request.payload.projectIds].filter(Boolean)
        },
        projects: projects || [],
        error: error.message || 'Failed to update theme',
        breadcrumbs: getThemesBreadcrumbs('Edit', theme)
      })
    }
  },

  /**
   * Archive a theme
   */
  archive: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ themeId: id }, 'Archiving theme')

      await archiveTheme(id, request)

      return h.redirect('/themes?notification=archived')
    } catch (error) {
      request.logger.error({ error, themeId: id }, 'Error archiving theme')
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  /**
   * Restore an archived theme
   */
  restore: async (request, h) => {
    const { id } = request.params

    try {
      request.logger.info({ themeId: id }, 'Restoring theme')

      await restoreTheme(id, request)

      return h.redirect('/themes?notification=restored&showArchived=true')
    } catch (error) {
      request.logger.error({ error, themeId: id }, 'Error restoring theme')
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  }
}
