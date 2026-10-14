/**
 * Standard 5-field cron (minute hour day-of-month month day-of-week) plus the
 * common @shortcuts. Parsing and explaining only — no next-run calculation.
 */

const MONTH_NAMES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
const DAY_NAMES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SHORTCUTS = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export const CRON_EXAMPLES = [
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Every 5 minutes', expression: '*/5 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at midnight', expression: '0 0 * * *' },
  { label: 'Every Monday', expression: '0 0 * * 1' },
  { label: 'Every month', expression: '0 0 1 * *' },
  { label: 'Weekdays at 09:00', expression: '0 9 * * 1-5' },
  { label: 'Every 15 min, 9am–5pm', expression: '*/15 9-17 * * *' },
];

const FIELDS = [
  { key: 'minute', label: 'Minute', min: 0, max: 59, noun: ['minute', 'minutes'], range: '0–59' },
  { key: 'hour', label: 'Hour', min: 0, max: 23, noun: ['hour', 'hours'], range: '0–23' },
  { key: 'dayOfMonth', label: 'Day of month', min: 1, max: 31, noun: ['day', 'days'], range: '1–31' },
  { key: 'month', label: 'Month', min: 1, max: 12, noun: ['month', 'months'], names: MONTH_NAMES, range: '1–12 or JAN–DEC' },
  { key: 'dayOfWeek', label: 'Day of week', min: 0, max: 7, noun: ['day of the week', 'days of the week'], names: DAY_NAMES, wrap: true, range: '0–7 or SUN–SAT' },
];

function parseValue(text, field) {
  if (/^\d+$/.test(text)) return Number(text);
  if (field.names) {
    const upper = text.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(field.names, upper)) return field.names[upper];
  }
  return null;
}

function rangeError(field) {
  return field.label + ' must be within ' + field.range + '.';
}

function parseToken(token, field) {
  const slash = token.indexOf('/');
  let body = token;
  let step = null;
  if (slash >= 0) {
    body = token.slice(0, slash);
    const stepText = token.slice(slash + 1);
    if (!/^\d+$/.test(stepText)) {
      return { ok: false, error: 'In ' + field.label + ', "' + token + '" has an invalid step — use a whole number.' };
    }
    step = Number(stepText);
    if (step < 1) return { ok: false, error: 'In ' + field.label + ', a step of 0 does not make sense.' };
  }

  let start;
  let end;
  if (body === '*') {
    start = field.min;
    end = field.max;
  } else if (body.includes('-')) {
    const pieces = body.split('-');
    if (pieces.length !== 2) return { ok: false, error: 'In ' + field.label + ', "' + token + '" is not a valid range.' };
    start = parseValue(pieces[0], field);
    end = parseValue(pieces[1], field);
    if (start === null || end === null) return { ok: false, error: 'In ' + field.label + ', "' + token + '" is not valid. ' + rangeError(field) };
    if (start > end) return { ok: false, error: 'In ' + field.label + ', "' + body + '" starts after it ends.' };
  } else {
    start = parseValue(body, field);
    if (start === null) return { ok: false, error: 'In ' + field.label + ', "' + token + '" is not valid. ' + rangeError(field) };
    end = step ? field.max : start;
  }

  if (start < field.min || start > field.max || end < field.min || end > field.max) {
    return { ok: false, error: 'In ' + field.label + ', "' + token + '" is out of range. ' + rangeError(field) };
  }

  const values = [];
  for (let value = start; value <= end; value += step || 1) values.push(value);
  return { ok: true, values };
}

function classify(raw) {
  const text = raw.trim();
  if (text === '*') return { kind: 'all', step: null };
  const slash = text.indexOf('/');
  if (slash >= 0) {
    const body = text.slice(0, slash);
    const step = Number(text.slice(slash + 1));
    if (body === '*') return { kind: 'step', step };
    if (body.includes('-')) return { kind: 'rangeStep', step };
    return { kind: 'startStep', step };
  }
  if (text.includes(',')) return { kind: 'list', step: null };
  if (text.includes('-')) return { kind: 'range', step: null };
  return { kind: 'single', step: null };
}

function parseField(raw, field) {
  const text = String(raw).trim();
  if (!text) return { ok: false, error: field.label + ' is empty — use * for every value.' };
  const tokens = text.split(',');
  if (tokens.some((token) => token.trim() === '')) {
    return { ok: false, error: 'There is an empty value in ' + field.label + '.' };
  }

  const values = new Set();
  for (const token of tokens) {
    const result = parseToken(token, field);
    if (!result.ok) return result;
    for (const value of result.values) values.add(field.wrap && value === 7 ? 0 : value);
  }

  const info = classify(text);
  return { ok: true, kind: info.kind, step: info.step, values: [...values].sort((a, b) => a - b), raw: text };
}

function display(field, value) {
  if (field.key === 'month') return MONTH_SHORT[value];
  if (field.key === 'dayOfWeek') return DAY_SHORT[value];
  return String(value);
}

function valuesText(field, parsed) {
  return parsed.values.map((value) => display(field, value)).join(', ');
}

