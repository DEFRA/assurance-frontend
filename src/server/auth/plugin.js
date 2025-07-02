import { Issuer, generators } from 'openid-client'
import Cookie from '@hapi/cookie'
import Boom from '@hapi/boom'
import crypto from 'node:crypto'
import { URL } from 'url'
import { logger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'

// Import extracted modules
import * as sessionValidator from './session-validator.js'
import * as visitorSessions from './visitor-sessions.js'

// Constants for repeated literals
const AUTH_ERROR_TITLE = 'Authentication Error'
const OIDC_CONFIG_ERROR = 'OIDC client is not properly configured'
const AUTH_SESSION_COOKIE_NAME = 'assurance-session'
const HOME_PATH = '/'
const AUTH_PATH = '/auth'
const AUTH_LOGOUT_PATH = '/auth/logout'
const AUTH_LOGIN_PATH = '/auth/login'
const ERROR_TEMPLATE = 'common/templates/error'

// Time constants to avoid magic numbers
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const TEN_MINUTES_MS = 10 * 60 * 1000
const ONE_HOUR_SECONDS = 3600
const TOKEN_REFRESH_THRESHOLD_MINUTES = 5
const HTTP_BAD_REQUEST = 400

export const plugin = {
  name: 'auth',
  version: '1.0.0',
  register: async (server) => {
    // Register cookie plugin
    await server.register(Cookie)

    // Validate the authentication state from session
    async function validateAuthState(state, request) {
      try {
        const sessionCookie = request.state?.[AUTH_SESSION_COOKIE_NAME]

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
    async function processTokenExchange(options) {
      const {
        client,
        appConfig,
        params,
        state,
        stateData,
        sessionCache,
        sessionId
      } = options
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
        refreshToken: tokenSet.refresh_token,
        tokenExpires:
          Date.now() + (tokenSet.expires_in || ONE_HOUR_SECONDS) * 1000,
        expires: Date.now() + appConfig.get('session.cache.ttl')
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

    // Check if error indicates session expiry
    function isSessionExpiredError(error) {
      return (
        error.error === 'invalid_grant' ||
        error.error_description?.includes('expired') ||
        error.error_description?.includes('revoked') ||
        error.message?.includes('refresh token') ||
        error.status === HTTP_BAD_REQUEST
      )
    }

    // Handle refresh token error
    async function handleRefreshError(error, sessionId, sessionCache) {
      if (isSessionExpiredError(error)) {
        logger.info(
          'Entra session expired or refresh token invalid, invalidating local session',
          {
            sessionId,
            error: error.error_description || error.message
          }
        )
        await sessionCache.drop(sessionId)
        return 'session_expired'
      }

      logger.error('Failed to refresh access token', {
        sessionId,
        error: error.message
      })
      return false
    }

    // Refresh access token using refresh token
    async function refreshAccessToken(sessionData, sessionId, sessionCache) {
      try {
        if (!oidcClient || !sessionData.refreshToken) {
          logger.warn(
            'Cannot refresh token: missing OIDC client or refresh token'
          )
          return false
        }

        logger.info('Refreshing access token for session', { sessionId })
        const tokenSet = await oidcClient.refresh(sessionData.refreshToken)

        const updatedSessionData = {
          ...sessionData,
          token: tokenSet.access_token,
          refreshToken: tokenSet.refresh_token || sessionData.refreshToken,
          tokenExpires:
            Date.now() + (tokenSet.expires_in || ONE_HOUR_SECONDS) * 1000
        }

        await sessionCache.set(sessionId, updatedSessionData)
        logger.info('Access token refreshed successfully', { sessionId })
        return updatedSessionData
      } catch (error) {
        return await handleRefreshError(error, sessionId, sessionCache)
      }
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

    async function handleTokenRefresh(
      cached,
      sessionId,
      sessionCache,
      sessionToReturn
    ) {
      const tokenExpiry = cached.tokenExpires || 0
      const refreshThreshold = TOKEN_REFRESH_THRESHOLD_MINUTES * 60 * 1000
      const shouldRefresh = tokenExpiry < Date.now() + refreshThreshold

      if (!shouldRefresh || !cached.refreshToken) {
        return null // No refresh needed
      }

      logger.info('Token expiring soon, attempting refresh', { sessionId })
      const refreshResult = await refreshAccessToken(
        cached,
        sessionId,
        sessionCache
      )

      if (refreshResult === 'session_expired') {
        logger.info(
          'Entra session expired during refresh, invalidating session',
          { sessionId }
        )
        return { isValid: false, sessionExpired: true }
      }

      if (refreshResult) {
        const finalSession = {
          ...refreshResult,
          expires: sessionToReturn.expires
        }
        return {
          isValid: true,
          credentials: { ...finalSession, id: sessionId }
        }
      }

      // Refresh failed, invalidate session
      logger.warn('Token refresh failed, invalidating session', { sessionId })
      await sessionCache?.drop(sessionId)
      return { isValid: false }
    }

    // Main session validation orchestrator - reduced complexity
    async function validateSessionRequest(request, session, sessionCache) {
      try {
        // Guard: Skip validation for public paths
        if (sessionValidator.isPublicPath(request.path)) {
          return { isValid: false }
        }

        // Guard: Handle unauthenticated users
        if (!session?.id) {
          return await sessionValidator.handleUnauthenticatedRequest(
            request,
            sessionCache,
            visitorSessions.handleUnauthenticatedUser
          )
        }

        // Get cached session
        const cached = await sessionCache?.get(session.id)
        if (!cached) {
          return await visitorSessions.handleMissingSession(
            request,
            sessionCache
          )
        }

        // Check if this is an authenticated session (has user data)
        if (cached.user) {
          // Validate and process authenticated session
          return await sessionValidator.processAuthenticatedSession(
            cached,
            session.id,
            sessionCache,
            handleTokenRefresh
          )
        }

        // Handle visitor-only sessions (no user data)
        return await sessionValidator.handleVisitorSession(
          request,
          sessionCache,
          visitorSessions.createOrUpdateVisitorSession,
          visitorSessions.shouldTrackPath
        )
      } catch (error) {
        logger.error('Session validation error:', { error: error.message })
        return { isValid: false }
      }
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
        return validateSessionRequest(request, session, server.app.sessionCache)
      }
    })

    // Set default auth strategy to 'try' for public routes
    server.auth.default({
      strategy: 'session',
      mode: 'try'
    })

    // Create visitor sessions for unauthenticated users
    server.ext('onPreAuth', async (request, h) => {
      const sessionCookie = request.state?.[AUTH_SESSION_COOKIE_NAME]

      // Skip visitor session creation for auth paths to avoid interfering with OAuth flow
      const isAuthPath = request.path.startsWith('/auth')

      if (isAuthPath || !visitorSessions.shouldTrackPath(request.path)) {
        return h.continue
      }

      // If we have a session cookie, check if it's an authenticated session
      if (sessionCookie?.id) {
        const cached = await server.app.sessionCache?.get(sessionCookie.id)
        if (cached?.user) {
          // This is an authenticated session, don't interfere with it
          return h.continue
        }
      }

      // Create or update visitor session for non-authenticated users
      // This handles both new sessions (no cookie) and existing visitor sessions
      const visitorResult = await visitorSessions.createOrUpdateVisitorSession(
        request,
        server.app.sessionCache
      )
      if (visitorResult) {
        request._visitorSessionId = visitorResult.sessionId
        request.visitor = visitorResult.visitorSession.visitor
      }

      return h.continue
    })

    // Extension to set visitor session cookie when created
    server.ext('onPreResponse', (request, h) => {
      if (request._visitorSessionId) {
        h.state(
          AUTH_SESSION_COOKIE_NAME,
          { id: request._visitorSessionId },
          {
            ttl: TWENTY_FOUR_HOURS_MS, // 24 hours
            isHttpOnly: true,
            isSecure: config.get('session.cookie.secure'),
            isSameSite: 'Lax',
            path: '/'
          }
        )
      }
      return h.continue
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
            expires: Date.now() + TEN_MINUTES_MS // 10 minutes
          }

          // Store auth state in session cache
          await server.app.sessionCache.set(sessionId, { authState })

          // Create authorization URL
          const authUrl = oidcClient.authorizationUrl({
            scope: `openid profile email offline_access api://${config.get('azure.clientId')}/access_as_user`,
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
          const sessionCookie = request.state?.[AUTH_SESSION_COOKIE_NAME]

          // Process the token exchange and create session
          const sessionResult = await processTokenExchange({
            client: oidcClient,
            appConfig: config,
            params,
            state,
            stateData,
            sessionCache: server.app.sessionCache,
            sessionId: sessionCookie.id
          })

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
