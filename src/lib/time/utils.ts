/**
 * Convert a UTC ISO string to the user's local time for display.
 * Returns a Date object in local time.
 */
export function utcToLocal(utcIso: string): Date {
  return new Date(utcIso);
}

/**
 * Format a UTC ISO string to local time string for display.
 */
export function formatLocalTime(utcIso: string, formatStr: string): string {
  const date = new Date(utcIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  
  // Simple formatting - for complex formats use date-fns
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  
  return `${hours12}:${pad(minutes)} ${ampm}`;
}

/**
 * Get the user's current IANA timezone.
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a local Date to a UTC ISO string for storage.
 */
export function localToUtc(localDate: Date): string {
  return localDate.toISOString();
}

/**
 * Snap minutes to the nearest 15-minute increment.
 */
export function snapToQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

/**
 * Get total minutes from midnight for a UTC timestamp in local time.
 */
export function getLocalMinutesFromMidnight(utcIso: string): number {
  const d = new Date(utcIso);
  return d.getHours() * 60 + d.getMinutes();
}
