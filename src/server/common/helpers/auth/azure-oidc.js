import Boom from '@hapi/boom'

/**
 * Get Azure AD OIDC authentication URL
 * @param {import('@hapi/hapi').Request} request
 * @returns {Promise<string>}
 */
export const getAzureOidcAuthUrl = (request) => {
  const { server } = request
  const auth = server.auth.lookup('azure-oidc')

  if (!auth) {
    throw Boom.internal('Azure OIDC strategy not configured')
  }

  return auth.authenticate(request)
}

/**
 * Get user info from Azure AD OIDC token
 * @param {import('@hapi/hapi').Request} request
 * @returns {Promise<object>}
 */
export const getAzureOidcUserInfo = async (request) => {
  const { server } = request
  const auth = server.auth.lookup('azure-oidc')

  if (!auth) {
    throw Boom.internal('Azure OIDC strategy not configured')
  }

  try {
    const { credentials } = await auth.authenticate(request)
    return credentials.profile
  } catch (error) {
    request.logger.error({ error }, 'Failed to get Azure OIDC user info')
    throw Boom.unauthorized('Authentication failed')
  }
}
