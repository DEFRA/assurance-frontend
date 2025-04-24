/**
 * Builds the navigation structure based on authentication status and current path
 * @param {object} auth - The authentication state object
 * @param {boolean} auth.isAuthenticated - Whether the user is authenticated
 * @param {string} [currentPath] - The current request path (for active state)
 * @returns {object} Navigation items organized by section
 */
export const navigation = (auth, currentPath = '') => {
  const items = {
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
    ],
    actions: []
  }

  // Add admin link if authenticated
  if (auth?.isAuthenticated) {
    items.primary.push({
      text: 'Admin',
      url: '/admin',
      isActive: currentPath.startsWith('/admin')
    })

    // Add sign out action
    items.actions.push({
      text: 'Sign out',
      url: '/auth/logout',
      isActive: false
    })
  } else {
    // Add sign in action if not authenticated
    items.actions.push({
      text: 'Sign in',
      url: '/auth/login',
      isActive: currentPath === '/auth/login'
    })
  }

  return items
}
