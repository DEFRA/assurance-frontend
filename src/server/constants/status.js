/**
 * Constants for status values used throughout the application
 */

export const STATUS = {
  GREEN: 'GREEN',
  GREEN_AMBER: 'GREEN_AMBER',
  AMBER: 'AMBER',
  AMBER_RED: 'AMBER_RED',
  RED: 'RED',
  TBC: 'TBC'
}

export const STATUS_CLASS = {
  [STATUS.GREEN]: 'govuk-tag--green',
  [STATUS.GREEN_AMBER]: 'govuk-tag--green govuk-tag--yellow', // Will render as two tags in UI
  [STATUS.AMBER]: 'govuk-tag--yellow',
  [STATUS.AMBER_RED]: 'govuk-tag--yellow govuk-tag--red', // Will render as two tags in UI
  [STATUS.RED]: 'govuk-tag--red',
  [STATUS.TBC]: 'govuk-tag--grey'
}

export const STATUS_LABEL = {
  [STATUS.GREEN]: 'Green',
  [STATUS.GREEN_AMBER]: 'Green Amber',
  [STATUS.AMBER]: 'Amber',
  [STATUS.AMBER_RED]: 'Amber Red',
  [STATUS.RED]: 'Red',
  [STATUS.TBC]: 'TBC'
}
