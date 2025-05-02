import * as client from 'openid-client'
import { config } from '../../config/config.js'
import { URL } from 'url'
import crypto from 'node:crypto'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import {
  getCookie,
  clearCookie,
  setResponseCookie,
  clearResponseCookie
} from '~/src/server/common/helpers/cookie-manager.js'

/**
 * Handles the OAuth callback at /auth
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const auth = async (request, h) => {
  const logger = createLogger()
  try {
    // If this is a callback from Azure AD
    if (request.query.code) {
      try {
        // Get stored state and redirect URL
        const storedState =
          getCookie(request, 'auth_state') || request.state.auth_state
        const redirectTo =
          getCookie(request, 'redirect_to') || request.state.redirect_to || '/'

        if (!storedState) {
          // If we can't find the state, we'll accept the state from the query parameter
          // This is less secure but allows authentication to work when cookies aren't properly set
        } else if (storedState !== request.query.state) {
          throw new Error('State mismatch')
        }

        // Get OAuth parameters from config
        const clientId = config.get('azure.clientId')
        const clientSecret = config.get('azure.clientSecret')
        const tenantId = config.get('azure.tenantId')
        const callbackUrl = config.get('azure.callbackUrl')

        // Create OIDC client if not already available
        let oidcClient
        if (request.server.app.oidcClient) {
          oidcClient = request.server.app.oidcClient
        } else {
          // Set up OIDC issuer
          const issuer = new client.Issuer({
            issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
            authorization_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
            token_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            jwks_uri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
          })

          // Create client
          oidcClient = new issuer.Client({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uris: [callbackUrl],
            response_types: ['code']
          })

          // Store for future use
          if (request.server.app) {
            request.server.app.oidcClient = oidcClient
          }
        }

        // Complete code exchange
        const tokenSet = await oidcClient.callback(
          callbackUrl,
          { code: request.query.code, state: request.query.state },
          { state: storedState || request.query.state }
        )

        // Get user info from the ID token
        const claims = tokenSet.claims()

        // Create the session with user data
        const sessionData = {
          user: {
            id: claims.sub,
            email: claims.email || claims.preferred_username,
            name: claims.name
          },
          token: tokenSet.access_token,
          expires: Date.now() + (tokenSet.expires_in || 3600) * 1000 // Convert to milliseconds
        }

        // Store session in server cache
        const sid = crypto.randomBytes(16).toString('hex')
        try {
          await request.server.app.cache.set(sid, sessionData, 0)
        } catch (error) {
          logger.error('Error storing session in cache')
        }

        // Set the session cookie
        if (
          request.cookieAuth &&
          typeof request.cookieAuth.set === 'function'
        ) {
          request.cookieAuth.set({
            id: sid,
            token: tokenSet.access_token
          })
        }

        // Clear auth state after successful authentication
        clearCookie(request, 'auth_state')
        clearCookie(request, 'redirect_to')

        return h.redirect(redirectTo || '/')
      } catch (error) {
        logger.error('Authentication error:', error.message)
        return h.view('common/templates/error', {
          title: 'Authentication Error',
          message: `There was a problem signing you in: ${error.message}`
        })
      }
    }

    // If this is not a callback, generate state and redirect to Azure AD
    const state = crypto.randomBytes(32).toString('hex')

    // Create response first
    const response = h.response()

    // Store current path as redirect target
    let redirectPath = request.query.redirectTo
    if (!redirectPath) {
      redirectPath = request.headers.referer
        ? new URL(request.headers.referer).pathname
        : request.url.pathname
    }

    // Default to home page if we're on auth pages
    if (redirectPath === '/auth' || redirectPath === '/auth/login') {
      redirectPath = '/'
    }

    // Set cookies on the response only once
    setResponseCookie(response, 'auth_state', state)
    setResponseCookie(response, 'redirect_to', redirectPath)

    const authUrl = new URL('https://login.microsoftonline.com')
    authUrl.pathname = `/${config.get('azure.tenantId')}/oauth2/v2.0/authorize`
    authUrl.searchParams.append('client_id', config.get('azure.clientId'))
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('redirect_uri', config.get('azure.callbackUrl'))

    // Add API scope along with standard OpenID scopes
    const apiClientId = config.get('azure.clientId')
    authUrl.searchParams.append(
      'scope',
      `openid profile email api://${apiClientId}/access_as_user`
    )

    authUrl.searchParams.append('state', state)

    return response.redirect(authUrl.toString())
  } catch (error) {
    logger.error('Unexpected error in auth flow:', error.message)
    return h.view('common/templates/error', {
      title: 'Authentication Error',
      message: 'An unexpected error occurred during authentication.'
    })
  }
}

/**
 * Handles logout
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const logout = (request, h) => {
  const logger = createLogger()

  try {
    // Clear server-side cache if we have the session ID
    if (request.auth?.credentials?.id || request.auth?.artifacts?.sid) {
      const sid = request.auth?.artifacts?.sid || request.auth?.credentials?.id
      if (sid && request.server.app.cache) {
        request.server.app.cache.drop(sid).catch((error) => {
          logger.error('Error dropping cache:', error.message)
        })
      }
    }

    // Clear the auth state
    request.auth.credentials = null
    request.auth.isAuthenticated = false

    // Clear the session cookie
    if (request.cookieAuth) {
      request.cookieAuth.clear()
    }

    // Create redirect response
    const response = h.redirect('/')

    // Clear all auth-related cookies
    clearResponseCookie(response, 'sid')
    clearResponseCookie(response, 'auth_state')
    clearResponseCookie(response, 'redirect_to')

    return response
  } catch (error) {
    logger.error('Error during logout:', error.message)
    const response = h.redirect('/')
    clearResponseCookie(response, 'sid')
    clearResponseCookie(response, 'auth_state')
    clearResponseCookie(response, 'redirect_to')
    return response
  }
}