function describeField(field, parsed) {
  const [one, many] = field.noun;
  switch (parsed.kind) {
    case 'all':
      return 'every ' + one;
    case 'step':
      return 'every ' + parsed.step + ' ' + (parsed.step === 1 ? one : many);
    case 'startStep':
      return 'every ' + parsed.step + ' ' + many + ' starting at ' + display(field, parsed.values[0]);
    case 'rangeStep':
      return 'every ' + parsed.step + ' ' + many + ' from ' + display(field, parsed.values[0]) + ' to ' + display(field, parsed.values[parsed.values.length - 1]);
    case 'range':
      return display(field, parsed.values[0]) + '–' + display(field, parsed.values[parsed.values.length - 1]);
    case 'list':
      return valuesText(field, parsed);
    default:
      return display(field, parsed.values[0]);
  }
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function hourSuffix(hour) {
  switch (hour.kind) {
    case 'all': return '';
    case 'single': return ' during hour ' + hour.values[0];
    case 'range': return ' during hours ' + hour.values[0] + '–' + hour.values[hour.values.length - 1];
    case 'step': return ' every ' + hour.step + ' hours';
    default: return ' during hours ' + hour.values.join(', ');
  }
}

function monthText(month) {
  if (month.kind === 'single') return MONTH_SHORT[month.values[0]];
  if (month.kind === 'range') return MONTH_SHORT[month.values[0]] + '–' + MONTH_SHORT[month.values[month.values.length - 1]];
  if (month.kind === 'step' || month.kind === 'startStep') return 'every ' + month.step + ' months';
  return month.values.map((value) => MONTH_SHORT[value]).join(', ');
}

function dowText(dow) {
  if (dow.kind === 'single') return 'on ' + DAY_LONG[dow.values[0]] + 's';
  if (dow.kind === 'range' && dow.values.length === 5 && dow.values[0] === 1 && dow.values[4] === 5) return 'on weekdays';
  if (dow.kind === 'range') return 'on ' + DAY_LONG[dow.values[0]] + ' to ' + DAY_LONG[dow.values[dow.values.length - 1]];
  return 'on ' + dow.values.map((value) => DAY_SHORT[value]).join(', ');
}

function dayText(dayOfMonth, month, dayOfWeek) {
  if (dayOfWeek.kind !== 'all') return dowText(dayOfWeek);
  if (dayOfMonth.kind !== 'all') {
    const suffix = month.kind === 'all' ? ' of every month' : ' of ' + monthText(month);
    if (dayOfMonth.kind === 'single') return 'on day ' + dayOfMonth.values[0] + suffix;
    if (dayOfMonth.kind === 'range') return 'on days ' + dayOfMonth.values[0] + '–' + dayOfMonth.values[dayOfMonth.values.length - 1] + suffix;
    return 'on days ' + dayOfMonth.values.join(', ') + suffix;
  }
  if (month.kind !== 'all') return 'in ' + monthText(month);
  return '';
}

function summarize(parsed) {
  const minute = parsed.minute;
  const hour = parsed.hour;
  let time;
  if (minute.kind === 'all' && hour.kind === 'all') time = 'every minute';
  else if (minute.kind === 'all') time = 'every minute' + hourSuffix(hour);
  else if (minute.kind === 'step') time = 'every ' + minute.step + ' minutes' + hourSuffix(hour);
  else if (minute.kind === 'startStep') time = 'every ' + minute.step + ' minutes from minute ' + minute.values[0] + hourSuffix(hour);
  else if (minute.kind === 'single' && hour.kind === 'single') time = 'at ' + pad(hour.values[0]) + ':' + pad(minute.values[0]);
  else if (minute.kind === 'single' && hour.kind === 'all') time = 'every hour at minute ' + minute.values[0];
  else if (minute.kind === 'single' && hour.kind === 'step') time = 'every ' + hour.step + ' hours at minute ' + minute.values[0];
  else time = 'at minute ' + minute.values.join(', ') + hourSuffix(hour);

  const days = dayText(parsed.dayOfMonth, parsed.month, parsed.dayOfWeek);
  let summary = 'Runs ' + time + (days ? ' ' + days : '');
  if (!days && time.startsWith('at ')) summary += ' every day';
  return summary;
}

/**
 * Explain a cron expression.
 * Returns { ok: false, empty } for blank input, { ok: false, error } when the
 * expression is invalid, or { ok: true, fields, summary, normalized }.
 */
export function describeCron(expression) {
  const raw = String(expression == null ? '' : expression).trim();
  if (!raw) return { ok: false, empty: true };

  const shortcut = SHORTCUTS[raw.toLowerCase()];
  const normalized = shortcut || raw;
  const parts = normalized.split(/\s+/);
  if (!shortcut && parts.length !== 5) {
    return {
      ok: false,
      error: 'Standard cron uses 5 fields (minute hour day-of-month month day-of-week); this has ' + parts.length + '.',
    };
  }

  const parsed = {};
  const fields = [];
  for (let i = 0; i < FIELDS.length; i += 1) {
    const field = FIELDS[i];
    const result = parseField(parts[i], field);
    if (!result.ok) return { ok: false, error: result.error };
    parsed[field.key] = result;
    fields.push({ key: field.key, label: field.label, value: parts[i], description: describeField(field, result) });
  }

  return { ok: true, normalized, shortcut: Boolean(shortcut), fields, summary: summarize(parsed) };
}
