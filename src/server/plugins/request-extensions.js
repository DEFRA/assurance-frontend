/**
 * A plugin to extend the request object with useful methods
 * @type {import('@hapi/hapi').Plugin<void>}
 */
export const plugin = {
  name: 'request-extensions',
  version: '1.0.0',
  register: (server) => {
    server.decorate('request', 'getUserSession', function () {
      if (this.auth.credentials) {
        return this.auth.credentials
      }
      return null
    })
  }
}
