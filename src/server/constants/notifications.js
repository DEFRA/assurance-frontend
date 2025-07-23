/**
 * Common notification messages and strings used across controllers
 */

export const NOTIFICATIONS = {
  PROJECT_NOT_FOUND: 'Project not found',
  STANDARD_NOT_FOUND: 'Standard not found',
  PROFESSION_NOT_FOUND: 'Profession not found',
  PROJECT_UPDATED_SUCCESSFULLY: 'Project updated successfully',
  PROJECT_CREATED_SUCCESSFULLY: 'Project created successfully',
  ASSESSMENT_SAVED_SUCCESSFULLY: 'Assessment saved successfully',
  ASSESSMENT_ARCHIVED_SUCCESSFULLY: 'Assessment entry archived successfully',
  PROJECT_UPDATE_ARCHIVED_SUCCESSFULLY: 'Project update archived successfully',
  VALIDATION_ERROR: 'Please check your input - some fields are invalid',
  FAILED_TO_UPDATE_PROJECT: 'Failed to update project. Please try again.',
  FAILED_TO_SAVE_ASSESSMENT: 'Failed to save assessment. Please try again.',
  FAILED_TO_ARCHIVE_ASSESSMENT: 'Failed to archive assessment entry',
  FAILED_TO_ARCHIVE_PROJECT_UPDATE: 'Failed to archive project update',
  FAILED_TO_CREATE_PROJECT: 'Failed to create project',
  HISTORY_ENTRY_NOT_FOUND: 'History entry not found',
  STANDARD_OR_PROFESSION_NOT_FOUND: 'Standard or profession not found',
  PROFESSION_NOT_FOUND_IN_PROJECT: 'Profession not found in this project',
  ONLY_STATUS_COMMENTARY_CAN_BE_ARCHIVED:
    'Only status and commentary updates can be archived',
  DELIVERY_UPDATE_ARCHIVED: 'Delivery update successfully archived',
  FAILED_TO_ARCHIVE_DELIVERY_UPDATE: 'Failed to archive delivery update'
}

export const PAGE_TITLES = {
  PROJECTS: 'Projects',
  PROFESSIONS: 'Professions',
  ABOUT: 'About',
  HOME: 'Home',
  DATA_MANAGEMENT: 'Data Management',
  PROFESSION_NOT_FOUND: 'Profession Not Found',
  ARCHIVE_PROJECT_UPDATE: 'Archive Project Update',
  CONFIRM_PROJECT_DELETION: 'Confirm Project Deletion',
  CONFIRM_DELETE_ALL_STANDARDS: 'Confirm Delete All Standards',
  CONFIRM_DELETE_ALL_PROFESSIONS: 'Confirm Delete All Professions'
}

export const HEADINGS = {
  PROJECTS: 'Projects',
  PROFESSIONS: 'Professions',
  ABOUT: 'About',
  DATA_MANAGEMENT: 'Data Management',
  DELETE_PROJECT: 'Delete Project',
  DELETE_ALL_STANDARDS: 'Delete All Standards',
  DELETE_ALL_PROFESSIONS: 'Delete All Professions'
}

