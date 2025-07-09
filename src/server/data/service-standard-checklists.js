/**
 * Service Standard Assessment Checklists
 * Provides guidance and checklists for each GOV.UK Service Standard
 */

export const serviceStandardChecklists = {
  1: {
    title: 'Understand users and their needs',
    url: 'https://www.gov.uk/service-manual/service-standard/point-1-understand-user-needs',
    checklist: [
      'User research has been conducted to understand user needs',
      'User personas and user journey maps have been created',
      'Accessibility needs have been identified and documented',
      'User needs are prioritized and regularly reviewed',
      'Evidence of user research findings is documented and shared'
    ]
  },
  2: {
    title: 'Solve a whole problem',
    url: 'https://www.gov.uk/service-manual/service-standard/point-2-solve-a-whole-problem',
    checklist: [
      'The whole user journey has been mapped and understood',
      'Handoffs between different parts of government are identified',
      'Pain points in the current process have been documented',
      'The service addresses the complete user need, not just part of it',
      'Integration points with other services have been considered'
    ]
  },
  3: {
    title: 'Provide a joined up experience across all channels',
    url: 'https://www.gov.uk/service-manual/service-standard/point-3-join-up-across-channels',
    checklist: [
      'All service channels (online, phone, face-to-face) are consistent',
      'Users can switch between channels without repeating information',
      'Staff across all channels have access to the same information',
      'Channel preferences and accessibility needs are accommodated',
      'The service works equally well across all channels'
    ]
  },
  4: {
    title: 'Make the service simple to use',
    url: 'https://www.gov.uk/service-manual/service-standard/point-4-make-the-service-simple-to-use',
    checklist: [
      'The service follows GOV.UK Design System patterns and components',
      'User journey is as simple and straightforward as possible',
      'Content is written in plain English and tested with users',
      'Forms and interactions are intuitive and minimize cognitive load',
      'Error messages are clear and help users complete their task'
    ]
  },
  5: {
    title: 'Make sure everyone can use the service',
    url: 'https://www.gov.uk/service-manual/service-standard/point-5-make-sure-everyone-can-use-the-service',
    checklist: [
      'Service meets WCAG 2.2 AA accessibility standards',
      'Accessibility testing has been conducted with assistive technologies',
      'Service works with users who have low digital skills',
      'Alternative routes are available for users who cannot use digital channels',
      'Service has been tested with users with disabilities'
    ]
  },
  6: {
    title: 'Have a multidisciplinary team',
    url: 'https://www.gov.uk/service-manual/service-standard/point-6-have-a-multidisciplinary-team',
    checklist: [
      'Team includes appropriate roles (product manager, delivery manager, etc.)',
      'User researcher is embedded in the team',
      'Service designer and interaction designer are part of the team',
      'Developer and technical architect roles are filled',
      'Content designer is involved in service development'
    ]
  },
  7: {
    title: 'Use agile ways of working',
    url: 'https://www.gov.uk/service-manual/service-standard/point-7-use-agile-ways-of-working',
    checklist: [
      'Team follows agile methodology (Scrum, Kanban, etc.)',
      'Regular sprint reviews and retrospectives are conducted',
      'User stories are written and prioritized in a backlog',
      'Work is delivered in small, frequent iterations',
      'Team adapts and responds to change effectively'
    ]
  },
  8: {
    title: 'Iterate and improve frequently',
    url: 'https://www.gov.uk/service-manual/service-standard/point-8-iterate-and-improve-frequently',
    checklist: [
      'Performance data is collected and analyzed regularly',
      'User feedback mechanisms are in place and monitored',
      'Service improvements are prioritized based on user needs and data',
      'A/B testing or other experimentation methods are used',
      'Changes are deployed frequently and safely'
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
      'Key performance indicators (KPIs) have been defined',
      'Performance data is collected and monitored continuously',
      'Success metrics align with user needs and business objectives',
      'Performance data is published and accessible to users',
      'Regular performance reviews are conducted and acted upon'
    ]
  },
  11: {
    title: 'Choose the right tools and technology',
    url: 'https://www.gov.uk/service-manual/service-standard/point-11-choose-the-right-tools-and-technology',
    checklist: [
      'Technology choices are justified and documented',
      'Vendor lock-in risks have been assessed and mitigated',
      'Technology stack supports accessibility and performance requirements',
      'Open source solutions have been considered where appropriate',
      'Technology decisions align with government technology strategy'
    ]
  },
  12: {
    title: 'Make new source code open',
    url: 'https://www.gov.uk/service-manual/service-standard/point-12-make-new-source-code-open',
    checklist: [
      'Source code is published under an open source license',
      'Code repositories are public and accessible',
      'Sensitive configuration and secrets are properly managed',
      'Code follows coding standards and is well-documented',
      'Contributing guidelines are provided for external contributors'
    ]
  },
  13: {
    title:
      'Use and contribute to open standards, common components and patterns',
    url: 'https://www.gov.uk/service-manual/service-standard/point-13-use-common-standards-components-patterns',
    checklist: [
      'GOV.UK Design System components and patterns are used',
      'Service follows government open standards for technology',
      'Reusable components are identified and shared',
      'APIs follow government API standards',
      'Service contributes back to common patterns and components'
    ]
  },
  14: {
    title: 'Operate a reliable service',
    url: 'https://www.gov.uk/service-manual/service-standard/point-14-operate-a-reliable-service',
    checklist: [
      'Service meets agreed uptime and performance targets',
      'Monitoring and alerting systems are in place',
      'Incident response procedures are documented and tested',
      'Backup and disaster recovery processes are established',
      'Service desk and support processes are operational'
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
