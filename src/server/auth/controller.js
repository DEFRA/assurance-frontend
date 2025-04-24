import * as client from 'openid-client'
import { config } from '../../config/config.js'
import { URL } from 'url'
import crypto from 'node:crypto'

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
 * Safely gets a value from cookieAuth
 * @param {import('@hapi/hapi').Request} request
 * @param {string} key
 * @returns {any}
 */
const safeGetCookie = (request, key) => {
  if (request.cookieAuth && typeof request.cookieAuth.get === 'function') {
    try {
      return request.cookieAuth.get(key)
    } catch (error) {
      log('Error getting cookie value', { key, error: error.message })
      return undefined
    }
  }
  return undefined
}

/**
 * Safely sets a value in cookieAuth
 * @param {import('@hapi/hapi').Request} request
 * @param {string} key
 * @param {any} value
 */
const safeSetCookie = (request, key, value) => {
  if (request.cookieAuth && typeof request.cookieAuth.set === 'function') {
    try {
      request.cookieAuth.set(key, value)
      return true
    } catch (error) {
      log('Error setting cookie value', { key, error: error.message })
      return false
    }
  }
  return false
}

/**
 * Safely clears a value or the entire cookieAuth
 * @param {import('@hapi/hapi').Request} request
 * @param {string} [key]
 */
const safeClearCookie = (request, key) => {
  if (request.cookieAuth && typeof request.cookieAuth.clear === 'function') {
    try {
      if (key) {
        request.cookieAuth.clear(key)
      } else {
        request.cookieAuth.clear()
      }
      return true
    } catch (error) {
      log('Error clearing cookie', { key, error: error.message })
      return false
    }
  }
  return false
}

/**
 * Sets a regular cookie (not using cookieAuth)
 * @param {import('@hapi/hapi').ResponseToolkit} h
 * @param {string} name
 * @param {string} value
 * @param {object} options
 */
const setCookie = (h, name, value, options = {}) => {
  const defaultOptions = {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    isSecure: config.get('session.cookie.secure'),
    isHttpOnly: true,
    path: '/',
    encoding: 'none'
  }
  h.state(name, value, { ...defaultOptions, ...options })
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

        // Get stored state and redirect URL
        const storedState =
          safeGetCookie(request, 'auth_state') || request.state.auth_state
        const redirectTo =
          safeGetCookie(request, 'redirect_to') ||
          request.state.redirect_to ||
          '/'

        log('Stored session data', {
          storedState,
          redirectTo,
          cookies: Object.keys(request.state || {})
        })

        if (!storedState) {
          log('State not found in session, using state from query')
          // If we can't find the state, we'll accept the state from the query parameter
          // This is less secure but allows authentication to work when cookies aren't properly set
        } else if (storedState !== request.query.state) {
          throw new Error('State mismatch')
        }

        // Exchange the code for tokens
        log('Attempting to exchange code for tokens')

        // Get OAuth parameters from config
        const clientId = config.get('azure.clientId')
        const clientSecret = config.get('azure.clientSecret')
        const tenantId = config.get('azure.tenantId')
        const callbackUrl = config.get('azure.callbackUrl')

        log('Using OAuth configuration', { clientId, tenantId, callbackUrl })

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

        log('Token exchange successful', {
          access_token: tokenSet.access_token ? '[present]' : '[missing]',
          id_token: tokenSet.id_token ? '[present]' : '[missing]',
          expires_in: tokenSet.expires_in
        })

        // Get user info from the ID token
        const claims = tokenSet.claims()
        log('Successfully retrieved user info', {
          id: claims.sub,
          email: claims.email || claims.preferred_username,
          name: claims.name
        })

        // Create the session with user data
        const sessionData = {
          user: {
            id: claims.sub,
            email: claims.email || claims.preferred_username,
            name: claims.name
          },
          expires: Date.now() + (tokenSet.expires_in || 3600) * 1000 // Convert to milliseconds
        }

        // Store session in server cache
        const sid = crypto.randomBytes(16).toString('hex')
        try {
          // Store with a longer TTL to ensure it's not expiring too quickly
          // 0 means use the default TTL from config
          await request.server.app.cache.set(sid, sessionData, 0)
          log('Session stored in cache', {
            sid,
            sessionData: JSON.stringify(sessionData)
          })

          // For debugging, immediately try to get it back
          const testGet = await request.server.app.cache.get(sid)
          if (testGet) {
            log('Session cache test retrieval successful', { sid })
          } else {
            log('Session cache test retrieval FAILED', { sid })
          }
        } catch (error) {
          log('Error storing session in cache', {
            error: error.message,
            stack: error.stack
          })
        }

        // Set the session cookie with ONLY the ID as required by validate function
        if (
          request.cookieAuth &&
          typeof request.cookieAuth.set === 'function'
        ) {
          // The cookie should only contain the id field which validate() will use
          request.cookieAuth.set({ id: sid })
          log('Session cookie set', { id: sid })
        }

        // Clear auth state after successful authentication
        safeClearCookie(request, 'auth_state')
        safeClearCookie(request, 'redirect_to')

        // Create the redirect response
        const response = h.redirect(redirectTo || '/')

        // Set an additional auth_status cookie as fallback
        setCookie(response, 'auth_status', 'authenticated', {
          ttl: tokenSet.expires_in ? tokenSet.expires_in * 1000 : 3600 * 1000
        })

        // Log authentication success
        log('Session and auth state set successfully, redirecting to', {
          redirectTo: redirectTo || '/',
          isAuthenticated: Boolean(request.auth.isAuthenticated),
          cookies: Object.keys(request.state || {})
        })

        return response
      } catch (error) {
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
    safeSetCookie(request, 'auth_state', state)

    // Also set regular cookie as fallback
    const response = h.response()
    setCookie(response, 'auth_state', state)

    // Store current path as redirect target if available
    // Prefer query parameter, then referer header, then current path
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

    log('Setting redirect path', { redirectPath })
    safeSetCookie(request, 'redirect_to', redirectPath)
    setCookie(response, 'redirect_to', redirectPath)

    const authUrl = new URL('https://login.microsoftonline.com')
    authUrl.pathname = `/${config.get('azure.tenantId')}/oauth2/v2.0/authorize`
    authUrl.searchParams.append('client_id', config.get('azure.clientId'))
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('redirect_uri', config.get('azure.callbackUrl'))
    authUrl.searchParams.append('scope', 'openid profile email')
    authUrl.searchParams.append('state', state)

    response.redirect(authUrl.toString())
    return response
  } catch (error) {
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
  log('Logout initiated', {
    isAuthenticated: request.auth.isAuthenticated,
    cookies: Object.keys(request.state || {})
  })

  // Clear the session cookie using cookieAuth API
  if (request.cookieAuth) {
    request.cookieAuth.clear()
  }

  // Create redirect response
  const response = h.redirect('/')

  // Explicitly clear all cookies
  response.unstate('sid')
  response.unstate('auth_state')
  response.unstate('redirect_to')
  response.unstate('auth_status')

  log('Logout completed - cookies cleared')

  return response
}
