# Authentication System

## Overview

This authentication system provides integration with Azure AD using OpenID Connect. It's built on:

- `@hapi/cookie` for session management
- `openid-client` for OIDC auth with Azure AD
- Server-side session storage (Redis in production, memory in development)

## Configuration

Authentication is configured through environment variables (with defaults in the config):

- `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZURE_CLIENT_ID`: Azure AD client ID
- `AZURE_CLIENT_SECRET`: Azure AD client secret
- `AUTH_CALLBACK_URL`: Callback URL for Azure AD

Session configuration:

- `SESSION_COOKIE_PASSWORD`: Cookie encryption password (32+ char)
- `SESSION_COOKIE_TTL`: Cookie lifetime in ms (default: 4 hours)
- `SESSION_COOKIE_SECURE`: Set cookie as secure (default: true in prod)
- `SESSION_CACHE_ENGINE`: Cache engine to use ('redis' or 'memory')
- `SESSION_CACHE_TTL`: Cache lifetime in ms (default: 4 hours)

## Authentication Flow

1. **Login Start**: User visits `/auth/login`

   - System generates PKCE challenge and state parameter
   - Stores auth state in server cache
   - Redirects to Azure AD login page

2. **Azure AD Auth**: User authenticates with Azure AD

   - Azure validates credentials
   - Redirects back to callback URL with authorization code

3. **Auth Callback**: System handles the callback at `/auth`

   - Validates state parameter
   - Exchanges code for access and ID tokens
   - Creates user session with claims from ID token
   - Stores session in server cache
   - Sets session cookie with session ID
   - Redirects to original path

4. **Session Validation**: For each authenticated request

   - Validates session cookie
   - Retrieves session from cache
   - Checks if session is valid and not expired
   - Makes user and token available to request

5. **Logout**: User visits `/auth/logout`
   - Removes session from server cache
   - Clears session cookie
   - Redirects to Azure AD logout endpoint
   - Returns user to homepage

## Access Control

Two middleware functions are provided:

1. `requireAuth`: Ensures user is authenticated
2. `requireRole(roles)`: Ensures user has specific role(s)

Example usage:

```javascript
server.route({
  method: 'GET',
  path: '/admin',
  options: {
    pre: [{ method: requireRole('admin') }]
  },
  handler: adminHandler
})
```
