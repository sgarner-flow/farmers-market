import { addDays, subDays, format } from 'date-fns';

/**
 * Returns the date of the next Saturday
 */
export function getNextSaturday() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilNextSaturday = day === 6 ? 7 : 6 - day;
  return addDays(today, daysUntilNextSaturday);
}

/**
 * Subtracts a specified number of days from a date
 * @param date The date to subtract from
 * @param days The number of days to subtract
 */
export { subDays };

/**
 * Adds a specified number of days to a date
 * @param date The date to add to
 * @param days The number of days to add
 */
export { addDays };

/**
 * Formats a date according to the specified format string
 * @param date The date to format
 * @param formatStr The format string to use
 */
export { format }; 