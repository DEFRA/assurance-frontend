// Profession-Standard matrix based on the Digital Delivery Tracker survey analysis
// This determines which standards are available to each profession in each phase

export const PROFESSION_STANDARD_MATRIX = {
  Discovery: {
    'business-analysis': [6, 7],
    'delivery-management': [4, 5, 6, 7, 8],
    'product-management': [2, 6, 10],
    'quality-assurance': [6, 14],
    'release-management': [],
    'technical-architecture': [6, 11, 12, 13, 14],
    architecture: [6, 11, 12, 13, 14], // Same as technical-architecture
    'software-development': [6, 9, 11, 12, 13, 14], // Added standard 9
    'user-centred-design': [1, 2, 3, 4, 5, 6]
  },

  Alpha: {
    'business-analysis': [7, 11],
    'delivery-management': [4, 5, 6, 7, 8],
    'product-management': [2, 3, 6, 7, 10],
    'quality-assurance': [3, 4, 5, 8, 9, 11, 14],
    'release-management': [14],
    'technical-architecture': [6, 8, 9, 11, 12, 13, 14],
    architecture: [6, 8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'software-development': [6, 8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'user-centred-design': [1, 2, 3, 4, 5]
  },

  'Private Beta': {
    'business-analysis': [7, 11],
    'delivery-management': [4, 5, 6, 7, 8],
    'product-management': [2, 3, 6, 7, 10, 14],
    'quality-assurance': [3, 4, 5, 8, 9, 11, 14],
    'release-management': [7, 14],
    'technical-architecture': [8, 9, 11, 12, 13, 14],
    architecture: [8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'software-development': [8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'user-centred-design': [1, 2, 3, 4, 5]
  },

  'Public Beta': {
    'business-analysis': [7],
    'delivery-management': [4, 5, 6, 7, 8],
    'product-management': [2, 3, 6, 7, 10, 14],
    'quality-assurance': [3, 4, 5, 8, 9, 11, 14],
    'release-management': [14],
    'technical-architecture': [8, 9, 11, 12, 13, 14],
    architecture: [8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'software-development': [8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'user-centred-design': [1, 2, 3, 4, 5]
  },

  Live: {
    'business-analysis': [],
    'delivery-management': [7, 8, 10, 14],
    'product-management': [3, 6, 8, 10, 14],
    'quality-assurance': [3, 8, 9, 11, 14],
    'release-management': [14],
    'technical-architecture': [8, 9, 11, 12, 13, 14],
    architecture: [8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'software-development': [8, 9, 11, 12, 13, 14], // Same as technical-architecture
    'user-centred-design': [1, 2, 3, 4, 5]
  }
}

/**
 * Get the standards that are available for a specific profession in a specific phase
 * @param {string} phase - The project phase (Discovery, Alpha, Private Beta, Public Beta, Live)
 * @param {string} professionId - The profession ID
 * @returns {number[]} Array of standard numbers available for this profession in this phase
 */
export function getAvailableStandards(phase, professionId) {
  if (!PROFESSION_STANDARD_MATRIX[phase]) {
    // Log warning for unknown phase
    return []
  }

  if (!PROFESSION_STANDARD_MATRIX[phase][professionId]) {
    // Log warning for unknown profession
    return []
  }

  return PROFESSION_STANDARD_MATRIX[phase][professionId] || []
}

/**
 * Check if a profession can assess a specific standard in a specific phase
 * @param {string} phase - The project phase
 * @param {string} professionId - The profession ID
 * @param {number} standardNumber - The standard number
 * @returns {boolean} True if the profession can assess this standard in this phase
 */
export function canAssessStandard(phase, professionId, standardNumber) {
  const availableStandards = getAvailableStandards(phase, professionId)
  return availableStandards.includes(standardNumber)
}

/**
 * Filter standards list based on profession and phase
 * @param {Array} allStandards - All available standards
 * @param {string} phase - The project phase
 * @param {string} professionId - The profession ID
 * @returns {Array} Filtered standards that this profession can assess
 */
export function filterStandardsByProfessionAndPhase(
  allStandards,
  phase,
  professionId
) {
  if (!phase || !professionId || !allStandards) {
    return allStandards || []
  }

  const availableStandardNumbers = getAvailableStandards(phase, professionId)

  return allStandards.filter((standard) => {
    // Match by number field or by parsing number from name - always convert to integer
    const standardNumber = standard.number
      ? parseInt(standard.number)
      : parseInt(standard.name?.match(/^\d+/)?.[0])
    return availableStandardNumbers.includes(standardNumber)
  })
}

/**
 * Get all professions that can assess a specific standard in a specific phase
 * @param {string} phase - The project phase
 * @param {number} standardNumber - The standard number
 * @returns {string[]} Array of profession IDs that can assess this standard
 */
export function getProfessionsForStandard(phase, standardNumber) {
  if (!PROFESSION_STANDARD_MATRIX[phase]) {
    return []
  }

  const professions = []
  for (const [professionId, standards] of Object.entries(
    PROFESSION_STANDARD_MATRIX[phase]
  )) {
    if (standards.includes(standardNumber)) {
      professions.push(professionId)
    }
  }

  return professions
}
