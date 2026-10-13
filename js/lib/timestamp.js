/** Unix timestamp ⇄ readable date helpers. */

const MAX_DATE_MS = 8.64e15; // JavaScript Date range: ±100,000,000 days from the epoch

/** Seconds are < 1e11 (up to year 5138); modern millisecond values are >= 1e11. */
export function detectTimestampUnit(value) {
  return Math.abs(value) >= 1e11 ? 'ms' : 's';
}

/**
 * Parse a timestamp string into a Date.
 * `unit` is 'auto' | 's' | 'ms'. Returns { ok, empty, error, date, unit }.
 */
export function parseTimestamp(raw, unit = 'auto') {
  const text = String(raw == null ? '' : raw).trim();
  // An empty field or a half-typed value ("-", "12.") is not an error yet.
  if (/^$|^[-+]+$|^[-+]?\.$|^[-+]?\d+\.$/.test(text)) return { ok: false, empty: true };
  if (!/^[-+]?\d+(\.\d+)?$/.test(text)) {
    return { ok: false, error: 'Enter a Unix timestamp as a number, for example 1700000000.' };
  }
  const number = Number(text);
  const resolvedUnit = (unit === 's' || unit === 'ms') ? unit : detectTimestampUnit(number);
  const ms = resolvedUnit === 's' ? number * 1000 : number;
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) {
    return { ok: false, error: 'That timestamp is outside the range of dates this browser can display (roughly ±275,000 years).' };
  }
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: 'That timestamp does not map to a valid date.' };
  }
  return { ok: true, date, unit: resolvedUnit };
}

/** Parse a value from <input type="datetime-local"> (interpreted as local time). */
export function parseDateTimeInput(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return { ok: false, empty: true };
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return { ok: false, error: 'Enter a valid date and time.' };
  return {
    ok: true,
    date,
    seconds: Math.floor(date.getTime() / 1000),
    ms: date.getTime(),
  };
}

export function formatUtc(date) {
  return date.toUTCString(); // spec-defined, locale-independent: "Tue, 14 Nov 2023 22:13:20 GMT"
}

/** Human-readable local time; `timeZone` is optional (defaults to the device zone). */
export function formatLocal(date, timeZone) {
  const options = {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  };
  if (timeZone) options.timeZone = timeZone;
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
