/**
 * Accessibility controller
 * @satisfies {Partial<ServerRoute>}
 */

const VIEW_TEMPLATES = {
  ACCESSIBILITY: 'accessibility/views/index'
}

export const accessibilityController = {
  get: (request, h) => {
    request.logger.info('Getting accessibility page')

    return h.view(VIEW_TEMPLATES.ACCESSIBILITY, {
      pageTitle: 'Accessibility Statement | Defra Digital Assurance'
    })
  }
}
