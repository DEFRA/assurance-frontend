/**
 * @jest-environment jsdom
 */

// Now import the module that uses Chart.js
import { createStandardsPieChart } from './standards-pie-chart.js'

// Mock Chart.js before importing modules that use it
jest.mock('chart.js', () => {
  return {
    Chart: class MockChart {
      constructor(ctx, config) {
        this.type = config.type
        this.data = config.data
        this.options = config.options
        this.ctx = ctx
        this.update = jest.fn()
        this.destroy = jest.fn()
      }

      static register() {
        // Mock implementation - does nothing
      }
    },
    // Mock all chart components
    ArcElement: class {},
    Tooltip: class {},
    Legend: class {},
    PieController: class {}
  }
})

describe('Standards Pie Chart', () => {
  let container

  beforeEach(() => {
    // Setup a canvas element
    container = document.createElement('canvas')
    container.getContext = jest.fn().mockReturnValue('2d-context')
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
    expect(chart.type).toBe('pie')

    // Verify data counts
    const chartData = chart.data.datasets[0].data

    // Counts for RED, AMBER, GREEN, NOT_STARTED
    expect(chartData).toEqual([2, 1, 1, 2])
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
    const chartData = chart.data.datasets[0].data

    // 1 RED, 1 AMBER, 0 GREEN, 0 NOT_STARTED
    expect(chartData).toEqual([1, 1, 0, 0])
  })

  test('should handle empty standards array', () => {
    // Act
    const chart = createStandardsPieChart(container, [])

    // Assert
    const chartData = chart.data.datasets[0].data

    // All zeros
    expect(chartData).toEqual([0, 0, 0, 0])
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
    const chartData = chart.data.datasets[0].data

    // Only the RED is counted in the expected categories
    expect(chartData).toEqual([1, 0, 0, 0])
  })

  test('should configure correct colors for each status', () => {
    // Arrange
    const mockStandards = [
      { status: 'RED' },
      { status: 'AMBER' },
      { status: 'GREEN' },
      { status: 'NOT_STARTED' }
    ]

    // Act
    const chart = createStandardsPieChart(container, mockStandards)

    // Assert
    const backgroundColor = chart.data.datasets[0].backgroundColor

    // Check GDS color values
    expect(backgroundColor).toEqual([
      '#d4351c', // GDS Red
      '#f47738', // GDS Amber
      '#00703c', // GDS Green
      '#b1b4b6' // GDS Grey
    ])
  })
})
