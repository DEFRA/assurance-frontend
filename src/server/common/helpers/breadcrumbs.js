/**
 * Breadcrumb helper functions for consistent navigation
 */

/**
 * Base breadcrumb items
 */
const BASE_BREADCRUMBS = {
  HOME: {
    text: 'Home',
    href: '/'
  },
  PROJECTS: {
    text: 'Deliveries',
    href: '/projects'
  },
  DELIVERY_GROUPS: {
    text: 'Delivery Groups',
    href: '/delivery-groups'
  },
  DELIVERY_PARTNERS: {
    text: 'Delivery Partners',
    href: '/delivery-partners'
  },
  ADMIN: {
    text: 'Admin',
    href: '/admin'
  }
}

/**
 * Generate breadcrumbs for the home page
 * @returns {Array} Empty array (no breadcrumbs for home)
 */
export function getHomeBreadcrumbs() {
  return []
}

/**
 * Generate breadcrumbs for the projects list page
 * @returns {Array} Breadcrumb items
 */
export function getProjectsBreadcrumbs() {
  return [
    BASE_BREADCRUMBS.HOME,
    { text: 'Deliveries' } // Current page, no href
  ]
}

/**
 * Generate breadcrumbs for a specific project page
 * @param {string} projectName - The name of the project
 * @returns {Array} Breadcrumb items
 */
export function getProjectDetailBreadcrumbs(projectName) {
  return [
    BASE_BREADCRUMBS.HOME,
    BASE_BREADCRUMBS.PROJECTS,
    { text: projectName } // Current page, no href
  ]
}

/**
 * Generate breadcrumbs for project sub-pages (standards, history, etc.)
 * @param {string} projectName - The name of the project
 * @param {string} projectId - The ID of the project
 * @param {string} subPageName - The name of the sub-page
 * @returns {Array} Breadcrumb items
 */
export function getProjectSubPageBreadcrumbs(
  projectName,
  projectId,
  subPageName
) {
  return [
    BASE_BREADCRUMBS.HOME,
    BASE_BREADCRUMBS.PROJECTS,
    {
      text: projectName,
      href: `/projects/${projectId}`
    },
    { text: subPageName } // Current page, no href
  ]
}

/**
 * Generate breadcrumbs for the delivery groups list page
 * Note: This function exists for completeness but may not be used if no list page exists
 * @returns {Array} Breadcrumb items
 */
export function getDeliveryGroupsBreadcrumbs() {
  return [
    BASE_BREADCRUMBS.HOME,
    { text: 'Delivery Groups' } // Current page, no href
  ]
}

/**
 * Generate breadcrumbs for a specific delivery group page
 * Delivery groups are accessed directly from home sidebar, so parent is Home
 * @param {string} groupName - The name of the delivery group
 * @returns {Array} Breadcrumb items
 */
export function getDeliveryGroupDetailBreadcrumbs(groupName) {
  return [
    BASE_BREADCRUMBS.HOME,
    { text: groupName } // Current page, no href
  ]
}

/**
 * Generate breadcrumbs for the delivery partners list page
 * Note: This function exists for completeness but may not be used if no list page exists
 * @returns {Array} Breadcrumb items
 */
export function getDeliveryPartnersBreadcrumbs() {
  return [
    BASE_BREADCRUMBS.HOME,
    { text: 'Delivery Partners' } // Current page, no href
  ]
}

/**
 * Generate breadcrumbs for a specific delivery partner page
 * Delivery partners are accessed directly from home sidebar, so parent is Home
 * @param {string} partnerName - The name of the delivery partner
 * @returns {Array} Breadcrumb items
 */
export function getDeliveryPartnerDetailBreadcrumbs(partnerName) {
  return [
    BASE_BREADCRUMBS.HOME,
    { text: partnerName } // Current page, no href
  ]
}

/**
 * Generate breadcrumbs for admin pages
 * @param {string} [subPageName] - Optional sub-page name
 * @returns {Array} Breadcrumb items
 */
export function getAdminBreadcrumbs(subPageName = null) {
  const breadcrumbs = [
    BASE_BREADCRUMBS.HOME,
    subPageName ? BASE_BREADCRUMBS.ADMIN : { text: 'Admin' }
  ]

  if (subPageName) {
    breadcrumbs.push({ text: subPageName })
  }

  return breadcrumbs
}

/**
 * Truncate long text for breadcrumbs
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export function truncateBreadcrumbText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - 3) + '...'
}
