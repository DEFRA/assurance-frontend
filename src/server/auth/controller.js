import * as client from 'openid-client'
import { config } from '../../config/config.js'
import { URL } from 'url'
import crypto from 'crypto'

/**
 * Log a message to stdout with timestamp
 * @param {string} message
 * @param {object} [data]
 */
const log = (message, data = {}) => {
  const timestamp = new Date().toISOString()
  const logData = JSON.stringify({ timestamp, message, ...data })
  process.stdout.write(`${logData}\n`)
}

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
        log('Received auth code from Azure AD', {
          code: request.query.code,
          state: request.query.state,
          session_state: request.query.session_state
        })

        // Get stored state and redirect URL before clearing
        const storedState = request.cookieAuth?.get?.('auth_state')
        const redirectTo = request.cookieAuth?.get?.('redirect_to')

        log('Stored session data', {
          storedState,
          redirectTo
        })

        if (!storedState) {
          throw new Error('Missing state in session')
        }

        // Verify state matches
        if (storedState !== request.query.state) {
          throw new Error('State mismatch')
        }

        // Exchange the code for tokens
        log('Attempting to exchange code for tokens')
        const tokens = await client.authorizationCodeGrant(
          request.server.app.oidcConfig,
          new URL(request.url.href),
          {
            expectedState: storedState,
            idTokenExpected: true,
            client_id: request.server.app.config.azure.clientId,
            client_secret: request.server.app.config.azure.clientSecret
          }
        )

        log('Token exchange successful', {
          access_token: tokens.access_token,
          id_token: tokens.id_token,
          expires_in: tokens.expires_in
        })

        // Get user info from the ID token
        const claims = tokens.claims()
        log('Successfully retrieved user info', {
          id: claims.sub,
          email: claims.email || claims.preferred_username,
          name: claims.name
        })

        // Clear all auth-related session data first
        if (request.cookieAuth?.get?.('auth_state')) {
          request.cookieAuth.clear('auth_state')
        }
        if (request.cookieAuth?.get?.('redirect_to')) {
          request.cookieAuth.clear('redirect_to')
        }

        // Create the session with user data
        const sessionData = {
          user: {
            id: claims.sub,
            email: claims.email || claims.preferred_username,
            name: claims.name
          },
          expires: Date.now() + tokens.expires_in * 1000 // Convert to milliseconds
        }

        // Set the session cookie
        if (request.cookieAuth?.set) {
          request.cookieAuth.set(sessionData)
        }

        // Create response with redirect
        const response = h.redirect(redirectTo || '/')

        // Get cookie settings from config
        const cookiePassword = config.get('session.cookie.password')
        const isSecure = config.get('session.cookie.secure')
        const ttl = config.get('session.cookie.ttl')

        // Ensure cookie is included in response with proper settings
        response.state('session', sessionData, {
          ttl,
          isSecure,
          isHttpOnly: true,
          path: '/',
          encoding: 'iron',
          password: cookiePassword
        })

        // Set auth credentials for the current request
        request.auth.credentials = sessionData
        request.auth.isAuthenticated = true

        log('Session and auth state set successfully, redirecting to', {
          redirectTo: redirectTo || '/',
          isAuthenticated: request.auth.isAuthenticated
        })

        return response
      } catch (error) {
        // Clear all auth-related session data on error
        if (request.cookieAuth?.get?.('auth_state')) {
          request.cookieAuth.clear('auth_state')
        }
        if (request.cookieAuth?.get?.('redirect_to')) {
          request.cookieAuth.clear('redirect_to')
        }

        log('Authentication error details', {
          message: error.message,
          stack: error.stack,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        })

        return h.view('common/templates/error', {
          title: 'Authentication Error',
          message: `There was a problem signing you in: ${error.message}`
        })
      }
    }

    // If this is not a callback, generate state and redirect to Azure AD
    const state = crypto.randomBytes(32).toString('hex')
    if (request.cookieAuth?.set) {
      request.cookieAuth.set('auth_state', state)
    }

    const authUrl = new URL('https://login.microsoftonline.com')
    authUrl.pathname = `/${config.get('azure.tenantId')}/oauth2/v2.0/authorize`
    authUrl.searchParams.append('client_id', config.get('azure.clientId'))
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('redirect_uri', config.get('azure.callbackUrl'))
    authUrl.searchParams.append('scope', 'openid profile email')
    authUrl.searchParams.append('state', state)

    return h.redirect(authUrl.toString())
  } catch (error) {
    // Clear all auth-related session data on error
    if (request.cookieAuth?.get?.('auth_state')) {
      request.cookieAuth.clear('auth_state')
    }
    if (request.cookieAuth?.get?.('redirect_to')) {
      request.cookieAuth.clear('redirect_to')
    }

    log('Unexpected error in auth flow', {
      message: error.message,
      stack: error.stack
    })

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
  // Clear all session data
  if (request.cookieAuth?.clear) {
    request.cookieAuth.clear()
  }

  // Redirect to home page
  return h.redirect('/')
}
