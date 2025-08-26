/**
 * Table row filters for GOV.UK table components
 */

import {
  STATUS,
  STATUS_LABEL,
  STATUS_CLASS
} from '~/src/server/constants/status.js'

/**
 * Create status tag HTML for JavaScript contexts
 * @param {string} status - Status value
 * @returns {string} HTML string for status tag
 */
function createStatusTagHTML(status) {
  // Handle compound statuses first
  if (status === STATUS.AMBER_RED) {
    return `<span class="app-tag-list">
      <strong class="govuk-tag govuk-tag--yellow">${STATUS_LABEL[STATUS.AMBER]}</strong>
      <strong class="govuk-tag govuk-tag--red">${STATUS_LABEL[STATUS.RED]}</strong>
    </span>`
  } else if (status === STATUS.GREEN_AMBER) {
    return `<span class="app-tag-list">
      <strong class="govuk-tag govuk-tag--green">${STATUS_LABEL[STATUS.GREEN]}</strong>
      <strong class="govuk-tag govuk-tag--yellow">${STATUS_LABEL[STATUS.AMBER]}</strong>
    </span>`
  } else if (status === STATUS.TBC) {
    return `<strong class="govuk-tag ${STATUS_CLASS[STATUS.TBC]}">${STATUS_LABEL[STATUS.TBC]}</strong>`
  } else if (STATUS_CLASS[status] && STATUS_LABEL[status]) {
    return `<strong class="govuk-tag ${STATUS_CLASS[status]}">${STATUS_LABEL[status]}</strong>`
  } else {
    // Default to PENDING for unknown statuses
    return `<strong class="govuk-tag ${STATUS_CLASS[STATUS.PENDING]}">${STATUS_LABEL[STATUS.PENDING]}</strong>`
  }
}

/**
 * Transform projects array into table rows for GOV.UK table component
 * @param {Array} projects - Array of project objects
 * @returns {Array} Array of table row objects
 */
export function projectTableRows(projects) {
  if (!Array.isArray(projects)) {
    return []
  }

  return projects.map((project) => [
    {
      html: `<a href="/projects/${project.id}" class="govuk-link">${project.name}</a>`
    },
    {
      html: createStatusTagHTML(project.status)
    }
  ])
}

/**
 * Transform standards at risk array into table rows for GOV.UK table component
 * @param {Array} standardsAtRisk - Array of standards objects
 * @returns {Array} Array of table row objects
 */
export function standardsAtRiskTableRows(standardsAtRisk) {
  if (!Array.isArray(standardsAtRisk)) {
    return []
  }

  const rows = []

  standardsAtRisk.forEach((standard) => {
    if (standard.professionComments && standard.professionComments.length > 0) {
      standard.professionComments.forEach((comment) => {
        let commentary = 'No commentary'

        if (comment.commentary) {
          if (comment.commentary.includes('Path to green:')) {
            const parts = comment.commentary.split('Path to green:')
            const issue = parts[0] ? parts[0].trim() : ''
            const path = parts[1] ? parts[1].trim() : ''

            if (issue && path) {
              commentary = `${issue}\n\n${path}`
            } else if (issue) {
              commentary = issue
            } else if (path) {
              commentary = path
            }
          } else {
            commentary = comment.commentary
          }
        }

        rows.push([
          {
            html: `<strong>Standard ${standard.number}</strong><br>${standard.name}`
          },
          {
            html: createStatusTagHTML(standard.status)
          },
          {
            text: comment.professionName
          },
          {
            text: commentary
          },
          {
            text: standard.lastUpdated
              ? new Date(standard.lastUpdated).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Not available'
          }
        ])
      })
    } else {
      rows.push([
        {
          html: `<strong>Standard ${standard.number}</strong><br>${standard.name}`
        },
        {
          html: createStatusTagHTML(standard.status)
        },
        {
          html: '<span class="govuk-hint govuk-!-font-size-14">No assessments</span>',
          attributes: {
            colspan: '2'
          }
        },
        {
          text: standard.lastUpdated
            ? new Date(standard.lastUpdated).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            : 'Not available'
        }
      ])
    }
  })

  return rows
}

/**
 * Transform delivery partners into table rows for GOV.UK table component
 * @param {Array} deliveryPartners - Array of delivery partner objects
 * @param {string} projectId - Project ID for constructing remove links
 * @returns {Array} Array of table row objects
 */
export function deliveryPartnerTableRows(deliveryPartners, projectId) {
  if (!Array.isArray(deliveryPartners)) {
    return []
  }

  return deliveryPartners.map((partner) => {
    return [
      {
        text: partner.name
      },
      {
        html: `<a href="/projects/${projectId}/manage/delivery-partners/${partner.id}/remove" class="govuk-link govuk-link--destructive">Remove</a>`
      }
    ]
  })
}
