/**
 * Centralized, reliable date and time utilities for PasteCodex
 * Guarantees correct local timezone rendering across all browser engines.
 */

/**
 * Formats a Date or timestamp into a friendly local string:
 * e.g. "Oct 27, 10:45 PM"
 */
export function formatFriendlyTimestamp(dateInput?: Date | number | string): string {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (dateInput instanceof Date) {
    d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
  } else {
    d = new Date(dateInput);
    if (isNaN(d.getTime())) d = new Date();
  }

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a timestamp into a short time-only string:
 * e.g. "10:45 PM"
 */
export function formatTimeOnly(dateInput?: Date | number | string): string {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (dateInput instanceof Date) {
    d = isNaN(dateInput.getTime()) ? new Date() : dateInput;
  } else {
    d = new Date(dateInput);
    if (isNaN(d.getTime())) d = new Date();
  }

  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
