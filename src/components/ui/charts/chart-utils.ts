/**
 * Shared chart utility functions for SVG-rendered charts.
 * No external dependencies — pure math + date formatting.
 */

/** Format a Date as "Jan 15", "Mar 7", etc. */
export function formatDateShort(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/** Generate an array of Date objects for the last N days (inclusive of today). */
export function generateDateRange(days: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

/**
 * Compute evenly-spaced "nice" tick values for an axis.
 * For score charts we hard-code [0, 25, 50, 75, 100].
 */
export function computeNiceTicks(
  min: number,
  max: number,
  targetCount: number
): number[] {
  const range = max - min;
  if (range === 0) return [min];

  const roughStep = range / targetCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep: number;
  if (normalized <= 1.5) niceStep = magnitude;
  else if (normalized <= 3.5) niceStep = 2 * magnitude;
  else if (normalized <= 7.5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const start = Math.floor(min / niceStep) * niceStep;
  const end = Math.ceil(max / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let t = start; t <= end; t += niceStep) {
    ticks.push(Math.round(t * 1000) / 1000);
  }
  return ticks;
}

/**
 * Pick evenly-spaced x-axis tick values from an array of timestamps.
 * Returns at most `maxTicks` values, including first and last.
 */
export function pickXTicks(values: number[], maxTicks: number): number[] {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length <= maxTicks) return unique;

  const ticks: number[] = [unique[0]];
  const step = (unique.length - 1) / (maxTicks - 1);
  for (let i = 1; i < maxTicks - 1; i++) {
    ticks.push(unique[Math.round(step * i)]);
  }
  ticks.push(unique[unique.length - 1]);
  return ticks;
}
