import { config } from '~/src/config/config.js'

export function getAuthConfig() {
  return {
    cookiePassword: config.get('session.cookie.password'),
    isSecure: config.get('session.cookie.secure'),
    cookieTTL: config.get('session.cookie.ttl'),
    callbackUrl: config.get('azure.callbackUrl'),
    tenantId: config.get('azure.tenantId'),
    clientId: config.get('azure.clientId'),
    clientSecret: config.get('azure.clientSecret')
  }
}
