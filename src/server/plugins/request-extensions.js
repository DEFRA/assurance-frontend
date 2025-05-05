/**
 * A plugin to extend the request object with useful methods
 * @type {import('@hapi/hapi').Plugin<void>}
 */
export const plugin = {
  name: 'request-extensions',
  version: '1.0.0',
  register: (server) => {
    // Add a getUserSession method to the request object for easy access
    server.decorate('request', 'getUserSession', function () {
      if (this.auth.isAuthenticated && this.auth.credentials) {
        return this.auth.credentials
      }
      return null
    })

    // Add a getUser method to the request object for easy access to user data
    server.decorate('request', 'getUser', function () {
      if (this.auth.isAuthenticated && this.auth.credentials?.user) {
        return this.auth.credentials.user
      }
      return null
    })

    // Add a getBearerToken method to the request object for easy access to token
    server.decorate('request', 'getBearerToken', function () {
      if (this.auth.isAuthenticated && this.auth.credentials?.token) {
        return this.auth.credentials.token.replace(/^Bearer\s+/i, '').trim()
      }
      return null
    })
  }
}
