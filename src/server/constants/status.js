/**
 * Constants for status values used throughout the application
 */

// Status constants
export const STATUS = {
  GREEN: 'GREEN',
  GREEN_AMBER: 'GREEN_AMBER',
  AMBER: 'AMBER',
  AMBER_RED: 'AMBER_RED',
  RED: 'RED',
  TBC: 'TBC', // Keep for backwards compatibility
  PENDING: 'PENDING', // New explicit pending status
  EXCLUDED: 'EXCLUDED' // New excluded status (excluded from RAG calculations)
}

// Project status enum (same values as STATUS for consistency)
export const PROJECT_STATUS = {
  GREEN: 'GREEN',
  GREEN_AMBER: 'GREEN_AMBER',
  AMBER: 'AMBER',
  AMBER_RED: 'AMBER_RED',
  RED: 'RED',
  TBC: 'TBC', // Keep for backwards compatibility
  PENDING: 'PENDING', // New explicit pending status
  EXCLUDED: 'EXCLUDED' // New excluded status
}

// Service standard status values (3 RAG + TBC + PENDING + EXCLUDED system)
export const SERVICE_STANDARD_STATUS = {
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED',
  TBC: 'TBC', // Keep for backwards compatibility
  PENDING: 'PENDING', // New explicit pending status
  EXCLUDED: 'EXCLUDED' // New excluded status
}

// CSS classes for status tags
export const STATUS_CLASS = {
  [STATUS.GREEN]: 'govuk-tag--green',
  [STATUS.GREEN_AMBER]: 'govuk-tag--green govuk-tag--yellow', // Will render as two tags in UI
  [STATUS.AMBER]: 'govuk-tag--yellow',
  [STATUS.AMBER_RED]: 'govuk-tag--yellow govuk-tag--red', // Will render as two tags in UI
  [STATUS.RED]: 'govuk-tag--red',
  [STATUS.TBC]: 'govuk-tag--blue',
  [STATUS.PENDING]: 'govuk-tag--blue', // Explicit blue for pending items
  [STATUS.EXCLUDED]: 'govuk-tag--grey' // Grey for excluded items
}

// Labels for all status types
export const STATUS_LABEL = {
  [STATUS.GREEN]: 'Green',
  [STATUS.GREEN_AMBER]: 'Green Amber',
  [STATUS.AMBER]: 'Amber',
  [STATUS.AMBER_RED]: 'Amber Red',
  [STATUS.RED]: 'Red',
  [STATUS.TBC]: 'Pending', // Display existing TBC data as "Pending" for backwards compatibility
  [STATUS.PENDING]: 'Pending', // New explicit pending status
  [STATUS.EXCLUDED]: 'Excluded' // New excluded status
}

// Project status options for dropdowns (5 RAG + PENDING + EXCLUDED, TBC removed from selection)
export const PROJECT_STATUS_OPTIONS = [
  { value: '', text: 'Choose a status' },
  { value: PROJECT_STATUS.GREEN, text: STATUS_LABEL[PROJECT_STATUS.GREEN] },
  {
    value: PROJECT_STATUS.GREEN_AMBER,
    text: STATUS_LABEL[PROJECT_STATUS.GREEN_AMBER]
  },
  { value: PROJECT_STATUS.AMBER, text: STATUS_LABEL[PROJECT_STATUS.AMBER] },
  {
    value: PROJECT_STATUS.AMBER_RED,
    text: STATUS_LABEL[PROJECT_STATUS.AMBER_RED]
  },
  { value: PROJECT_STATUS.RED, text: STATUS_LABEL[PROJECT_STATUS.RED] },
  { value: PROJECT_STATUS.PENDING, text: STATUS_LABEL[PROJECT_STATUS.PENDING] },
  {
    value: PROJECT_STATUS.EXCLUDED,
    text: STATUS_LABEL[PROJECT_STATUS.EXCLUDED]
  }
  // TBC removed from dropdown options - users should select PENDING instead
]

// Service standard status options for dropdowns (3 RAG + PENDING + EXCLUDED, TBC removed from selection)
export const SERVICE_STANDARD_STATUS_OPTIONS = [
  { value: '', text: 'Choose a status' },
  { value: STATUS.GREEN, text: STATUS_LABEL[STATUS.GREEN] },
  { value: STATUS.AMBER, text: STATUS_LABEL[STATUS.AMBER] },
  { value: STATUS.RED, text: STATUS_LABEL[STATUS.RED] },
  { value: STATUS.PENDING, text: STATUS_LABEL[STATUS.PENDING] },
  { value: STATUS.EXCLUDED, text: STATUS_LABEL[STATUS.EXCLUDED] }
  // TBC removed from dropdown options - users should select PENDING instead
]

// RAG statuses only (excludes TBC, PENDING, EXCLUDED from calculations)
export const RAG_STATUSES = [
  STATUS.GREEN,
  STATUS.GREEN_AMBER,
  STATUS.AMBER,
  STATUS.AMBER_RED,
  STATUS.RED
]

// Non-RAG statuses (excluded from RAG calculations)
export const NON_RAG_STATUSES = [STATUS.TBC, STATUS.PENDING, STATUS.EXCLUDED]

// Helper function to check if a status should be included in RAG calculations
export const isRagStatus = (status) => {
  return RAG_STATUSES.includes(status)
}

// Helper function to check if a status is excluded from calculations
export const isExcludedStatus = (status) => {
  return status === STATUS.EXCLUDED
}

// Status priority order for aggregation (worst to best, excluding non-RAG statuses)
export const STATUS_PRIORITY_ORDER = [
  STATUS.RED,
  STATUS.AMBER_RED,
  STATUS.AMBER,
  STATUS.GREEN_AMBER,
  STATUS.GREEN
]
