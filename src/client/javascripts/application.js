import { initAll } from 'govuk-frontend'
import { createProjectHistoryChart } from './project-history-chart.js'
import { createStandardsPieChart } from './standards-pie-chart.js'

// Initialize all GOV.UK components
initAll()

// Make chart functions available globally
window.createProjectHistoryChart = createProjectHistoryChart
window.createStandardsPieChart = createStandardsPieChart
