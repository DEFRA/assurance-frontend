/**
 * Authentication utility functions
 */

/**
 * Check if a user has the admin role
 * @param {object|null} user - The user object from credentials
 * @returns {boolean} True if user has admin role
 */
export const hasAdminRole = (user) => {
  return user?.roles?.includes('admin') || false
}

/**
 * Check if user has any of the specified roles
 * @param {object|null} user - The user object from credentials
 * @param {string|string[]} roles - Role or array of roles to check
 * @returns {boolean} True if user has any of the specified roles
 */
export const hasAnyRole = (user, roles) => {
  if (!user?.roles) {
    return false
  }

  const requiredRoles = Array.isArray(roles) ? roles : [roles]
  return requiredRoles.some((role) => user.roles.includes(role))
}

/**
 * Get user's display name
 * @param {object|null} user - The user object from credentials
 * @returns {string} User's display name or 'Unknown user'
 */
export const getUserDisplayName = (user) => {
  return user?.name || user?.email || 'Unknown user'
}
