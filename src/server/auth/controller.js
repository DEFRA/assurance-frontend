/**
 * Authentication related controllers
 */

export const authController = {
  /**
   * Show insufficient permissions page for authenticated users without admin role
   */
  insufficientPermissions: (request, h) => {
    const user = request.auth?.credentials?.user

    return h.view('auth/insufficient-permissions', {
      pageTitle: 'Access Restricted',
      user
    })
  }
}
