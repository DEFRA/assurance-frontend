/**
 * Table row filters for GOV.UK table components
 */

/**
 * Create status tag HTML for JavaScript contexts
 * @param {string} status - Status value
 * @returns {string} HTML string for status tag
 */
function createStatusTagHTML(status) {
  const statusClassMap = {
    GREEN: 'govuk-tag--green',
    GREEN_AMBER: 'govuk-tag--green govuk-tag--yellow',
    AMBER: 'govuk-tag--yellow',
    AMBER_RED: 'govuk-tag--yellow govuk-tag--red',
    RED: 'govuk-tag--red',
    TBC: 'govuk-tag--grey'
  }

  const statusLabelMap = {
    GREEN: 'GREEN',
    GREEN_AMBER: 'GREEN',
    AMBER: 'AMBER',
    AMBER_RED: 'AMBER',
    RED: 'RED',
    TBC: 'TBC'
  }

  if (status === 'AMBER_RED') {
    return `<span class="app-tag-list">
      <strong class="govuk-tag govuk-tag--yellow govuk-tag--uppercase">AMBER</strong>
      <strong class="govuk-tag govuk-tag--red govuk-tag--uppercase">RED</strong>
    </span>`
  } else if (status === 'GREEN_AMBER') {
    return `<span class="app-tag-list">
      <strong class="govuk-tag govuk-tag--green govuk-tag--uppercase">GREEN</strong>
      <strong class="govuk-tag govuk-tag--yellow govuk-tag--uppercase">AMBER</strong>
    </span>`
  } else if (status === 'TBC') {
    return `<strong class="govuk-tag govuk-tag--grey govuk-tag--uppercase">TBC</strong>`
  } else if (statusClassMap[status] && statusLabelMap[status]) {
    return `<strong class="govuk-tag ${statusClassMap[status]} govuk-tag--uppercase">${statusLabelMap[status]}</strong>`
  } else {
    return `<strong class="govuk-tag govuk-tag--grey govuk-tag--uppercase">TBC</strong>`
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
