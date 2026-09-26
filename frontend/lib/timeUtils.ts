/**
 * Consistent time and duration formatting across GridWatch.
 * Strict requirement: Use lowercase "a.m." and "p.m." with periods on all pages.
 */

/**
 * Format a time in seconds into a realistic clock time with a.m. / p.m.
 * Defaults to starting at 10:00 a.m. for residential morning monitoring.
 */
export function formatTimeOfDay(
  seconds: number,
  includeSeconds: boolean = false,
  baseHour: number = 10,
  baseMinute: number = 0
): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const totalMins = baseMinute + Math.floor(safeSec / 60);
  const secsRemaining = safeSec % 60;

  const hours24 = (baseHour + Math.floor(totalMins / 60)) % 24;
  const minsRemaining = totalMins % 60;

  const isPm = hours24 >= 12;
  const period = isPm ? "p.m." : "a.m.";

  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (includeSeconds) {
    return `${hours12}:${pad(minsRemaining)}:${pad(secsRemaining)} ${period}`;
  }
  return `${hours12}:${pad(minsRemaining)} ${period}`;
}

/**
 * Format a Date instance to a string using "a.m." or "p.m."
 */
export function formatClockTime(date: Date = new Date(), includeSeconds: boolean = false): string {
  const hours24 = date.getHours();
  const mins = date.getMinutes();
  const secs = date.getSeconds();

  const isPm = hours24 >= 12;
  const period = isPm ? "p.m." : "a.m.";

  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (includeSeconds) {
    return `${hours12}:${pad(mins)}:${pad(secs)} ${period}`;
  }
  return `${hours12}:${pad(mins)} ${period}`;
}

/**
 * Format elapsed duration into friendly resident wording (e.g. "1m 5s", "45s")
 */
export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || seconds <= 0) {
    return "0s";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}
