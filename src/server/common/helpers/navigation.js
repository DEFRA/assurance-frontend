export const navigation = (auth) => {
  const items = {
    primary: [
      {
        text: 'Home',
        url: '/'
      },
      {
        text: 'Programmes',
        url: '/programmes'
      }
    ],
    actions: [],
    admin: []
  }

  // Add admin link if authenticated
  if (auth?.isAuthenticated) {
    items.primary.push({
      text: 'Admin',
      url: '/admin'
    })
  }

  return items
}
