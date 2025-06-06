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

export const NOTIFICATIONS = {
  NOT_FOUND: 'Project not found'
}

export const standardsController = {
  getStandards: async (request, h) => {
    const { id } = request.params

    try {
      const project = await getProjectById(id, request)
      if (!project) {
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Get service standards for reference
      const standards = await getServiceStandards(request)

      return h.view('projects/standards/views/list', {
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
            pageTitle: 'Project not found'
          })
          .code(404)
      }

      // Find the specific standard
      const standard = serviceStandards?.find((s) => s.id === standardId)
      if (!standard) {
        return h.redirect(`/projects/${id}?notification=Standard not found`)
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

      return h.view('projects/standards/views/detail', {
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
        return h.redirect(`/?notification=${NOTIFICATIONS.NOT_FOUND}`)
      }

      // Find the standard in standardsSummary
      const standard = project.standardsSummary?.find(
        (s) => s.standardId === standardId || s.StandardId === standardId
      )
      if (!standard) {
        return h.redirect(`/projects/${id}?notification=Standard not found`)
      }

      const history = await getStandardHistory(id, standardId, request)

      return h.view('projects/standards/views/history', {
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
            pageTitle: 'Project not found'
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

      return h.view('projects/standards/views/assessment', {
        assessment: null, // Always start with null for new assessments
        projectId: id,
        projectPhase: project.phase || 'Discovery',
        professionItems,
        standardItems,
        allStandards: JSON.stringify(serviceStandards || []),
        professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX)
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
            pageTitle: 'Project not found'
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

        return h.view('projects/standards/views/assessment', {
          assessment: null,
          projectId: id,
          projectPhase: project.phase || 'Discovery',
          professionItems,
          standardItems,
          selectedValues: { professionId, standardId, status, commentary },
          error: 'Please select a profession, service standard, and status',
          allStandards: JSON.stringify(serviceStandards || []),
          professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX)
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

          return h.view('projects/standards/views/assessment', {
            assessment: null,
            projectId: id,
            projectPhase: project.phase || 'Discovery',
            professionItems,
            standardItems,
            selectedValues: { professionId, standardId, status, commentary },
            error: `This profession cannot assess the selected standard in the ${project.phase} phase. Please select a different standard.`,
            allStandards: JSON.stringify(serviceStandards || []),
            professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX)
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
        'Assessment saved successfully'
      )

      // Redirect back to project page with success message
      return h.redirect(
        `/projects/${id}?notification=Assessment saved successfully`
      )
    } catch (error) {
      request.logger.error({ error }, 'Error saving assessment')

      // Check if this is the known backend update issue
      let errorMessage = 'Failed to save assessment. Please try again.'
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

      return h.view('projects/standards/views/assessment', {
        assessment: null,
        projectId: id,
        projectPhase: project?.phase || 'Discovery',
        professionItems,
        standardItems,
        selectedValues: { professionId, standardId, status, commentary },
        error: errorMessage,
        allStandards: JSON.stringify(serviceStandards || []),
        professionStandardMatrix: JSON.stringify(PROFESSION_STANDARD_MATRIX)
      })
    }
  },

  getAssessmentHistory: async (request, h) => {
    const { id, standardId, professionId } = request.params
    const { notification } = request.query

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
            pageTitle: 'Project not found'
          })
          .code(404)
      }

      // Find the specific standard and profession
      const standard = serviceStandards?.find((s) => s.id === standardId)
      const profession = professions?.find((p) => p.id === professionId)

      if (!standard) {
        return h.redirect(`/projects/${id}?notification=Standard not found`)
      }

      if (!profession) {
        return h.redirect(`/projects/${id}?notification=Profession not found`)
      }

      return h.view('projects/standards/views/assessment-history', {
        pageTitle: `${profession.name} Assessment History | Standard ${standard.number} | ${project.name}`,
        project,
        standard,
        profession,
        history: history || [],
        isAuthenticated: request.auth.isAuthenticated,
        notification
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
            pageTitle: 'Project not found'
          })
          .code(404)
      }

      // Find the specific standard and profession
      const standard = serviceStandards?.find((s) => s.id === standardId)
      const profession = professions?.find((p) => p.id === professionId)

      if (!standard || !profession) {
        return h.redirect(
          `/projects/${id}?notification=Standard or profession not found`
        )
      }

      // Find the specific history entry
      const historyEntry = history?.find((entry) => entry.id === historyId)
      if (!historyEntry) {
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=History entry not found`
        )
      }

      return h.view('projects/standards/views/archive-assessment', {
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
      if (returnTo === 'standard') {
        return h.redirect(
          `/projects/${id}/standards/${standardId}?notification=Assessment entry archived successfully`
        )
      } else {
        // Default to assessment history
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=Assessment entry archived successfully`
        )
      }
    } catch (error) {
      request.logger.error({ error }, 'Error archiving assessment entry')

      // Redirect back with error message
      if (returnTo === 'standard') {
        return h.redirect(
          `/projects/${id}/standards/${standardId}?notification=Failed to archive assessment entry`
        )
      } else {
        return h.redirect(
          `/projects/${id}/standards/${standardId}/professions/${professionId}/history?notification=Failed to archive assessment entry`
        )
      }
    }
  }
}
