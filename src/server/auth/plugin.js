import { Issuer, generators } from 'openid-client'
import Cookie from '@hapi/cookie'
import Boom from '@hapi/boom'
import crypto from 'node:crypto'
import { URL } from 'url'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { config } from '~/src/config/config.js'

const logger = createLogger()

// Constants for repeated literals
const AUTH_ERROR_TITLE = 'Authentication Error'
const OIDC_CONFIG_ERROR = 'OIDC client is not properly configured'
const ADMIN_ROLE = 'admin'
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

    // Helper functions for auth callback processing

    // Validate the authentication state
    async function validateAuthState(state, cache) {
      const stateData = await cache.get(state)
      logger.debug('Retrieved state data from cache:', {
        found: !!stateData,
        state,
        stateData: stateData ? { redirectTo: stateData.redirectTo } : null
      })

      if (!stateData) {
        logger.error('Invalid or expired auth state', { state })
        throw Boom.badRequest('Invalid or expired auth state')
      }

      return stateData
    }

    // Process token exchange and create session
    async function processTokenExchange(
      client,
      appConfig,
      params,
      state,
      stateData,
      sessionCache,
      logger
    ) {
      logger.debug('Initiating token exchange', {
        hasCode: !!params.code,
        callbackUrl: appConfig.get('azure.callbackUrl')
      })

      const tokenSet = await client.callback(
        appConfig.get('azure.callbackUrl'),
        params,
        {
          state,
          code_verifier: stateData.codeVerifier
        }
      )

      // Get user info from ID token
      const claims = tokenSet.claims()
      logger.debug('Received token and claims', {
        hasIdToken: !!tokenSet.id_token,
        hasAccessToken: !!tokenSet.access_token,
        tokenExpiry: tokenSet.expires_in,
        claimsReceived: Object.keys(claims)
      })

      // Create session
      const sessionData = {
        user: {
          id: claims.sub,
          email: claims.email || claims.preferred_username,
          name: claims.name,
          roles: [ADMIN_ROLE] // Assign just the admin role
        },
        token: tokenSet.access_token,
        expires: Date.now() + (tokenSet.expires_in || 3600) * 1000 // Convert to milliseconds
      }

      logger.debug('Created session with roles', {
        userId: sessionData.user.id,
        roles: sessionData.user.roles
      })

      // Store session in server cache
      const sid = crypto.randomBytes(16).toString('hex')
      await sessionCache.set(sid, sessionData)
      logger.debug('Session created and stored in cache', { sid })

      return { sid }
    }

    // Handle authentication errors
    function handleAuthError(error, h) {
      logger.error('Authentication callback error:', error)

      // Create a more detailed error message
      let errorMessage = 'There was a problem signing you in.'
      if (error.message) {
        errorMessage += ` Error: ${error.message}`
      }

      // Add troubleshooting info for specific errors
      if (error.message?.includes('invalid IncomingMessage')) {
        errorMessage +=
          ' (This is a technical issue with how the request is being processed.)'
      } else if (error.message?.includes('state')) {
        errorMessage +=
          ' (This may be due to an expired or invalid authentication session.)'
      }

      return h.view(ERROR_TEMPLATE, {
        title: AUTH_ERROR_TITLE,
        message: errorMessage
      })
    }

    // Setup cache for temporary auth state
    const authStateCache = server.cache({
      segment: 'auth:state',
      expiresIn: 10 * 60 * 1000 // 10 minutes
    })

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

      // Store on server app for easy access
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
        clearInvalid: true,
        ignoreErrors: true
      },
      redirectTo: false,
      validate: async (request, session) => {
        try {
          // Skip validation for auth routes and public assets
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

          if (cached.expires && cached.expires < Date.now()) {
            await server.app.sessionCache?.drop(session.id)
            return { isValid: false }
          }

          // Add default roles if none exist for backward compatibility
          if (!cached.user?.roles) {
            cached.user = {
              ...cached.user,
              roles: [ADMIN_ROLE]
            }
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

          // Store auth state and code verifier in cache
          // Use the state parameter itself as the cache key
          await authStateCache.set(state, {
            codeVerifier,
            redirectTo: redirectPath
          })

          // Create authorization URL
          const authUrl = oidcClient.authorizationUrl({
            scope: `openid profile email api://${config.get('azure.clientId')}/access_as_user`,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
          })

          // Redirect to Azure AD
          return h.redirect(authUrl)
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

          logger.debug('Auth callback received', {
            hasCode: !!params.code,
            hasState: !!state,
            queryParams: Object.keys(request.query)
          })

          if (!state) {
            logger.error('Missing state parameter', { query: request.query })
            throw Boom.badRequest('Missing state parameter')
          }

          // Validate state and get stored data
          const stateData = await validateAuthState(state, authStateCache)

          try {
            // Process the token exchange and create session
            const sessionResult = await processTokenExchange(
              oidcClient,
              config,
              params,
              state,
              stateData,
              server.app.sessionCache,
              logger
            )

            // Create response with session cookie
            const response = h.redirect(stateData.redirectTo || HOME_PATH)
            response.state(AUTH_SESSION_COOKIE_NAME, { id: sessionResult.sid })

            // Clear temporary auth state from cache
            await authStateCache.drop(state)

            return response
          } catch (tokenError) {
            logger.error('Token exchange error', {
              error: tokenError.message,
              stack: tokenError.stack,
              params: {
                code: params.code ? '***' : undefined,
                state: params.state
              }
            })
            throw tokenError
          }
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
          } else {
            logger.debug('No session ID found for logout')
          }

          // Prepare response
          const response = h.redirect(HOME_PATH)

          // Clear session cookie
          response.unstate(AUTH_SESSION_COOKIE_NAME)

          // Construct Azure AD logout URL if we have an OIDC client
          if (oidcClient) {
            const homeUrl = `${request.server.info.protocol}://${request.info.host}/`
            logger.debug(
              'Redirecting to Azure AD logout with post-logout redirect',
              {
                homeUrl
              }
            )

            // Use the endSessionUrl to redirect to Azure AD's logout page
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
