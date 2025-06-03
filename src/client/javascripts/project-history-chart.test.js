/**
 * @jest-environment jsdom
 */

// Now import the module that uses Chart.js
import { createProjectHistoryChart } from './project-history-chart.js'

// Mock date adapter before imports
jest.mock('chartjs-adapter-date-fns', () => {
  // Empty mock implementation
})

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
    LineElement: class {},
    PointElement: class {},
    LinearScale: class {},
    TimeScale: class {},
    CategoryScale: class {},
    LineController: class {},
    Tooltip: class {}
  }
})

describe('Project History Chart', () => {
  let container

  beforeEach(() => {
    // Setup a canvas element
    container = document.createElement('canvas')
    container.getContext = jest.fn().mockReturnValue('2d-context')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should create a chart with provided history data', () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2023-01-01T12:00:00Z',
        changes: {
          status: {
            to: 'GREEN'
          }
        }
      },
      {
        timestamp: '2023-02-01T12:00:00Z',
        changes: {
          status: 'AMBER'
        }
      },
      {
        timestamp: '2023-03-01T12:00:00Z',
        status: 'RED'
      }
    ]

    // Act
    const chart = createProjectHistoryChart(container, mockHistory)

    // Assert
    expect(chart.type).toBe('line')

    const chartData = chart.data.datasets[0].data
    expect(chartData).toHaveLength(3)

    // Check status mapping
    expect(chartData[0].status).toBe('GREEN')
    expect(chartData[0].y).toBe(3) // GREEN = 3

    expect(chartData[1].status).toBe('AMBER')
    expect(chartData[1].y).toBe(2) // AMBER = 2

    expect(chartData[2].status).toBe('RED')
    expect(chartData[2].y).toBe(1) // RED = 1
  })

  test('should filter out entries without status information', () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2023-01-01T12:00:00Z',
        changes: {
          status: {
            to: 'GREEN'
          }
        }
      },
      {
        timestamp: '2023-02-01T12:00:00Z',
        changes: {
          // No status information
          otherField: 'value'
        }
      },
      {
        timestamp: '2023-03-01T12:00:00Z',
        // No status information
        otherField: 'value'
      }
    ]

    // Act
    const chart = createProjectHistoryChart(container, mockHistory)

    // Assert
    const chartData = chart.data.datasets[0].data

    // Only one data point should have status information
    expect(chartData).toHaveLength(1)
    expect(chartData[0].status).toBe('GREEN')
  })

  test('should sort history entries by date', () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2023-03-01T12:00:00Z',
        status: 'RED'
      },
      {
        timestamp: '2023-01-01T12:00:00Z',
        changes: {
          status: {
            to: 'GREEN'
          }
        }
      },
      {
        timestamp: '2023-02-01T12:00:00Z',
        changes: {
          status: 'AMBER'
        }
      }
    ]

    // Act
    const chart = createProjectHistoryChart(container, mockHistory)

    // Assert
    const chartData = chart.data.datasets[0].data

    // Check if data is sorted by date
    expect(chartData[0].x.getMonth()).toBe(0) // January
    expect(chartData[1].x.getMonth()).toBe(1) // February
    expect(chartData[2].x.getMonth()).toBe(2) // March

    // Check if statuses are in correct order after sorting
    expect(chartData[0].status).toBe('GREEN')
    expect(chartData[1].status).toBe('AMBER')
    expect(chartData[2].status).toBe('RED')
  })

  test('should set default value for invalid status', () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2023-01-01T12:00:00Z',
        changes: {
          status: {
            to: 'INVALID_STATUS'
          }
        }
      }
    ]

    // Act
    const chart = createProjectHistoryChart(container, mockHistory)

    // Assert
    const chartData = chart.data.datasets[0].data

    expect(chartData[0].y).toBe(0) // Default to TBC (0)
  })

  test('should handle empty history array', () => {
    // Act
    const chart = createProjectHistoryChart(container, [])

    // Assert
    const chartData = chart.data.datasets[0].data

    expect(chartData).toHaveLength(0)
  })
})
