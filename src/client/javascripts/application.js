import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Header,
  Radios,
  SkipLink
} from 'govuk-frontend'
import { createProjectHistoryChart } from './project-history-chart.js'
import { createStandardsPieChart } from './standards-pie-chart.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Header)
createAll(Radios)
createAll(SkipLink)

// Make chart function available globally
window.createProjectHistoryChart = createProjectHistoryChart
window.createStandardsPieChart = createStandardsPieChart
