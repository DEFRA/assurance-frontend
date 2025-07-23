import Boom from '@hapi/boom'
import {
  analyzeRepository,
  isCodeAnalysisServiceAvailable
} from '~/src/server/services/code-analysis.js'
import {
  VIEW_TEMPLATES,
  DDTS_ASSURANCE_SUFFIX
} from '~/src/server/constants/notifications.js'
import { statusCodes } from '~/src/server/common/constants/status-codes.js'

export const codeAnalysisController = {
  getIndex: async (request, h) => {
    try {
      // Check if code analysis service is available
      const serviceAvailable = await isCodeAnalysisServiceAvailable(request)

      return h.view(VIEW_TEMPLATES.CODE_ANALYSIS_INDEX, {
        pageTitle: `Code Analysis${DDTS_ASSURANCE_SUFFIX}`,
        heading: 'Code Analysis',
        serviceAvailable
      })
    } catch (error) {
      request.logger.error({ error }, 'Error fetching code analysis dashboard')
      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  },

  postAnalysis: async (request, h) => {
    const { repositoryUrl } = request.payload

    try {
      if (!repositoryUrl) {
        return h.view(VIEW_TEMPLATES.CODE_ANALYSIS_INDEX, {
          pageTitle: `Code Analysis${DDTS_ASSURANCE_SUFFIX}`,
          heading: 'Code Analysis',
          serviceAvailable: await isCodeAnalysisServiceAvailable(request),
          error: 'Please provide a repository URL'
        })
      }

      // Start the analysis
      request.logger.info({ repositoryUrl }, 'Starting manual code analysis')

      let analysisResults = null
      let analysisError = null

      try {
        analysisResults = await analyzeRepository(
          repositoryUrl,
          {
            daysToCheck: 30,
            githubToken: null,
            configFiles: null,
            cleanupClone: true
          },
          request
        )

        request.logger.info(
          { repositoryUrl, status: analysisResults.status },
          'Code analysis completed'
        )
      } catch (error) {
        request.logger.error({ error, repositoryUrl }, 'Code analysis failed')
        analysisError = error.message
      }

      try {
        return h.view(VIEW_TEMPLATES.CODE_ANALYSIS_INDEX, {
          pageTitle: `Code Analysis${DDTS_ASSURANCE_SUFFIX}`,
          heading: 'Code Analysis',
          serviceAvailable: await isCodeAnalysisServiceAvailable(request),
          repositoryUrl,
          analysisResults,
          analysisError
        })
      } catch (templateError) {
        request.logger.error(
          { error: templateError, repositoryUrl },
          'Template rendering error'
        )

        // Provide a graceful fallback for template errors
        return h.view(VIEW_TEMPLATES.CODE_ANALYSIS_INDEX, {
          pageTitle: `Code Analysis${DDTS_ASSURANCE_SUFFIX}`,
          heading: 'Code Analysis',
          serviceAvailable: await isCodeAnalysisServiceAvailable(request),
          repositoryUrl,
          analysisResults: null,
          analysisError:
            'There was an issue displaying the analysis results. Please try again or contact support if the problem persists.'
        })
      }
    } catch (error) {
      request.logger.error(
        { error, repositoryUrl },
        'Error in code analysis or template rendering'
      )

      // If it's a template error, provide a graceful fallback
      if (error.message?.includes('Template render error')) {
        return h.view(VIEW_TEMPLATES.CODE_ANALYSIS_INDEX, {
          pageTitle: `Code Analysis${DDTS_ASSURANCE_SUFFIX}`,
          heading: 'Code Analysis',
          serviceAvailable: await isCodeAnalysisServiceAvailable(request),
          repositoryUrl,
          analysisResults: null,
          analysisError:
            'There was an issue displaying the analysis results. Please try again or contact support if the problem persists.'
        })
      }

      throw Boom.boomify(error, { statusCode: statusCodes.internalServerError })
    }
  }
}
