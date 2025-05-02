import * as client from 'openid-client'
import { config } from '../../config/config.js'
import { URL } from 'url'
import crypto from 'node:crypto'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { createSession } from '~/src/server/common/helpers/session-manager.js'

const logger = createLogger()

/**
 * Handles the OAuth callback at /auth
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const auth = async (request, h) => {
  try {
    // If this is a callback from Azure AD
    if (request.query.code) {
      try {
        // Get stored state and redirect URL
        const storedState = request.state.auth_state
        const redirectTo = request.state.redirect_to || '/'

        if (storedState && storedState !== request.query.state) {
          throw new Error('State mismatch')
        }

        // Get OAuth parameters from config
        const clientId = config.get('azure.clientId')
        const clientSecret = config.get('azure.clientSecret')
        const tenantId = config.get('azure.tenantId')
        const callbackUrl = config.get('azure.callbackUrl')

        // Create OIDC client if not already available
        let oidcClient = request.server.app.oidcClient
        if (!oidcClient) {
          const issuer = new client.Issuer({
            issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
            authorization_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
            token_endpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            jwks_uri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
          })

          oidcClient = new issuer.Client({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uris: [callbackUrl],
            response_types: ['code']
          })

          request.server.app.oidcClient = oidcClient
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
            name: claims.name,
            roles: ['admin']
          },
          token: tokenSet.access_token,
          expires: Date.now() + (tokenSet.expires_in || 3600) * 1000
        }

        // Create session and get session ID
        const { id, token } = await createSession(request, sessionData)

        // Create response
        const response = h.redirect(redirectTo || '/')

        // Set the session cookie using cookieAuth
        request.cookieAuth.set({ id, token })

        // Clear auth state cookies
        response.unstate('auth_state')
        response.unstate('redirect_to')

        return response
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

    // Create response
    const response = h.redirect('https://login.microsoftonline.com')

    // Set auth state cookies
    response.state('auth_state', state)
    response.state('redirect_to', redirectPath)

    // Build auth URL
    const authUrl = new URL('https://login.microsoftonline.com')
    authUrl.pathname = `/${config.get('azure.tenantId')}/oauth2/v2.0/authorize`
    authUrl.searchParams.append('client_id', config.get('azure.clientId'))
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('redirect_uri', config.get('azure.callbackUrl'))
    const apiClientId = config.get('azure.clientId')
    authUrl.searchParams.append(
      'scope',
      `openid profile email api://${apiClientId}/access_as_user`
    )
    authUrl.searchParams.append('state', state)

    response.header('location', authUrl.toString())
    return response
  } catch (error) {
    logger.error('Auth error:', error)
    return h.view('common/templates/error', {
      title: 'Authentication Error',
      message: 'There was a problem with the authentication process'
    })
  }
}

/**
 * Handles logout
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export const logout = async (request, h) => {
  try {
    // Get the session data from cookieAuth
    const session = request.cookieAuth.get()

    // Create response
    const response = h.redirect('/')

    // Clear server-side cache if we have a session ID
    if (session?.id) {
      await request.server.app.cache.drop(session.id)
    }

    // Clear any cached tokens
    if (session?.token) {
      await request.server.app.cache.drop(session.token)
    }

    // Clear all cookies with proper settings
    response.state('sid', '', {
      ttl: 0,
      isSecure: config.get('session.cookie.secure'),
      isHttpOnly: true,
      path: '/',
      clearInvalid: true,
      strictHeader: false
    })

    // Clear auth state cookies
    response.unstate('auth_state')
    response.unstate('redirect_to')

    // Clear cookieAuth last
    request.cookieAuth.clear()

    // Add headers to prevent caching
    response.header(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    response.header('Pragma', 'no-cache')
    response.header('Expires', '0')

    return response
  } catch (error) {
    logger.error('Logout error:', error.message)
    return h.redirect('/')
  }
}
