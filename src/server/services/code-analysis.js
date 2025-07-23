import { logger } from '~/src/server/common/helpers/logging/logger.js'

// Code Analysis API configuration
const CODE_ANALYSIS_API_BASE_URL = 'http://host.docker.internal:8086'
const CODE_ANALYSIS_ENDPOINT = '/api/v1/code-checker/combined-check'
const HEALTH_ENDPOINT = '/api/v1/code-checker/health'

/**
 * Analyze a repository using the external code analysis API
 * @param {string} repoUrl - The repository URL to analyze
 * @param {object} options - Analysis options
 * @param {number} options.daysToCheck - Number of days to check for activity (default: 30)
 * @param {string} options.githubToken - GitHub token for private repositories (optional)
 * @param {Array} options.configFiles - Custom configuration files to use (optional)
 * @param {boolean} options.cleanupClone - Whether to cleanup cloned repository after analysis (default: true)
 * @param {object} request - The Hapi request object for logging context
 * @returns {Promise<object>} The code analysis results
 */
export async function analyzeRepository(repoUrl, options = {}, request) {
  try {
    request.logger.info(
      { repoUrl, options },
      'Starting code analysis for repository'
    )

    const apiUrl = `${CODE_ANALYSIS_API_BASE_URL}${CODE_ANALYSIS_ENDPOINT}`

    // Prepare the request payload according to CombinedCheckRequest schema
    const payload = {
      repo_url: repoUrl,
      days_to_check: options.daysToCheck ?? 30,
      github_token: options.githubToken ?? null,
      config_files: options.configFiles ?? null,
      cleanup_clone: options.cleanupClone !== false // Default to true unless explicitly false
    }

    request.logger.info(
      {
        apiUrl,
        payload: {
          ...payload,
          github_token: payload.github_token ? '[REDACTED]' : null
        }
      },
      'Calling code analysis API'
    )

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      // Set a reasonable timeout for the analysis (code analysis can take time)
      timeout: 120000 // 2 minutes
    })

    if (!response.ok) {
      const errorText = await response.text()
      request.logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          errorText,
          repoUrl
        },
        'Code analysis API returned error response'
      )

      throw new Error(
        `Code analysis API error: ${response.status} ${response.statusText}`
      )
    }

    const results = await response.json()

    request.logger.info(
      {
        repoUrl,
        hasResults: !!results,
        status: results.status,
        timestamp: results.timestamp,
        errorCount: results.errors?.length || 0
      },
      'Code analysis completed successfully'
    )

    return results
  } catch (error) {
    request.logger.error(
      {
        error: error.message,
        stack: error.stack,
        repoUrl
      },
      'Failed to analyze repository'
    )

    // Re-throw with a more user-friendly message
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new Error(
        `Code analysis timed out for repository "${repoUrl}". The repository may be too large or the service may be busy.`
      )
    }

    throw new Error(
      `Unable to analyze repository "${repoUrl}": ${error.message}`
    )
  }
}

/**
 * Check if the code analysis service is available
 * @param {object} request - The Hapi request object for logging context
 * @returns {Promise<boolean>} True if the service is available, false otherwise
 */
export async function isCodeAnalysisServiceAvailable(request) {
  try {
    const healthUrl = `${CODE_ANALYSIS_API_BASE_URL}${HEALTH_ENDPOINT}`

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 seconds

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const isAvailable = response.ok
    request.logger.info(
      { isAvailable, status: response.status },
      'Code analysis service availability check'
    )

    return isAvailable
  } catch (error) {
    request.logger.warn(
      {
        error: error.message
      },
      'Code analysis service health check failed'
    )

    return false
  }
}

/**
 * Extract repository URL from project data
 * @param {object} project - The project object
 * @returns {string|null} The repository URL if available, null otherwise
 */
export function extractRepositoryUrl(project) {
  if (!project) {
    return null
  }

  // Check common patterns for repository URL in project data
  // This will need to be adjusted based on your actual project data structure

  // Check if there's a direct repository URL field
  if (project.repositoryUrl) {
    return project.repositoryUrl
  }

  if (project.repoUrl) {
    return project.repoUrl
  }

  if (project.gitUrl) {
    return project.gitUrl
  }

  // Check if repository information is in a nested object
  if (project.repository?.url) {
    return project.repository.url
  }

  // Check if project name follows GitHub naming convention and can be converted to URL
  if (project.name?.includes('/')) {
    // Assume format like "owner/repo-name"
    return `https://github.com/${project.name}`
  }

  // Check if defCode could be used to construct a GitHub URL (if following a pattern)
  if (project.defCode && typeof project.defCode === 'string') {
    // This would need to be customized based on your organization's naming conventions
    // For now, return null as we don't know the pattern
  }

  logger.warn(
    {
      projectId: project.id,
      projectName: project.name,
      availableFields: Object.keys(project)
    },
    'Could not extract repository URL from project data'
  )

  return null
}
