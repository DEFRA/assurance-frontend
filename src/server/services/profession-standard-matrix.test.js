import {
  filterStandardsByProfessionAndPhase,
  PROFESSION_STANDARD_MATRIX
} from './profession-standard-matrix.js'

describe('Profession Standard Matrix Service', () => {
  const mockServiceStandards = [
    { id: 'std-1', number: '1', name: 'Understand users and their needs' },
    { id: 'std-2', number: '2', name: 'Solve a whole problem for users' },
    {
      id: 'std-3',
      number: '3',
      name: 'Provide a joined up experience across all channels'
    },
    { id: 'std-4', number: '4', name: 'Make the service simple to use' },
    {
      id: 'std-5',
      number: '5',
      name: 'Make sure everyone can use the service'
    },
    { id: 'std-6', number: '6', name: 'Have a multidisciplinary team' },
    { id: 'std-7', number: '7', name: 'Use agile ways of working' },
    { id: 'std-8', number: '8', name: 'Iterate and improve frequently' },
    {
      id: 'std-9',
      number: '9',
      name: "Create a secure service which protects users' privacy"
    },
    {
      id: 'std-10',
      number: '10',
      name: 'Define what success looks like and publish performance data'
    },
    {
      id: 'std-11',
      number: '11',
      name: 'Choose the right tools and technology'
    },
    { id: 'std-12', number: '12', name: 'Make new source code open' },
    {
      id: 'std-13',
      number: '13',
      name: 'Use and contribute to open standards'
    },
    { id: 'std-14', number: '14', name: 'Operate a reliable service' },
    { id: 'std-15', number: '15', name: 'Some additional standard' }
  ]

  describe('PROFESSION_STANDARD_MATRIX constant', () => {
    test('should be defined and contain phase mappings', () => {
      expect(PROFESSION_STANDARD_MATRIX).toBeDefined()
      expect(typeof PROFESSION_STANDARD_MATRIX).toBe('object')
    })

    test('should contain expected phases', () => {
      const expectedPhases = [
        'Discovery',
        'Alpha',
        'Private Beta',
        'Public Beta',
        'Live'
      ]

      expectedPhases.forEach((phase) => {
        expect(PROFESSION_STANDARD_MATRIX).toHaveProperty(phase)
      })
    })

    test('should have profession mappings for each phase', () => {
      const expectedProfessions = [
        'business-analysis',
        'delivery-management',
        'product-management',
        'quality-assurance',
        'release-management',
        'technical-architecture',
        'architecture',
        'software-development',
        'user-centred-design'
      ]

      Object.keys(PROFESSION_STANDARD_MATRIX).forEach((phase) => {
        expectedProfessions.forEach((profession) => {
          expect(PROFESSION_STANDARD_MATRIX[phase]).toHaveProperty(profession)
          expect(
            Array.isArray(PROFESSION_STANDARD_MATRIX[phase][profession])
          ).toBe(true)
        })
      })
    })
  })

  describe('filterStandardsByProfessionAndPhase', () => {
    test('should filter standards for user-centred-design in Discovery phase', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'user-centred-design'
      )

      // Assert
      expect(Array.isArray(result)).toBe(true)
      // The function should parse string numbers correctly now
      expect(result).toHaveLength(6) // Should include standards 1, 2, 3, 4, 5, 6

      // Verify that all returned standards are included in the matrix for this profession/phase
      const expectedStandardNumbers =
        PROFESSION_STANDARD_MATRIX.Discovery['user-centred-design']
      result.forEach((standard) => {
        expect(expectedStandardNumbers).toContain(parseInt(standard.number))
      })
    })

    test('should filter standards for technical-architecture in Alpha phase', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Alpha',
        'technical-architecture'
      )

      // Assert
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(7) // Should include standards 6, 8, 9, 11, 12, 13, 14

      const expectedStandardNumbers =
        PROFESSION_STANDARD_MATRIX.Alpha['technical-architecture']
      result.forEach((standard) => {
        expect(expectedStandardNumbers).toContain(parseInt(standard.number))
      })
    })

    test('should return empty array for unknown profession', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'unknown-profession'
      )

      // Assert
      expect(result).toEqual([])
    })

    test('should return empty array for unknown phase', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Unknown Phase',
        'user-centred-design'
      )

      // Assert
      expect(result).toEqual([])
    })

    test('should return empty array when serviceStandards is null', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        null,
        'Discovery',
        'user-centred-design'
      )

      // Assert
      expect(result).toEqual([])
    })

    test('should return empty array when serviceStandards is undefined', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        undefined,
        'Discovery',
        'user-centred-design'
      )

      // Assert
      expect(result).toEqual([])
    })

    test('should return empty array when serviceStandards is empty array', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        [],
        'Discovery',
        'user-centred-design'
      )

      // Assert
      expect(result).toEqual([])
    })

    test('should return all standards when phase parameter is null', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        null,
        'user-centred-design'
      )

      // Assert
      expect(result).toEqual(mockServiceStandards)
    })

    test('should return all standards when professionId parameter is null', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        null
      )

      // Assert
      expect(result).toEqual(mockServiceStandards)
    })

    test('should handle standards with missing number field', () => {
      // Arrange
      const standardsWithMissingNumbers = [
        { id: 'std-1', name: 'Standard without number' },
        { id: 'std-2', number: '2', name: 'Standard with number' },
        { id: 'std-3', number: null, name: 'Standard with null number' }
      ]

      // Act
      const result = filterStandardsByProfessionAndPhase(
        standardsWithMissingNumbers,
        'Discovery',
        'user-centred-design'
      )

      // Assert
      expect(Array.isArray(result)).toBe(true)
      // Should include the standard with number 2 since it's in the matrix
      const matrixStandards =
        PROFESSION_STANDARD_MATRIX.Discovery['user-centred-design']
      const expectedCount = matrixStandards.includes(2) ? 1 : 0
      expect(result).toHaveLength(expectedCount)
    })

    test('should handle case-sensitive profession IDs', () => {
      // Act
      const resultLowerCase = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'user-centred-design'
      )

      const resultUpperCase = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'USER-CENTRED-DESIGN'
      )

      // Assert
      expect(resultLowerCase).toHaveLength(6) // Should have 6 standards for user-centred-design in Discovery
      expect(resultUpperCase).toHaveLength(0) // Should be case-sensitive
    })

    test('should handle case-sensitive phase names', () => {
      // Act
      const resultCorrectCase = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'user-centred-design'
      )

      const resultWrongCase = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'discovery',
        'user-centred-design'
      )

      // Assert
      expect(resultCorrectCase).toHaveLength(6) // Should have 6 standards for user-centred-design in Discovery
      expect(resultWrongCase).toHaveLength(0) // Should be case-sensitive
    })

    test('should return different results for different phases', () => {
      // Act
      const discoveryResults = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'user-centred-design'
      )

      const liveResults = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Live',
        'user-centred-design'
      )

      // Assert
      // Discovery should have 6 standards [1,2,3,4,5,6], Live should have 5 standards [1,2,3,4,5]
      expect(discoveryResults).toHaveLength(6)
      expect(liveResults).toHaveLength(5)
      expect(discoveryResults).not.toEqual(liveResults)
    })

    test('should return different results for different professions in same phase', () => {
      // Act
      const userCentredResults = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'user-centred-design'
      )

      const deliveryResults = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'delivery-management'
      )

      // Assert
      // user-centred-design has [1,2,3,4,5,6], delivery-management has [4,5,6,7,8]
      expect(userCentredResults).toHaveLength(6)
      expect(deliveryResults).toHaveLength(5)
      expect(userCentredResults).not.toEqual(deliveryResults)
    })

    test('should handle all supported phases for each profession', () => {
      const phases = [
        'Discovery',
        'Alpha',
        'Private Beta',
        'Public Beta',
        'Live'
      ]
      const professions = Object.keys(PROFESSION_STANDARD_MATRIX.Discovery)

      professions.forEach((profession) => {
        phases.forEach((phase) => {
          // Act
          const result = filterStandardsByProfessionAndPhase(
            mockServiceStandards,
            phase,
            profession
          )

          // Assert
          expect(Array.isArray(result)).toBe(true)

          // Verify that results match the expected standards from the matrix
          const expectedStandards =
            PROFESSION_STANDARD_MATRIX[phase][profession]
          expect(result).toHaveLength(expectedStandards.length)

          // Verify all returned standards are in the expected list
          result.forEach((standard) => {
            expect(expectedStandards).toContain(parseInt(standard.number))
          })
        })
      })
    })

    test('should maintain original standard object structure', () => {
      // Act
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'user-centred-design'
      )

      // Assert
      expect(result).toHaveLength(6) // Should have 6 standards for user-centred-design in Discovery

      // Test the first standard's structure
      const firstStandard = result[0]
      expect(firstStandard).toHaveProperty('id')
      expect(firstStandard).toHaveProperty('number')
      expect(firstStandard).toHaveProperty('name')

      // Verify it's the same object reference as the original
      const originalStandard = mockServiceStandards.find(
        (s) => s.id === firstStandard.id
      )
      expect(firstStandard).toBe(originalStandard)
    })

    test('should handle standards with string numbers', () => {
      // Arrange
      const standardsWithStringNumbers = [
        { id: 'std-1', number: '1', name: 'Standard 1' },
        { id: 'std-2', number: '02', name: 'Standard 2 with leading zero' },
        { id: 'std-3', number: '10', name: 'Standard 10' }
      ]

      // Act
      const result = filterStandardsByProfessionAndPhase(
        standardsWithStringNumbers,
        'Discovery',
        'user-centred-design'
      )

      // Assert
      expect(Array.isArray(result)).toBe(true)
      // Should handle string number comparisons correctly
    })

    test('should handle large number of standards efficiently', () => {
      // Arrange
      const largeStandardsList = Array.from({ length: 1000 }, (_, i) => ({
        id: `std-${i}`,
        number: `${i + 1}`,
        name: `Standard ${i + 1}`
      }))

      // Act
      const startTime = Date.now()
      const result = filterStandardsByProfessionAndPhase(
        largeStandardsList,
        'Discovery',
        'user-centred-design'
      )
      const endTime = Date.now()

      // Assert
      expect(Array.isArray(result)).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
    })

    test('should return standards for profession that now has standards in Discovery phase', () => {
      // Act - business-analysis now has standards [6,7] in Discovery phase
      const result = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'business-analysis'
      )

      // Assert
      expect(result).toHaveLength(2) // Should include standards 6 and 7
    })

    test('should handle professions that have standards in some phases but not others', () => {
      // Act - business-analysis has standards in Discovery but none in Live
      const discoveryResult = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Discovery',
        'business-analysis'
      )

      const liveResult = filterStandardsByProfessionAndPhase(
        mockServiceStandards,
        'Live',
        'business-analysis'
      )

      // Assert
      expect(discoveryResult).toHaveLength(2) // business-analysis has [6,7] in Discovery
      expect(liveResult).toEqual([]) // business-analysis has [] in Live
    })
  })
})
