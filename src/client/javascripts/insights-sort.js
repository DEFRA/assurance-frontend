const SORTABLE_HEADER_SELECTOR = 'th.sortable'
const SORTABLE_TABLE_SELECTOR = '[data-module="insights-sort"]'
const SORT_ASC_CLASS = 'sort-asc'
const SORT_DESC_CLASS = 'sort-desc'

const RAG_SORT_ORDER = {
  PENDING: 1,
  TBC: 1,
  RED: 2,
  AMBERRED: 3,
  AMBER: 4,
  GREENAMBER: 5,
  GREEN: 6,
  EXCLUDED: 7
}

/**
 * @param {string | undefined} value
 * @returns {string}
 */
function normaliseRag(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[\s/_-]+/g, '')
}

/**
 * @param {string} value
 * @returns {number}
 */
function toNumber(value) {
  const numericValue = Number.parseFloat(value)

  if (Number.isFinite(numericValue)) {
    return numericValue
  }

  const fallbackMatch = value.match(/-?\d+(?:\.\d+)?/)
  return fallbackMatch ? Number.parseFloat(fallbackMatch[0]) : 0
}

/**
 * @param {string} value
 * @returns {number}
 */
function toTimestamp(value) {
  if (!value) {
    return 0
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

/**
 * @param {HTMLTableCellElement} header
 * @returns {string}
 */
function getHeaderLabel(header) {
  const label = header.textContent?.trim()
  return label && label.length > 0 ? label : 'column'
}

/**
 * @param {HTMLTableRowElement} row
 * @param {number} columnIndex
 * @param {string} sortType
 * @returns {string | number}
 */
export function getComparableSortValue(row, columnIndex, sortType) {
  const cell = row.children[columnIndex]

  if (!cell) {
    return sortType === 'text' ? '' : 0
  }

  const rawValue =
    cell instanceof HTMLElement && cell.dataset.sortValue !== undefined
      ? cell.dataset.sortValue
      : (cell.textContent?.trim() ?? '')

  if (sortType === 'number') {
    return toNumber(rawValue)
  }

  if (sortType === 'date') {
    return toTimestamp(rawValue)
  }

  if (sortType === 'rag') {
    return RAG_SORT_ORDER[normaliseRag(rawValue)] ?? 999
  }

  return rawValue.toLocaleLowerCase()
}

/**
 * @param {string | number} left
 * @param {string | number} right
 * @param {string} sortType
 * @returns {number}
 */
function compareValues(left, right, sortType) {
  if (sortType === 'text') {
    return String(left).localeCompare(String(right), 'en-GB', {
      numeric: true,
      sensitivity: 'base'
    })
  }

  return Number(left) - Number(right)
}

/**
 * @param {HTMLTableCellElement} header
 * @returns {'asc' | 'desc'}
 */
function getNextSortDirection(header) {
  const ariaSort = header.getAttribute('aria-sort')

  if (ariaSort === 'ascending') {
    return 'desc'
  }

  if (ariaSort === 'descending') {
    return 'asc'
  }

  return header.dataset.sortDefaultDirection === 'desc' ? 'desc' : 'asc'
}

/**
 * @param {HTMLTableElement} table
 * @param {HTMLTableCellElement} activeHeader
 * @param {'asc' | 'desc'} direction
 */
function updateHeaderStates(table, activeHeader, direction) {
  table.querySelectorAll(SORTABLE_HEADER_SELECTOR).forEach((header) => {
    header.classList.remove(SORT_ASC_CLASS, SORT_DESC_CLASS)
    header.setAttribute('aria-sort', 'none')

    const headerText = getHeaderLabel(header)
    header.setAttribute('aria-label', `Sort by ${headerText}`)
  })

  activeHeader.classList.add(
    direction === 'asc' ? SORT_ASC_CLASS : SORT_DESC_CLASS
  )
  activeHeader.setAttribute(
    'aria-sort',
    direction === 'asc' ? 'ascending' : 'descending'
  )

  const activeHeaderText = getHeaderLabel(activeHeader)
  activeHeader.setAttribute(
    'aria-label',
    `Sort by ${activeHeaderText} (${
      direction === 'asc' ? 'ascending' : 'descending'
    })`
  )
}

/**
 * @param {HTMLTableElement} table
 * @param {number} columnIndex
 * @param {HTMLTableCellElement} header
 */
export function sortInsightsTable(table, columnIndex, header) {
  const tbody = table.querySelector('tbody')

  if (!tbody) {
    return
  }

  const direction = getNextSortDirection(header)
  const sortType = header.dataset.sortType ?? header.dataset.sort ?? 'text'
  const rows = Array.from(tbody.querySelectorAll('tr'))

  rows
    .map((row) => ({
      row,
      value: getComparableSortValue(row, columnIndex, sortType),
      originalIndex: Number(row.dataset.sortOriginalIndex ?? 0)
    }))
    .sort((left, right) => {
      const result = compareValues(left.value, right.value, sortType)

      if (result === 0) {
        return left.originalIndex - right.originalIndex
      }

      return direction === 'desc' ? -result : result
    })
    .forEach(({ row }) => tbody.appendChild(row))

  updateHeaderStates(table, header, direction)
}

/**
 * @param {HTMLTableElement} table
 */
function initialiseTable(table) {
  if (table.dataset.insightsSortInitialised === 'true') {
    return
  }

  table.dataset.insightsSortInitialised = 'true'

  table.querySelectorAll('tbody tr').forEach((row, index) => {
    if (!row.dataset.sortOriginalIndex) {
      row.dataset.sortOriginalIndex = String(index)
    }
  })

  table.querySelectorAll(SORTABLE_HEADER_SELECTOR).forEach((header, index) => {
    header.setAttribute('tabindex', '0')
    header.setAttribute('role', 'button')
    header.setAttribute('aria-sort', 'none')
    header.setAttribute('aria-label', `Sort by ${getHeaderLabel(header)}`)

    header.addEventListener('click', () => {
      sortInsightsTable(table, index, header)
    })

    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        sortInsightsTable(table, index, header)
      }
    })
  })
}

/**
 * @param {ParentNode} [root]
 */
export function initInsightsSort(root = document) {
  root.querySelectorAll(SORTABLE_TABLE_SELECTOR).forEach((table) => {
    if (table instanceof HTMLTableElement) {
      initialiseTable(table)
    }
  })
}
