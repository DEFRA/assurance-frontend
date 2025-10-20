/**
 * Delivery Group Standards controller
 * @satisfies {Partial<ServerRoute>}
 */

const VIEW_TEMPLATES = {
  DELIVERY_GROUP_STANDARDS: 'delivery-group-standards/views/index',
  STANDARD_1: 'delivery-group-standards/views/standard-1',
  STANDARD_2: 'delivery-group-standards/views/standard-2',
  STANDARD_3: 'delivery-group-standards/views/standard-3',
  STANDARD_4: 'delivery-group-standards/views/standard-4'
}

const STANDARD_TITLES = {
  1: '1. Define and share outcomes',
  2: '2. Maintain an inventory of products and services',
  3: '3. Publish a roadmap for change',
  4: '4. Define success measures and share progress'
}

export const deliveryGroupStandardsController = {
  get: (request, h) => {
    return h.view(VIEW_TEMPLATES.DELIVERY_GROUP_STANDARDS, {
      pageTitle: 'Delivery Group Standards | Defra Digital Assurance',
      heading: 'Delivery Group Standards'
    })
  },

  getStandard: (request, h) => {
    const { standardNumber } = request.params
    const standardNum = parseInt(standardNumber, 10)

    // Validate standard number
    if (!standardNum || standardNum < 1 || standardNum > 4) {
      return h.response('Standard not found').code(404)
    }

    const viewTemplate = VIEW_TEMPLATES[`STANDARD_${standardNum}`]
    const standardTitle = STANDARD_TITLES[standardNum]

    return h.view(viewTemplate, {
      pageTitle: `${standardTitle} | Delivery Group Standards | Defra Digital Assurance`,
      heading: standardTitle,
      standardNumber: standardNum
    })
  }
}
