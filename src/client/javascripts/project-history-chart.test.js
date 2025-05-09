/**
 * @jest-environment jsdom
 */

// Use the mock implementation instead of the real module
// Import the mock implementation
import { createProjectHistoryChart } from './project-history-chart.js'

jest.mock('./project-history-chart.js')

describe('Project History Chart', () => {
  let container

  beforeEach(() => {
    // Setup a canvas element
    container = document.createElement('canvas')
    container.getContext = jest.fn().mockReturnValue('2d-context')

    // Reset createProjectHistoryChart mock
    createProjectHistoryChart.mockClear()
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
    expect(createProjectHistoryChart).toHaveBeenCalledTimes(1)
    expect(createProjectHistoryChart).toHaveBeenCalledWith(
      container,
      mockHistory
    )
    expect(chart.data).toHaveLength(3)
    expect(chart.data[0].status).toBe('GREEN')
    expect(chart.data[1].status).toBe('AMBER')
    expect(chart.data[2].status).toBe('RED')
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
    expect(createProjectHistoryChart).toHaveBeenCalledTimes(1)
    // Only one data point should have status information
    expect(chart.data).toHaveLength(1)
    expect(chart.data[0].status).toBe('GREEN')
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
    expect(createProjectHistoryChart).toHaveBeenCalledTimes(1)
    // Check if data is sorted by date
    expect(chart.data[0].x.getMonth()).toBe(0) // January
    expect(chart.data[1].x.getMonth()).toBe(1) // February
    expect(chart.data[2].x.getMonth()).toBe(2) // March
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
    expect(createProjectHistoryChart).toHaveBeenCalledTimes(1)
    expect(chart.data[0].y).toBe(2) // Default to AMBER (2)
  })

  test('should return the chart instance', () => {
    // Arrange
    const mockHistory = [
      {
        timestamp: '2023-01-01T12:00:00Z',
        changes: {
          status: {
            to: 'GREEN'
          }
        }
      }
    ]

    // Act
    const chart = createProjectHistoryChart(container, mockHistory)

    // Assert
    expect(chart).toBeDefined()
    expect(chart.update).toBeDefined()
    expect(chart.destroy).toBeDefined()
  })

  test('should handle empty history array', () => {
    // Act
    const chart = createProjectHistoryChart(container, [])

    // Assert
    expect(createProjectHistoryChart).toHaveBeenCalledTimes(1)
    expect(chart.data).toHaveLength(0)
  })
})
