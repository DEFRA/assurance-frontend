import { format, isDate, parseISO } from 'date-fns'

/**
 * Formats a date using date-fns or native Date methods
 * @param {string | Date} value - The date to format
 * @param {string} [formattedDateStr] - Optional date-fns format string
 */
export function formatDate(value, formattedDateStr) {
  // If it's a timestamp and no format string provided, use locale string
  if (!formattedDateStr && typeof value === 'number') {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Otherwise use date-fns formatting
  const date = isDate(value) ? value : parseISO(value)
  return format(date, formattedDateStr ?? 'd MMMM yyyy')
}
