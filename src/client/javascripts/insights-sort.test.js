/*
 * @jest-environment jsdom
 */

import {
  getComparableSortValue,
  initInsightsSort,
  sortInsightsTable
} from './insights-sort.js'

function getProjectOrder() {
  return Array.from(document.querySelectorAll('tbody tr')).map(
    (row) => row.children[0].textContent
  )
}

function renderTable() {
  document.body.innerHTML = `
    <table data-module="insights-sort">
      <thead>
        <tr>
          <th class="sortable" data-sort-type="text" data-sort-default-direction="asc">Project</th>
          <th class="sortable" data-sort-type="number" data-sort-default-direction="desc">Score</th>
          <th class="sortable" data-sort-type="rag" data-sort-default-direction="asc">Manual RAG</th>
          <th class="sortable" data-sort-type="date" data-sort-default-direction="desc">Last updated</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-sort-value="bravo">Bravo</td>
          <td data-sort-value="20">20%</td>
          <td data-sort-value="GREEN">Green</td>
          <td data-sort-value="2026-05-01T10:00:00.000Z">1 May 2026</td>
        </tr>
        <tr>
          <td data-sort-value="alpha">Alpha</td>
          <td data-sort-value="90">90%</td>
          <td data-sort-value="RED">Red</td>
          <td data-sort-value="2026-05-03T10:00:00.000Z">3 May 2026</td>
        </tr>
        <tr>
          <td data-sort-value="charlie">Charlie</td>
          <td data-sort-value="90">90%</td>
          <td data-sort-value="PENDING">Pending</td>
          <td data-sort-value="">No date</td>
        </tr>
      </tbody>
    </table>
  `
}

describe('insights-sort', () => {
  beforeEach(() => {
    renderTable()
  })

  it('sorts by explicit numeric values and toggles on repeated clicks', () => {
    initInsightsSort()

    const scoreHeader = document.querySelectorAll('th')[1]

    scoreHeader.click()

    expect(getProjectOrder()).toEqual(['Alpha', 'Charlie', 'Bravo'])
    expect(scoreHeader.getAttribute('aria-sort')).toBe('descending')

    scoreHeader.click()

    expect(getProjectOrder()).toEqual(['Bravo', 'Alpha', 'Charlie'])
    expect(scoreHeader.getAttribute('aria-sort')).toBe('ascending')
  })

  it('sorts RAG values by assurance priority', () => {
    initInsightsSort()

    document.querySelectorAll('th')[2].click()

    expect(getProjectOrder()).toEqual(['Charlie', 'Alpha', 'Bravo'])
  })

  it('sorts dates from newest first by default', () => {
    initInsightsSort()

    document.querySelectorAll('th')[3].click()

    expect(getProjectOrder()).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('supports keyboard sorting', () => {
    initInsightsSort()

    const projectHeader = document.querySelectorAll('th')[0]
    projectHeader.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )

    expect(getProjectOrder()).toEqual(['Alpha', 'Bravo', 'Charlie'])
    expect(projectHeader.getAttribute('aria-sort')).toBe('ascending')
  })

  it('uses stable original row order for equal values', () => {
    const table = document.querySelector('table')
    const scoreHeader = document.querySelectorAll('th')[1]

    initInsightsSort()
    sortInsightsTable(table, 1, scoreHeader)

    expect(getProjectOrder()).toEqual(['Alpha', 'Charlie', 'Bravo'])
  })

  it('can parse fallback cell values when data-sort-value is not present', () => {
    const row = document.querySelector('tbody tr')
    row.children[1].removeAttribute('data-sort-value')

    expect(getComparableSortValue(row, 1, 'number')).toBe(20)
  })
})
