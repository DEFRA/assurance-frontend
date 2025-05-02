import { config } from '~/src/config/config.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import crypto from 'node:crypto'

const logger = createLogger()

/**
 * Creates a new session with the given data
 * @param {import('@hapi/hapi').Request} request
 * @param {object} sessionData
 * @returns {Promise<{id: string, token: string}>}
 */
export const createSession = async (request, sessionData) => {
  const sid = crypto.randomBytes(16).toString('hex')

  try {
    logger.info('Creating new session:', {
      id: sid,
      hasToken: !!sessionData.token,
      hasUser: !!sessionData.user,
      expires: sessionData.expires,
      ttl: config.get('session.cache.ttl')
    })

    await request.server.app.cache.set(
      sid,
      sessionData,
      config.get('session.cache.ttl')
    )
    logger.info('Session created successfully:', { id: sid })
    return { id: sid, token: sessionData.token }
  } catch (error) {
    logger.error('Error creating session:', { error, id: sid })
    throw error
  }
}

/**
 * Gets session data from cache
 * @param {import('@hapi/hapi').Request} request
 * @param {string} sid
 * @returns {Promise<object|null>}
 */
export const getSession = async (request, sid) => {
  try {
    logger.info('Getting session from cache:', { id: sid })
    const session = await request.server.app.cache.get(sid)
    logger.info('Session cache result:', {
      id: sid,
      found: !!session,
      hasToken: !!session?.token,
      hasUser: !!session?.user,
      expires: session?.expires
    })
    return session
  } catch (error) {
    logger.error('Error getting session:', { error, id: sid })
    return null
  }
}

/**
 * Destroys a session
 * @param {import('@hapi/hapi').Request} request
 * @param {string} sid
 * @returns {Promise<boolean>}
 */
export const destroySession = async (request, sid) => {
  try {
    logger.info('Destroying session:', { id: sid })
    await request.server.app.cache.drop(sid)
    logger.info('Session destroyed successfully:', { id: sid })
    return true
  } catch (error) {
    logger.error('Error destroying session:', { error, id: sid })
    return false
  }
}

/**
 * Validates a session
 * @param {import('@hapi/hapi').Request} request
 * @param {object} session
 * @returns {Promise<{isValid: boolean, credentials?: object}>}
 */
export const validateSession = async (request, session) => {
  try {
    logger.info('Starting session validation:', {
      sessionType: typeof session,
      isString: typeof session === 'string',
      rawSession: session
    })

    // Parse session data if it's a string
    const sessionData =
      typeof session === 'string' ? JSON.parse(session) : session

    logger.info('Parsed session data:', {
      id: sessionData?.id,
      hasToken: !!sessionData?.token,
      tokenLength: sessionData?.token?.length,
      hasUser: !!sessionData?.user,
      expires: sessionData?.expires
    })

    if (!sessionData?.id) {
      logger.warn('Invalid session structure', {
        session: JSON.stringify(sessionData)
      })
      return { isValid: false }
    }

    // Check if session exists in cache
    const cached = await getSession(request, sessionData.id)

    if (!cached) {
      logger.warn('No cached session found for ID', { id: sessionData.id })
      return { isValid: false }
    }

    // Check if session has expired
    if (cached.expires && cached.expires < Date.now()) {
      logger.warn('Session has expired', {
        id: sessionData.id,
        expires: cached.expires,
        now: Date.now(),
        timeUntilExpiry: cached.expires - Date.now()
      })
      await destroySession(request, sessionData.id)
      return { isValid: false }
    }

    // Ensure user has roles
    if (!cached.user?.roles) {
      logger.info('Adding default admin role to user', { id: sessionData.id })
      cached.user = {
        ...cached.user,
        roles: ['admin'] // Add admin role for testing
      }
    }

    // Clean up token if present in session data
    if (sessionData.token) {
      sessionData.token = sessionData.token.replace(/^Bearer\s+/i, '').trim()
    }

    // Clean up token if present in cached data
    if (cached.token) {
      cached.token = cached.token.replace(/^Bearer\s+/i, '').trim()
    }

    // Merge cookie and cache data, preferring the token from session data
    const credentials = {
      ...cached,
      token: sessionData.token || cached.token,
      id: sessionData.id
    }

    // Log the merged credentials for debugging
    logger.info('Validated session with credentials:', {
      id: credentials.id,
      hasToken: !!credentials.token,
      tokenLength: credentials.token?.length,
      hasUser: !!credentials.user,
      userRoles: credentials.user?.roles,
      expires: credentials.expires
    })

    return {
      isValid: true,
      credentials
    }
  } catch (error) {
    logger.error('Error validating session:', { error: error.message, session })
    return { isValid: false }
  }
}
