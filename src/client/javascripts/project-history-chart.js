import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  LineController,
  Tooltip
} from 'chart.js'
import 'chartjs-adapter-date-fns'

// Register required components
Chart.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  LineController,
  Tooltip
)

export function createProjectHistoryChart(container, history) {
  // Convert status to numeric value for charting
  const statusToValue = {
    RED: 1,
    AMBER: 2,
    GREEN: 3
  }

  // Process history data to handle different formats
  const data = history
    .filter((entry) => {
      // Only include entries with status information
      return (
        entry?.changes?.status?.to || entry?.changes?.status || entry.status
      )
    })
    .map((entry) => {
      // Handle different status formats
      let status
      if (entry.changes?.status?.to) {
        status = entry.changes.status.to
      } else if (typeof entry.changes?.status === 'string') {
        status = entry.changes.status
      } else if (entry.status) {
        status = entry.status
      } else {
        // No usable status found
        return null
      }

      return {
        x: new Date(entry.timestamp),
        y: statusToValue[status] || 2, // Default to AMBER if invalid status
        status
      }
    })
    .filter(Boolean) // Remove null entries
    .sort((a, b) => a.x - b.x) // Sort by date ascending

  // Create chart
  const chart = new Chart(container.getContext('2d'), {
    type: 'line',
    data: {
      datasets: [
        {
          data,
          borderColor: '#b1b4b6',
          borderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 10,
          pointBackgroundColor: data.map((d) => {
            switch (d.status) {
              case 'RED':
                return '#d4351c' // GDS Tag Red
              case 'AMBER':
                return '#f47738' // GDS Tag Yellow
              case 'GREEN':
                return '#00703c' // GDS Tag Green
              default:
                return '#b1b4b6' // GDS Grey
            }
          }),
          pointBorderColor: 'transparent',
          pointBorderWidth: 0, // Remove point border
          pointStyle: 'circle',
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: data.map((d) => {
            switch (d.status) {
              case 'RED':
                return '#942514' // Darker red for hover
              case 'AMBER':
                return '#aa4a1d' // Darker amber for hover
              case 'GREEN':
                return '#004e2a' // Darker green for hover
              default:
                return '#505a5f' // Darker grey for hover
            }
          }),
          tension: 0, // Use straight lines between points
          spanGaps: false // Don't span gaps in the data
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
            displayFormats: {
              month: 'MMM yy'
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          min: 0.5,
          max: 3.5,
          ticks: {
            display: false // Hide Y-axis labels
          },
          grid: {
            display: false // Hide Y-axis grid lines
          },
          border: {
            display: false // Hide Y-axis line
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Status: ${context.raw.status}`
            }
          }
        }
      }
    }
  })

  return chart
}
