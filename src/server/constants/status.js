/**
 * Constants for status values used throughout the application
 */

// Base status values
export const STATUS = {
  GREEN: 'GREEN',
  GREEN_AMBER: 'GREEN_AMBER',
  AMBER: 'AMBER',
  AMBER_RED: 'AMBER_RED',
  RED: 'RED',
  TBC: 'TBC'
}

// Project status values (5 RAG + TBC system for overall project updates)
export const PROJECT_STATUS = {
  GREEN: 'GREEN',
  GREEN_AMBER: 'GREEN_AMBER',
  AMBER: 'AMBER',
  AMBER_RED: 'AMBER_RED',
  RED: 'RED',
  TBC: 'TBC'
}

// Service standard status values (3 RAG + TBC system)
export const SERVICE_STANDARD_STATUS = {
  GREEN: 'GREEN',
  AMBER: 'AMBER',
  RED: 'RED',
  TBC: 'TBC'
}

// CSS classes for all status types
export const STATUS_CLASS = {
  [STATUS.GREEN]: 'govuk-tag--green',
  [STATUS.GREEN_AMBER]: 'govuk-tag--green govuk-tag--yellow', // Will render as two tags in UI
  [STATUS.AMBER]: 'govuk-tag--yellow',
  [STATUS.AMBER_RED]: 'govuk-tag--yellow govuk-tag--red', // Will render as two tags in UI
  [STATUS.RED]: 'govuk-tag--red',
  [STATUS.TBC]: 'govuk-tag--grey'
}

// Labels for all status types
export const STATUS_LABEL = {
  [STATUS.GREEN]: 'Green',
  [STATUS.GREEN_AMBER]: 'Green Amber',
  [STATUS.AMBER]: 'Amber',
  [STATUS.AMBER_RED]: 'Amber Red',
  [STATUS.RED]: 'Red',
  [STATUS.TBC]: 'Pending' // Display TBC as "Pending" in UI
}

// Project status options for dropdowns (5 RAG + TBC)
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
  { value: PROJECT_STATUS.TBC, text: STATUS_LABEL[PROJECT_STATUS.TBC] }
]

// Service standard status options for dropdowns (3 RAG + TBC displayed as Pending)
export const SERVICE_STANDARD_STATUS_OPTIONS = [
  { value: '', text: 'Choose a status' },
  {
    value: SERVICE_STANDARD_STATUS.GREEN,
    text: STATUS_LABEL[SERVICE_STANDARD_STATUS.GREEN]
  },
  {
    value: SERVICE_STANDARD_STATUS.AMBER,
    text: STATUS_LABEL[SERVICE_STANDARD_STATUS.AMBER]
  },
  {
    value: SERVICE_STANDARD_STATUS.RED,
    text: STATUS_LABEL[SERVICE_STANDARD_STATUS.RED]
  },
  {
    value: SERVICE_STANDARD_STATUS.TBC,
    text: STATUS_LABEL[SERVICE_STANDARD_STATUS.TBC] // This will now show "Pending"
  }
]
