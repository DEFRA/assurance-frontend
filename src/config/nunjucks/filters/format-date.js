import { format, isDate, parseISO, isValid } from 'date-fns'

/**
 * Formats a date using date-fns or native Date methods
 * @param {string | Date} value - The date to format
 * @param {string} [formattedDateStr] - Optional date-fns format string
 */
export function formatDate(value, formattedDateStr) {
  // Handle null, undefined, or empty values
  if (!value) {
    return ''
  }

  try {
    // If it's a timestamp and no format string provided, use locale string
    if (!formattedDateStr && typeof value === 'number') {
      const date = new Date(value)
      if (isValid(date)) {
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
      return ''
    }

    // Handle Date objects
    if (isDate(value)) {
      if (isValid(value)) {
        return format(value, formattedDateStr ?? 'd MMMM yyyy')
      }
      return ''
    }

    // Handle string values
    if (typeof value === 'string') {
      // Try to parse as ISO date first
      let date
      try {
        date = parseISO(value)
      } catch (parseError) {
        // If parseISO fails, try native Date constructor
        date = new Date(value)
      }

      if (isValid(date)) {
        return format(date, formattedDateStr ?? 'd MMMM yyyy')
      }

      // If all parsing fails, return the original value if it looks like a formatted date
      if (
        value.includes(' ') &&
        (value.includes('2024') || value.includes('2025'))
      ) {
        return value
      }
    }

    return ''
  } catch (error) {
    return value ? String(value) : ''
  }
}
