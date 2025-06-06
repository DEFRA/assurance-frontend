/**
 * Project standards controller
 * @satisfies {Partial<ServerRoute>}
 */
import Boom from '@hapi/boom'
import {
  getProjectById,
  getStandardHistory,
  updateAssessment,
  getAssessmentHistory,
  archiveAssessmentHistoryEntry
} from '~/src/server/services/projects.js'
import { getServiceStandards } from '~/src/server/services/service-standards.js'
import { getProfessions } from '~/src/server/services/professions.js'
import {
  filterStandardsByProfessionAndPhase,
  PROFESSION_STANDARD_MATRIX
} from '~/src/server/services/profession-standard-matrix.js'
import {
  NOTIFICATIONS,
  VIEW_TEMPLATES
} from '~/src/server/constants/notifications.js'

export const NOTIFICATIONS_LEGACY = {
  NOT_FOUND: NOTIFICATIONS.PROJECT_NOT_FOUND
}

export const standardsController = {
  getStandards: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`)
      }

      // Get service standards for reference
      const standards = await getServiceStandards(request)

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_LIST, {
        pageTitle: `Standards Progress | ${project.name}`,
        project,
        standards
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getStandardDetail: async (request, h) => {
    const { id, standardId } = request.params
    const { notification } = request.query

    try {
      // Fetch project, professions and service standards
      const [project, professions, serviceStandards] = await Promise.all([
        getProjectById(id, request),
        getProfessions(request),
        getServiceStandards(request)
      ])

      if (!project) {
        return h
          .view('projects/not-found', {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Find the specific standard
      const standard = serviceStandards?.find((s) => s.id === standardId)
      if (!standard) {
        return h.redirect(
          `/projects/${id}?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
        )
      }

      // Find the standard summary in the project
      const standardSummary = project.standardsSummary?.find(
        (s) => s.standardId === standardId
      )

      // Get all profession assessments for this standard
      const professionAssessments = standardSummary?.professions || []

      // Map profession assessments with profession details and get most recent history ID
      const assessmentsWithDetails = await Promise.all(
        professionAssessments.map(async (assessment) => {
          const professionInfo = professions?.find(
            (p) => p.id === assessment.professionId
          )

          // Get the most recent history entry for this profession/standard combination
          let mostRecentHistoryId = null
          try {
            const history = await getAssessmentHistory(
              id,
              standardId,
              assessment.professionId,
              request
            )
            if (history && history.length > 0) {
              // Get the most recent non-archived entry
              const recentEntry = history.find((entry) => !entry.archived)
              mostRecentHistoryId = recentEntry?.id
            }
          } catch (error) {
            request.logger.warn(
              { error },
              'Could not fetch assessment history for archive link'
            )
          }

          return {
            ...assessment,
            professionName: professionInfo?.name || assessment.professionId,
            professionDisplayName:
              professionInfo?.name || `Profession ${assessment.professionId}`,
            mostRecentHistoryId
          }
        })
      )

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_DETAIL, {
        pageTitle: `Standard ${standard.number} | ${project.name}`,
        project,
        standard,
        standardSummary,
        assessments: assessmentsWithDetails,
        isAuthenticated: request.auth.isAuthenticated,
        notification
      })
    } catch (error) {
      request.logger.error({ error }, 'Error loading standard detail')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getStandardHistory: async (request, h) => {
    const { id, standardId } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.PROJECT_NOT_FOUND}`)
      }

      // Find the standard in standardsSummary
      const standard = project.standardsSummary?.find(
        (s) => s.standardId === standardId || s.StandardId === standardId
      )
      if (!standard) {
        return h.redirect(
          `/projects/${id}?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
        )
      }

      const history = await getStandardHistory(id, standardId, request)

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_HISTORY, {
        pageTitle: `Standard ${standardId} History | ${project.name}`,
        heading: `Standard ${standardId} History`,
        project,
        standard,
        history
      })
    } catch (error) {
      request.logger.error(error)
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getAssessmentScreen: async (request, h) => {
    const { id } = request.params

    try {
      // Fetch project, professions and service standards
      const [project, professions, serviceStandards] = await Promise.all([
        getProjectById(id, request),
        getProfessions(request),
        getServiceStandards(request)
      ])

      if (!project) {
        return h
          .view('projects/not-found', {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Transform data for dropdowns
      const professionItems = [
        { value: '', text: 'Choose a profession' }
      ].concat(
        (professions || []).map((profession) => ({
          value: profession.id,
          text: profession.name
        }))
      )

      // Initially show all standards, will be filtered by JavaScript
      const standardItems = [
        { value: '', text: 'Choose a service standard' }
      ].concat(
        (serviceStandards || []).map((standard) => ({
          value: standard.id,
          text: `${standard.number}. ${standard.name}`
        }))
      )

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT, {
        pageTitle: `Assess Standards | ${project.name}`,
        project,
        projectId: project.id,
        projectPhase: project.phase || '',
        allStandards: JSON.stringify(serviceStandards || []),
        professionItems,
        standardItems,
        statusOptions: [
          { value: '', text: 'Choose a status' },
          { value: 'GREEN', text: 'Green' },
          { value: 'GREEN_AMBER', text: 'Green Amber' },
          { value: 'AMBER', text: 'Amber' },
          { value: 'AMBER_RED', text: 'Amber Red' },
          { value: 'RED', text: 'Red' },
          { value: 'TBC', text: 'TBC' }
        ],
        professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX),
        values: {},
        errors: {}
      })
    } catch (error) {
      request.logger.error({ error }, 'Error loading assessment screen')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postAssessmentScreen: async (request, h) => {
    const { id } = request.params
    const { professionId, standardId, status, commentary } = request.payload

    try {
      // Get project to validate phase and profession combination
      const project = await getProjectById(id, request)
      if (!project) {
        return h
          .view('projects/not-found', {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Validate required fields
      if (!professionId || !standardId || !status) {
        // Get data for dropdowns when showing errors
        const [professions, serviceStandards] = await Promise.all([
          getProfessions(request),
          getServiceStandards(request)
        ])

        const professionItems = [
          { value: '', text: 'Choose a profession' }
        ].concat(
          (professions || []).map((profession) => ({
            value: profession.id,
            text: profession.name,
            selected: profession.id === professionId
          }))
        )

        // Filter standards based on selected profession and project phase
        let filteredStandards = serviceStandards || []
        if (professionId && project.phase) {
          filteredStandards = filterStandardsByProfessionAndPhase(
            serviceStandards,
            project.phase,
            professionId
          )
        }

        const standardItems = [
          { value: '', text: 'Choose a service standard' }
        ].concat(
          filteredStandards.map((standard) => ({
            value: standard.id,
            text: `${standard.number}. ${standard.name}`,
            selected: standard.id === standardId
          }))
        )

        return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT, {
          pageTitle: `Assess Standards | ${project.name}`,
          project,
          projectId: project.id,
          projectPhase: project.phase || '',
          allStandards: JSON.stringify(serviceStandards || []),
          professionItems,
          standardItems,
          selectedValues: { professionId, standardId, status, commentary },
          error: 'Please select a profession, service standard, and status',
          statusOptions: [
            { value: '', text: 'Choose a status' },
            { value: 'GREEN', text: 'Green' },
            { value: 'GREEN_AMBER', text: 'Green Amber' },
            { value: 'AMBER', text: 'Amber' },
            { value: 'AMBER_RED', text: 'Amber Red' },
            { value: 'RED', text: 'Red' },
            { value: 'TBC', text: 'TBC' }
          ],
          professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX),
          values: {},
          errors: {}
        })
      }

      // Additional validation: Check if the profession can assess this standard in this phase
      const serviceStandards = await getServiceStandards(request)
      const selectedStandard = serviceStandards?.find(
        (s) => s.id === standardId
      )

      if (selectedStandard && project.phase) {
        const filteredStandards = filterStandardsByProfessionAndPhase(
          serviceStandards,
          project.phase,
          professionId
        )

        const isValidCombination = filteredStandards.some(
          (s) => s.id === standardId
        )

        if (!isValidCombination) {
          const [professions] = await Promise.all([getProfessions(request)])

          const professionItems = [
            { value: '', text: 'Choose a profession' }
          ].concat(
            (professions || []).map((profession) => ({
              value: profession.id,
              text: profession.name,
              selected: profession.id === professionId
            }))
          )

          const standardItems = [
            { value: '', text: 'Choose a service standard' }
          ].concat(
            filteredStandards.map((standard) => ({
              value: standard.id,
              text: `${standard.number}. ${standard.name}`,
              selected: standard.id === standardId
            }))
          )

          return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT, {
            pageTitle: `Assess Standards | ${project.name}`,
            project,
            projectId: project.id,
            projectPhase: project.phase || '',
            allStandards: JSON.stringify(serviceStandards || []),
            professionItems,
            standardItems,
            selectedValues: { professionId, standardId, status, commentary },
            error: `This profession cannot assess the selected standard in the ${project.phase} phase. Please select a different standard.`,
            statusOptions: [
              { value: '', text: 'Choose a status' },
              { value: 'GREEN', text: 'Green' },
              { value: 'GREEN_AMBER', text: 'Green Amber' },
              { value: 'AMBER', text: 'Amber' },
              { value: 'AMBER_RED', text: 'Amber Red' },
              { value: 'RED', text: 'Red' },
              { value: 'TBC', text: 'TBC' }
            ],
            professionStandardMatrix: JSON.stringify(
              PROFESSION_STANDARD_MATRIX
            ),
            values: {},
            errors: {}
          })
        }
      }

      // Save the assessment
      await updateAssessment(
        id,
        standardId,
        professionId,
        {
          status,
          commentary: commentary || ''
        },
        request
      )

      request.logger.info(
        { projectId: id, standardId, professionId },
        NOTIFICATIONS.ASSESSMENT_SAVED_SUCCESSFULLY
      )

      // Redirect back to project page with success message
      return h.redirect(
        `/projects/${id}?notification=${NOTIFICATIONS.ASSESSMENT_SAVED_SUCCESSFULLY}`
      )
    } catch (error) {
      request.logger.error({ error }, 'Error saving assessment')

      let errorMessage = NOTIFICATIONS.FAILED_TO_SAVE_ASSESSMENT

      // Check if this is the known backend update issue
      if (
        error.message?.includes('Internal Server Error') ||
        error.message?.includes('500')
      ) {
        errorMessage =
          'Unable to update existing assessment - this is a known backend issue. New assessments work correctly.'
      }

      // Get data for dropdowns when showing errors
      const [project, professions, serviceStandards] = await Promise.all([
        getProjectById(id, request),
        getProfessions(request),
        getServiceStandards(request)
      ])

      const professionItems = [
        { value: '', text: 'Choose a profession' }
      ].concat(
        (professions || []).map((profession) => ({
          value: profession.id,
          text: profession.name,
          selected: profession.id === professionId
        }))
      )

      // Filter standards based on selected profession and project phase
      let filteredStandards = serviceStandards || []
      if (professionId && project?.phase) {
        filteredStandards = filterStandardsByProfessionAndPhase(
          serviceStandards,
          project.phase,
          professionId
        )
      }

      const standardItems = [
        { value: '', text: 'Choose a service standard' }
      ].concat(
        filteredStandards.map((standard) => ({
          value: standard.id,
          text: `${standard.number}. ${standard.name}`,
          selected: standard.id === standardId
        }))
      )

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT, {
        pageTitle: `Assess Standards | ${project.name}`,
        project,
        projectId: project.id,
        projectPhase: project.phase || '',
        allStandards: JSON.stringify(serviceStandards || []),
        professionItems,
        standardItems,
        selectedValues: { professionId, standardId, status, commentary },
        error: errorMessage,
        statusOptions: [
          { value: '', text: 'Choose a status' },
          { value: 'GREEN', text: 'Green' },
          { value: 'GREEN_AMBER', text: 'Green Amber' },
          { value: 'AMBER', text: 'Amber' },
          { value: 'AMBER_RED', text: 'Amber Red' },
          { value: 'RED', text: 'Red' },
          { value: 'TBC', text: 'TBC' }
        ],
        professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX),
        values: {},
        errors: {}
      })
    }
  },

  getAssessmentHistory: async (request, h) => {
    const { id, standardId, professionId } = request.params

    try {
      // Fetch project, profession info, standard info, and history
      const [project, professions, serviceStandards, history] =
        await Promise.all([
          getProjectById(id, request),
          getProfessions(request),
          getServiceStandards(request),
          getAssessmentHistory(id, standardId, professionId, request)
        ])

      if (!project) {
        return h
          .view('projects/not-found', {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Find the specific standard and profession
      const standard = serviceStandards?.find((s) => s.id === standardId)
      const profession = professions?.find((p) => p.id === professionId)

      if (!standard) {
        return h.redirect(
          `/projects/${id}?notification=${NOTIFICATIONS.STANDARD_NOT_FOUND}`
        )
      }

      if (!profession) {
        return h.redirect(
          `/projects/${id}?notification=${NOTIFICATIONS.PROFESSION_NOT_FOUND}`
        )
      }

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ASSESSMENT_HISTORY, {
        pageTitle: `${profession.name} Assessment History | Standard ${standard.number} | ${project.name}`,
        project,
        standard,
        profession,
        history
      })
    } catch (error) {
      request.logger.error({ error }, 'Error loading assessment history')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  getArchiveAssessment: async (request, h) => {
    const { id, standardId, professionId, historyId } = request.params

    try {
      // Fetch project, profession info, standard info, and history
      const [project, professions, serviceStandards, history] =
        await Promise.all([
          getProjectById(id, request),
          getProfessions(request),
          getServiceStandards(request),
          getAssessmentHistory(id, standardId, professionId, request)
        ])

      if (!project) {
        return h
          .view('projects/not-found', {
            pageTitle: NOTIFICATIONS.PROJECT_NOT_FOUND
          })
          .code(404)
      }

      // Find the specific standard and profession
      const standard = serviceStandards?.find((s) => s.id === standardId)
      const profession = professions?.find((p) => p.id === professionId)

      if (!standard || !profession) {
        return h.redirect(
          `/projects/${id}?notification=${NOTIFICATIONS.STANDARD_OR_PROFESSION_NOT_FOUND}`
        )
      }

      // Find the specific history entry
      const historyEntry = history?.find((entry) => entry.id === historyId)
      if (!historyEntry) {
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=${NOTIFICATIONS.HISTORY_ENTRY_NOT_FOUND}`
        )
      }

      return h.view(VIEW_TEMPLATES.PROJECTS_STANDARDS_ARCHIVE_ASSESSMENT, {
        pageTitle: `Archive Assessment | ${profession.name} | Standard ${standard.number} | ${project.name}`,
        project,
        standard,
        profession,
        historyEntry
      })
    } catch (error) {
      request.logger.error({ error }, 'Error loading archive assessment page')
      throw Boom.boomify(error, { statusCode: 500 })
    }
  },

  postArchiveAssessment: async (request, h) => {
    const { id, standardId, professionId, historyId } = request.params
    const { returnTo } = request.query || {}

    try {
      // Archive the assessment history entry
      await archiveAssessmentHistoryEntry(
        id,
        standardId,
        professionId,
        historyId,
        request
      )

      // Redirect based on where the user came from
      if (returnTo === 'detail') {
        return h.redirect(
          `/projects/${id}/standards/${standardId}?notification=${NOTIFICATIONS.ASSESSMENT_ARCHIVED_SUCCESSFULLY}`
        )
      } else {
        // Default redirect to assessment history page
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=${NOTIFICATIONS.ASSESSMENT_ARCHIVED_SUCCESSFULLY}`
        )
      }
    } catch (error) {
      request.logger.error({ error }, 'Error archiving assessment entry')

      // Redirect back with error message based on context
      if (returnTo === 'detail') {
        return h.redirect(
          `/projects/${id}/standards/${standardId}?notification=${NOTIFICATIONS.FAILED_TO_ARCHIVE_ASSESSMENT}`
        )
      } else {
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=${NOTIFICATIONS.FAILED_TO_ARCHIVE_ASSESSMENT}`
        )
      }
    }
  }
}