export const VIEW_TEMPLATES = {
  // Error views
  ERRORS_NOT_FOUND: 'errors/not-found',
  ERRORS_SERVER_ERROR: 'errors/server-error',
  ERRORS_FORBIDDEN: 'errors/forbidden',

  // Project-specific errors
  PROJECTS_NOT_FOUND: 'projects/not-found',

  // Project views
  PROJECTS_INDEX: 'projects/views/index',
  PROJECTS_DETAIL_INDEX: 'projects/detail/views/index',
  PROJECTS_DETAIL_EDIT: 'projects/detail/views/edit',
  PROJECTS_DETAIL_HISTORY: 'projects/detail/views/project-history',
  PROJECTS_DETAIL_PROFESSION_HISTORY:
    'projects/detail/views/profession-history',
  PROJECTS_DETAIL_ARCHIVE_HISTORY:
    'projects/detail/views/archive-project-history',

  // Project add views
  PROJECTS_ADD_INDEX: 'projects/add/views/index',

  // Project manage views
  PROJECTS_MANAGE_SELECT: 'projects/manage/views/select',
  PROJECTS_MANAGE_STATUS: 'projects/manage/views/status',
  PROJECTS_MANAGE_DETAILS: 'projects/manage/views/details',

  // Project standards views
  PROJECTS_STANDARDS_LIST: 'projects/standards/views/list',
  PROJECTS_STANDARDS_DETAIL: 'projects/standards/views/detail',
  PROJECTS_STANDARDS_HISTORY: 'projects/standards/views/history',
  PROJECTS_STANDARDS_ASSESSMENT: 'projects/standards/views/assessment',
  PROJECTS_STANDARDS_ASSESSMENT_HISTORY:
    'projects/standards/views/assessment-history',
  PROJECTS_STANDARDS_ARCHIVE_ASSESSMENT:
    'projects/standards/views/archive-assessment',

  // Code Analysis views
  CODE_ANALYSIS_INDEX: 'code-analysis/views/index',

  // Other views
  PROFESSIONS_INDEX: 'professions/index',
  PROFESSIONS_DETAIL: 'professions/detail',
  ABOUT_INDEX: 'about/index',
  HOME_INDEX: 'home/index',
  ADMIN_INDEX: 'admin/index',
  ADMIN_CONFIRM_DELETE: 'admin/confirm-delete'
}

export const ADMIN_NOTIFICATIONS = {
  STANDARDS_DELETED_SUCCESSFULLY: 'Standards deleted successfully',
  FAILED_TO_DELETE_STANDARDS: 'Failed to delete standards',
  PROJECT_DELETED_SUCCESSFULLY: 'Project deleted successfully',
  FAILED_TO_DELETE_PROJECT: 'Failed to delete project',
  FAILED_TO_SHOW_DELETE_CONFIRMATION: 'Failed to show delete confirmation',
  PROFESSIONS_DELETED_SUCCESSFULLY: 'Professions deleted successfully',
  FAILED_TO_DELETE_PROFESSIONS: 'Failed to delete professions',
  SERVICE_STANDARDS_SEEDED_SUCCESSFULLY:
    'Service standards seeded successfully',
  FAILED_TO_SEED_SERVICE_STANDARDS: 'Failed to seed service standards',
  PROFESSIONS_SEEDED_SUCCESSFULLY: 'Professions seeded successfully',
  FAILED_TO_SEED_PROFESSIONS: 'Failed to seed professions',
  PROJECTS_SEEDED_SUCCESSFULLY:
    'Projects and assessments seeded successfully with new system',
  FAILED_TO_SEED_PROJECTS: 'Failed to seed projects and assessments'
}

export const MANAGE_NOTIFICATIONS = {
  PROJECT_STATUS_UPDATED_SUCCESSFULLY:
    'Project status and commentary updated successfully',
  PROJECT_DETAILS_UPDATED_SUCCESSFULLY: 'Project details updated successfully'
}

export const LOG_MESSAGES = {
  STANDARDS_DELETED: 'Standards deleted successfully',
  PROJECT_DELETED: 'Project deleted successfully',
  FAILED_TO_DELETE_STANDARDS: 'Failed to delete standards',
  FAILED_TO_DELETE_PROJECT: 'Failed to delete project',
  FAILED_TO_SHOW_DELETE_CONFIRMATION: 'Failed to show delete confirmation',
  FAILED_TO_UPDATE_PROJECT_STATUS: 'Failed to update project status',
  FAILED_TO_UPDATE_PROJECT_DETAILS: 'Failed to update project details',
  PROJECT_DETAILS_UPDATED: 'Project details updated successfully',
  SERVICE_STANDARDS_SEEDED: 'Service standards seeded successfully (dev only)',
  FAILED_TO_SEED_SERVICE_STANDARDS:
    'Failed to seed service standards (dev only)',
  FAILED_TO_SEED_PROFESSIONS: 'Failed to seed professions (dev only)',
  PROJECTS_SEEDED: 'Projects seeded successfully with new assessment system',
  FAILED_TO_UPDATE_PROJECT_AFTER_ARCHIVING:
    'Failed to update project after archiving',
  FAILED_TO_UPDATE_PROJECT: 'Failed to update project',
  PROJECT_NOT_FOUND_FOR_DELETION: 'Project not found for deletion'
}

export const DDTS_ASSURANCE_SUFFIX = ' | DDTS Assurance'
