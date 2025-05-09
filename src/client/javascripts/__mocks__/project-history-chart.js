// Mock implementation of project-history-chart.js
export const createProjectHistoryChart = jest
  .fn()
  .mockImplementation((container, history) => {
    // Process history data for test assertions
    const data = history
      .filter((entry) => {
        return (
          entry?.changes?.status?.to || entry?.changes?.status || entry.status
        )
      })
      .map((entry) => {
        let status
        if (entry.changes?.status?.to) {
          status = entry.changes.status.to
        } else if (typeof entry.changes?.status === 'string') {
          status = entry.changes.status
        } else if (entry.status) {
          status = entry.status
        } else {
          return null
        }

        const statusToValue = {
          RED: 1,
          AMBER: 2,
          GREEN: 3
        }

        return {
          x: new Date(entry.timestamp),
          y: statusToValue[status] || 2, // Default to AMBER if invalid status
          status
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.x - b.x)

    // Return a mock chart object
    return {
      data,
      update: jest.fn(),
      destroy: jest.fn()
    }
  })
