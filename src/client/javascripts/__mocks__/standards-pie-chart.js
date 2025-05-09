// Mock implementation of standards-pie-chart.js
export const createStandardsPieChart = jest
  .fn()
  .mockImplementation((container, standards) => {
    // Count standards by status
    const statusCounts = standards.reduce((acc, standard) => {
      const status = standard.status
      if (status) {
        acc[status] = (acc[status] || 0) + 1
      }
      return acc
    }, {})

    // Prepare the data for assertions in tests
    const data = [
      statusCounts.RED || 0,
      statusCounts.AMBER || 0,
      statusCounts.GREEN || 0,
      statusCounts.NOT_STARTED || 0
    ]

    // Return a mock chart object
    return {
      data,
      update: jest.fn(),
      destroy: jest.fn()
    }
  })
