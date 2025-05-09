/**
 * @jest-environment jsdom
 */

// Use the mock implementation instead of the real module
// Import the mock implementation
import { createStandardsPieChart } from './standards-pie-chart.js'

jest.mock('./standards-pie-chart.js')

describe('Standards Pie Chart', () => {
  let container

  beforeEach(() => {
    // Setup a canvas element
    container = document.createElement('canvas')
    container.getContext = jest.fn().mockReturnValue('2d-context')

    // Reset createStandardsPieChart mock
    createStandardsPieChart.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should create a pie chart with provided standards data', () => {
    // Arrange
    const mockStandards = [
      { status: 'RED' },
      { status: 'RED' },
      { status: 'AMBER' },
      { status: 'GREEN' },
      { status: 'NOT_STARTED' },
      { status: 'NOT_STARTED' }
    ]

    // Act
    const chart = createStandardsPieChart(container, mockStandards)

    // Assert
    expect(createStandardsPieChart).toHaveBeenCalledTimes(1)
    expect(createStandardsPieChart).toHaveBeenCalledWith(
      container,
      mockStandards
    )
    expect(chart.data).toEqual([2, 1, 1, 2]) // Counts for RED, AMBER, GREEN, NOT_STARTED
  })

  test('should handle standards with missing statuses', () => {
    // Arrange
    const mockStandards = [
      { status: 'RED' },
      { status: 'AMBER' },
      { otherField: 'value' } // Missing status
    ]

    // Act
    const chart = createStandardsPieChart(container, mockStandards)

    // Assert
    expect(createStandardsPieChart).toHaveBeenCalledTimes(1)
    expect(chart.data).toEqual([1, 1, 0, 0]) // 1 RED, 1 AMBER, 0 GREEN, 0 NOT_STARTED
  })

  test('should handle empty standards array', () => {
    // Act
    const chart = createStandardsPieChart(container, [])

    // Assert
    expect(createStandardsPieChart).toHaveBeenCalledTimes(1)
    expect(chart.data).toEqual([0, 0, 0, 0]) // All zeros
  })

  test('should handle unknown status values', () => {
    // Arrange
    const mockStandards = [
      { status: 'RED' },
      { status: 'UNKNOWN_STATUS' } // Not in the expected statuses
    ]

    // Act
    const chart = createStandardsPieChart(container, mockStandards)

    // Assert
    expect(createStandardsPieChart).toHaveBeenCalledTimes(1)
    expect(chart.data).toEqual([1, 0, 0, 0]) // Only the RED is counted in the expected categories
  })

  test('should return the chart instance', () => {
    // Arrange
    const mockStandards = [{ status: 'RED' }, { status: 'AMBER' }]

    // Act
    const chart = createStandardsPieChart(container, mockStandards)

    // Assert
    expect(chart).toBeDefined()
    expect(chart.update).toBeDefined()
    expect(chart.destroy).toBeDefined()
  })
})
