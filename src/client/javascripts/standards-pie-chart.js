import { Chart, ArcElement, Tooltip, Legend, PieController } from 'chart.js'

// Register required components
Chart.register(ArcElement, Tooltip, Legend, PieController)

export function createStandardsPieChart(container, standards) {
  // Count standards by status
  const statusCounts = standards.reduce((acc, standard) => {
    const status = standard.status
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  // Create chart
  const chart = new Chart(container.getContext('2d'), {
    type: 'pie',
    data: {
      labels: ['RED', 'AMBER', 'GREEN', 'NOT_STARTED'].map((status) =>
        status === 'NOT_STARTED' ? 'Not Started' : status
      ),
      datasets: [
        {
          data: [
            statusCounts.RED || 0,
            statusCounts.AMBER || 0,
            statusCounts.GREEN || 0,
            statusCounts.NOT_STARTED || 0
          ],
          backgroundColor: [
            '#d4351c', // GDS Red
            '#f47738', // GDS Amber
            '#00703c', // GDS Green
            '#b1b4b6' // GDS Grey
          ],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || ''
              const value = Number(context.raw) || 0
              const total = context.dataset.data.reduce((a, b) => a + b, 0)
              const percentage = Math.round((value / total) * 100)
              return `${label}: ${value.toString()} (${percentage}%)`
            }
          }
        }
      }
    }
  })

  return chart
}
