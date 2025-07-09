/**
 * Service Standard Assessment Checklists
 * Provides guidance and checklists for each GOV.UK Service Standard
 */

export const serviceStandardChecklists = {
  1: {
    title: 'Understand users and their needs',
    url: 'https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs',
    checklist: [
      'The team has done user research to understand what users need',
      'The team understands how users currently meet their needs',
      'The team can show that their understanding of user needs is based on evidence',
      'The team understands the different ways users access the service',
      'The team has identified users who struggle to use digital services'
    ]
  },
  2: {
    title: 'Solve a whole problem',
    url: 'https://www.gov.uk/service-manual/service-standard/point-2-solve-a-whole-problem',
    checklist: [
      'The team understands the problem that needs to be solved',
      'The team has mapped the entire user journey across all channels',
      'The team has identified other organisations involved in the user journey',
      'The team has planned to work with other organisations where needed',
      'The service works to fix the whole problem, not just the part the organisation owns'
    ]
  },
  3: {
    title: 'Provide a joined up experience across all channels',
    url: 'https://www.gov.uk/service-manual/service-standard/point-3-join-up-across-channels',
    checklist: [
      'The team understands how users move between different channels',
      'The service works consistently across all channels',
      'Users can move between digital and non-digital channels without repeating information',
      'Staff across all channels can access the same information about users',
      'The service has ways to support users who cannot use digital channels'
    ]
  },
  4: {
    title: 'Make the service simple to use',
    url: 'https://www.gov.uk/service-manual/service-standard/point-4-make-the-service-simple-to-use',
    checklist: [
      'The service uses the GOV.UK Design System where possible',
      'Users can complete their task the first time they try',
      'The team has tested the service with users and iterated based on feedback',
      'The service asks users for information only when needed',
      'Error messages help users understand what has gone wrong and how to fix it'
    ]
  },
  5: {
    title: 'Make sure everyone can use the service',
    url: 'https://www.gov.uk/service-manual/service-standard/point-5-make-sure-everyone-can-use-the-service',
    checklist: [
      'The team has done research with users who have access needs',
      'The service meets accessibility standards (WCAG 2.2 to level AA)',
      'The team has tested the service with assistive technologies',
      'The service has a plan to support users who cannot use the digital service',
      'The team has considered the digital skills and confidence of users'
    ]
  },
  6: {
    title: 'Have a multidisciplinary team',
    url: 'https://www.gov.uk/service-manual/service-standard/point-6-have-a-multidisciplinary-team',
    checklist: [
      'The team has a product manager who understands user needs',
      'The team has a delivery manager who can remove blockers',
      'The team has a user researcher who works with the team regularly',
      'The team has designers who understand user needs and can design for accessibility',
      'The team has developers who can build and maintain the service'
    ]
  },
  7: {
    title: 'Use agile ways of working',
    url: 'https://www.gov.uk/service-manual/service-standard/point-7-use-agile-ways-of-working',
    checklist: [
      'The team works in small iterations and releases often',
      'The team tests ideas with users regularly',
      'The team has a clear process for prioritising work',
      'The team reviews and improves ways of working regularly',
      'The team can respond to changes in user needs or policy'
    ]
  },
  8: {
    title: 'Iterate and improve frequently',
    url: 'https://www.gov.uk/service-manual/service-standard/point-8-iterate-and-improve-frequently',
    checklist: [
      'The service has analytics set up to measure user behaviour',
      'The team collects feedback from users and acts on it',
      'The team uses data to make decisions about improvements',
      'The team tests changes with users before releasing them',
      'The team has a plan for ongoing user research'
    ]
  },
  9: {
    title: 'Create a secure service',
    url: 'https://www.gov.uk/service-manual/service-standard/point-9-create-a-secure-service',
    checklist: [
      'A Data Privacy Impact Assessment has been completed',
      'Security analysis of source code, dependencies and containers if applicable',
      'Authentication and authorisation on both the frontend and backend',
      'ITHC has been arranged or conducted regularly, findings are reviewed and remediated',
      'Integration with the security operations centre if applicable'
    ]
  },
  10: {
    title: 'Define what success looks like and publish performance data',
    url: 'https://www.gov.uk/service-manual/service-standard/point-10-define-success-publish-performance-data',
    checklist: [
      'The team has identified metrics that tell them if the service is solving the problem',
      'The service collects data that shows how well it is performing',
      'The team uses data to improve the service',
      'The service publishes performance data regularly',
      'The data helps the team understand user behaviour and needs'
    ]
  },
  11: {
    title: 'Choose the right tools and technology',
    url: 'https://www.gov.uk/service-manual/service-standard/point-11-choose-the-right-tools-and-technology',
    checklist: [
      'The team has chosen technology that meets user needs',
      'The team has considered the total cost of ownership',
      'The team has avoided vendor lock-in where possible',
      'The technology choices support accessibility requirements',
      'The team has documented why they chose specific technologies'
    ]
  },
  12: {
    title: 'Make new source code open',
    url: 'https://www.gov.uk/service-manual/service-standard/point-12-make-new-source-code-open',
    checklist: [
      'The team has published source code in an open repository',
      'The team has used an appropriate open source licence',
      'The team has documented code so others can understand it',
      'The team has removed sensitive data and configuration from public code',
      'The team has a plan for maintaining and updating the code'
    ]
  },
  13: {
    title:
      'Use and contribute to open standards, common components and patterns',
    url: 'https://www.gov.uk/service-manual/service-standard/point-13-use-common-standards-components-patterns',
    checklist: [
      'The service uses GOV.UK Design System components and patterns',
      'The team has followed government open standards where they exist',
      'The team has contributed to common patterns or components where possible',
      'The service APIs follow government standards',
      'The team has shared what they have learnt with the wider community'
    ]
  },
  14: {
    title: 'Operate a reliable service',
    url: 'https://www.gov.uk/service-manual/service-standard/point-14-operate-a-reliable-service',
    checklist: [
      'The service has processes for monitoring its health',
      'The team can quickly identify and fix problems',
      'The team has a plan for dealing with outages and incidents',
      'The service has adequate support arrangements for users',
      'The team regularly tests backup and recovery processes'
    ]
  }
}

/**
 * Get checklist for a specific service standard
 * @param {number} standardNumber - The service standard number (1-14)
 * @returns {object|null} - The checklist object or null if not found
 */
export function getStandardChecklist(standardNumber) {
  return serviceStandardChecklists[standardNumber] || null
}
