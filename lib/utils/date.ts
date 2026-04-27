import { format, isValid, parseISO } from 'date-fns'

/**
 * Safely formats a date string, handling null/undefined and invalid dates
 *
 * @param dateString - The date string to format (ISO string, Date object, or null/undefined)
 * @param formatStr - The format string (default: 'MMM dd, yyyy')
 * @returns Formatted date string or '—' if invalid
 *
 * @example
 * formatDate('2024-01-15') // 'Jan 15, 2024'
 * formatDate(null) // '—'
 * formatDate('invalid') // '—'
 * formatDate('2024-01-15', 'yyyy-MM-dd') // '2024-01-15'
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  formatStr: string = 'MMM dd, yyyy'
): string {
  if (!dateString) return '—'

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString)
    if (!isValid(date)) return '—'
    return format(date, formatStr)
  } catch (error) {
    console.error('Invalid date:', dateString, error)
    return '—'
  }
}

/**
 * Formats a date with time
 * @example
 * formatDateTime('2024-01-15T14:30:00') // 'Jan 15, 2024 14:30'
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, 'MMM dd, yyyy HH:mm')
}

/**
 * Formats just the time portion
 * @example
 * formatTime('2024-01-15T14:30:00') // '14:30'
 */
export function formatTime(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, 'HH:mm')
}

/**
 * Formats date in ISO format (YYYY-MM-DD)
 * @example
 * formatDateISO('2024-01-15T14:30:00') // '2024-01-15'
 */
export function formatDateISO(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, 'yyyy-MM-dd')
}

/**
 * Check if a date string is valid
 */
export function isValidDate(dateString: string | Date | null | undefined): boolean {
  if (!dateString) return false

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString)
    return isValid(date)
  } catch {
    return false
  }
}
