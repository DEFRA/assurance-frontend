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

  // Process history data
  const data = history
    .map((entry) => {
      const status = entry.changes.status?.to ?? entry.changes.status
      return {
        x: new Date(entry.timestamp),
        y: statusToValue[status],
        status
      }
    })
    .sort((a, b) => a.x - b.x)

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
          tension: 0
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
