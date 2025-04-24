/**
 * Builds the navigation structure based on current path
 * @param {object} auth - The authentication state object
 * @param {boolean} auth.isAuthenticated - Whether the user is authenticated
 * @param {string} [currentPath] - The current request path (for active state)
 * @returns {object} Navigation items organized by section
 */
export const navigation = (auth, currentPath = '') => {
  return {
    primary: [
      {
        text: 'Home',
        url: '/',
        isActive: currentPath === '/'
      },
      {
        text: 'Programmes',
        url: '/programmes',
        isActive: currentPath.startsWith('/programmes')
      }
    ]
  }
}
