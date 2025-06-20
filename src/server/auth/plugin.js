import { Issuer, generators } from 'openid-client'
import Cookie from '@hapi/cookie'
import Boom from '@hapi/boom'
import crypto from 'node:crypto'
import { URL } from 'url'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'

// Constants for repeated literals
const AUTH_ERROR_TITLE = 'Authentication Error'
const OIDC_CONFIG_ERROR = 'OIDC client is not properly configured'
const AUTH_SESSION_COOKIE_NAME = 'assurance-session'
const HOME_PATH = '/'
const AUTH_PATH = '/auth'
const AUTH_LOGOUT_PATH = '/auth/logout'
const AUTH_LOGIN_PATH = '/auth/login'
const ERROR_TEMPLATE = 'common/templates/error'

export const plugin = {
  name: 'auth',
  version: '1.0.0',
  register: async (server) => {
    // Register cookie plugin
    await server.register(Cookie)

    // Validate the authentication state from session
    async function validateAuthState(state, request) {
      try {
        const sessionCookie = request.state[AUTH_SESSION_COOKIE_NAME]

        if (!sessionCookie?.id) {
          throw Boom.badRequest('No session found')
        }

        const sessionData = await server.app.sessionCache?.get(sessionCookie.id)

        if (!sessionData?.authState) {
          throw Boom.badRequest('Invalid or expired auth state')
        }

        const authState = sessionData.authState

        if (authState.state !== state) {
          throw Boom.badRequest('Invalid auth state - state mismatch')
        }

        if (authState.expires < Date.now()) {
          throw Boom.badRequest('Auth state expired')
        }

        return authState
      } catch (error) {
        if (error.isBoom) {
          throw error
        }
        logger.error('Error validating auth state:', error)
        throw Boom.badRequest('Invalid auth state')
      }
    }

    // Process token exchange and create session
    async function processTokenExchange(
      client,
      appConfig,
      params,
      state,
      stateData,
      sessionCache,
      sessionId
    ) {
      const callbackUrl = appConfig.get('azure.callbackUrl')

      const tokenSet = await client.callback(callbackUrl, params, {
        state,
        code_verifier: stateData.codeVerifier
      })

      // Get user info from ID token
      const claims = tokenSet.claims()

      // Create session
      let userRoles = []
      if (Array.isArray(claims.roles)) {
        userRoles = claims.roles.map((r) => r.toLowerCase())
      } else if (typeof claims.roles === 'string') {
        userRoles = [claims.roles.toLowerCase()]
      }

      const hasAdminRole = userRoles.includes('admin')
      const sessionData = {
        user: {
          id: claims.sub,
          email: claims.email || claims.preferred_username,
          name: claims.name,
          roles: hasAdminRole ? ['admin'] : []
        },
        token: tokenSet.access_token,
        expires: Date.now() + (tokenSet.expires_in || 3600) * 1000
      }

      // Update the existing session with user data
      await sessionCache.set(sessionId, sessionData)

      return { sid: sessionId }
    }

    // Handle authentication errors
    function handleAuthError(error, h) {
      logger.error('Authentication callback error:', error)

      let errorMessage = 'There was a problem signing you in.'
      if (error.message) {
        errorMessage += ` Error: ${error.message}`
      }

      return h.view(ERROR_TEMPLATE, {
        title: AUTH_ERROR_TITLE,
        message: errorMessage
      })
    }

    // Setup Azure AD OIDC Issuer and Client
    let oidcClient
    try {
      const tenantId = config.get('azure.tenantId')
      const clientId = config.get('azure.clientId')
      const clientSecret = config.get('azure.clientSecret')
      const callbackUrl = config.get('azure.callbackUrl')

      const issuer = await Issuer.discover(
        `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`
      )

      oidcClient = new issuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [callbackUrl],
        response_types: ['code']
      })

      server.app.oidcClient = oidcClient
    } catch (error) {
      logger.error('Failed to setup OIDC client', error)
    }

    // Configure authentication strategy using cookie
    server.auth.strategy('session', 'cookie', {
      cookie: {
        name: AUTH_SESSION_COOKIE_NAME,
        password: config.get('session.cookie.password'),
        isSecure: config.get('session.cookie.secure'),
        ttl: config.get('session.cookie.ttl'),
        path: '/',
        isHttpOnly: true,
        isSameSite: 'Lax',
        clearInvalid: true
      },
      redirectTo: false,
      validate: async (request, session) => {
        try {
          if (
            request.path === AUTH_LOGOUT_PATH ||
            request.path.startsWith('/public/')
          ) {
            return { isValid: false }
          }

          if (!session?.id) {
            return { isValid: false }
          }

          const cached = await server.app.sessionCache?.get(session.id)

          if (!cached) {
            return { isValid: false }
          }

          // Check if this is an auth session (has authState but no user)
          if (cached.authState && !cached.user) {
            return { isValid: false }
          }

          // Check if this is a user session
          if (!cached.user) {
            return { isValid: false }
          }

          if (cached.expires && cached.expires < Date.now()) {
            await server.app.sessionCache?.drop(session.id)
            return { isValid: false }
          }

          return {
            isValid: true,
            credentials: {
              ...cached,
              id: session.id
            }
          }
        } catch (error) {
          logger.error('Session validation error:', { error: error.message })
          return { isValid: false }
        }
      }
    })

    // Set default auth strategy to 'try' for public routes
    server.auth.default({
      strategy: 'session',
      mode: 'try'
    })

    // Route for initiating login flow
    server.route({
      method: 'GET',
      path: AUTH_LOGIN_PATH,
      options: { auth: false },
      handler: async (request, h) => {
        if (!oidcClient) {
          return h.view(ERROR_TEMPLATE, {
            title: AUTH_ERROR_TITLE,
            message: OIDC_CONFIG_ERROR
          })
        }

        try {
          // Generate state and code verifier
          const state = generators.state()
          const codeVerifier = generators.codeVerifier()
          const codeChallenge = generators.codeChallenge(codeVerifier)

          // Store current path as redirect target
          let redirectPath = request.query.redirectTo
          if (!redirectPath) {
            redirectPath = request.headers.referer
              ? new URL(request.headers.referer).pathname
              : HOME_PATH
          }

          // Default to home page if we're on auth pages
          if (redirectPath === AUTH_PATH || redirectPath === AUTH_LOGIN_PATH) {
            redirectPath = HOME_PATH
          }

          // Create temporary session to store auth state
          const sessionId = crypto.randomBytes(16).toString('hex')
          const authState = {
            state,
            codeVerifier,
            redirectTo: redirectPath,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
          }

          // Store auth state in session cache
          await server.app.sessionCache.set(sessionId, { authState })

          // Create authorization URL
          const authUrl = oidcClient.authorizationUrl({
            scope: `openid profile email api://${config.get('azure.clientId')}/access_as_user`,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
          })

          // Create response with session cookie and redirect to Azure AD
          const response = h.redirect(authUrl)
          response.state(AUTH_SESSION_COOKIE_NAME, { id: sessionId })

          return response
        } catch (error) {
          logger.error('Login initialization error:', error)
          return h.view(ERROR_TEMPLATE, {
            title: AUTH_ERROR_TITLE,
            message: `There was a problem initiating login: ${error.message}`
          })
        }
      }
    })

    // Route for handling the callback from Azure AD
    server.route({
      method: 'GET',
      path: AUTH_PATH,
      options: { auth: false },
      handler: async (request, h) => {
        if (!oidcClient) {
          return h.view(ERROR_TEMPLATE, {
            title: AUTH_ERROR_TITLE,
            message: OIDC_CONFIG_ERROR
          })
        }

        try {
          // Get state from query parameters
          const params = oidcClient.callbackParams(request.raw.req || request)
          const state = params.state

          if (!state) {
            throw Boom.badRequest('Missing state parameter')
          }

          // Validate state and get stored data from session
          const stateData = await validateAuthState(state, request)
          const sessionCookie = request.state[AUTH_SESSION_COOKIE_NAME]

          // Process the token exchange and create session
          const sessionResult = await processTokenExchange(
            oidcClient,
            config,
            params,
            state,
            stateData,
            server.app.sessionCache,
            sessionCookie.id
          )

          // Create response with updated session cookie
          const response = h.redirect(stateData.redirectTo || HOME_PATH)
          response.state(AUTH_SESSION_COOKIE_NAME, { id: sessionResult.sid })

          return response
        } catch (error) {
          return handleAuthError(error, h)
        }
      }
    })

    // Route for logout
    server.route({
      method: 'GET',
      path: AUTH_LOGOUT_PATH,
      options: {
        auth: {
          strategy: 'session',
          mode: 'try'
        }
      },
      handler: async (request, h) => {
        try {
          // Clear session from cache if we have the session ID
          if (request.auth.isAuthenticated && request.auth.credentials?.id) {
            await server.app.sessionCache?.drop(request.auth.credentials.id)
          }

          // Prepare response
          const response = h.redirect(HOME_PATH)
          response.unstate(AUTH_SESSION_COOKIE_NAME)

          // Construct Azure AD logout URL if we have an OIDC client
          if (oidcClient) {
            const homeUrl = `${request.server.info.protocol}://${request.info.host}/`
            const logoutUrl = oidcClient.endSessionUrl({
              post_logout_redirect_uri: homeUrl
            })
            return response.redirect(logoutUrl)
          }

          return response
        } catch (error) {
          logger.error('Logout error:', error)
          return h.redirect(HOME_PATH)
        }
      }
    })
  }
}
