/** Run a regular expression over text and describe the matches. Runs locally. */

export const REGEX_FLAGS = [
  { flag: 'g', label: 'g', hint: 'global — find every match' },
  { flag: 'i', label: 'i', hint: 'ignore case' },
  { flag: 'm', label: 'm', hint: 'multiline — ^ and $ match each line' },
  { flag: 's', label: 's', hint: 'dotAll — . also matches newlines' },
  { flag: 'u', label: 'u', hint: 'unicode mode' },
  { flag: 'y', label: 'y', hint: 'sticky — match from lastIndex only' },
];

export const REGEX_EXAMPLES = [
  { label: 'Word', pattern: '\\w+', flags: 'g' },
  { label: 'Email', pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.]+', flags: 'g' },
  { label: 'Domain', pattern: '[a-z0-9-]+(?:\\.[a-z0-9-]+)+', flags: 'g' },
  { label: 'Number', pattern: '-?\\d+(\\.\\d+)?', flags: 'g' },
  { label: 'Hex colour', pattern: '#[0-9a-fA-F]{3,8}\\b', flags: 'g' },
  { label: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
];

const MAX_MATCHES = 20000;

function lineColumnAt(text, index) {
  let line = 1;
  let lastBreak = -1;
  for (let i = 0; i < index && i < text.length; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      lastBreak = i;
    }
  }
  return { line, column: index - lastBreak };
}

function groupList(match) {
  const numbered = [];
  for (let i = 1; i < match.length; i += 1) {
    numbered.push({ index: i, value: match[i] });
  }
  const named = Object.entries(match.groups || {}).map(([name, value]) => ({ name, value }));
  return { numbered, named };
}

/**
 * Test `pattern` against `text`.
 * Returns { ok: false, error } for a bad pattern/flag, or
 * { ok: true, matches, truncated } with index/length/line/column for each match.
 */
export function runRegex(pattern, flags, text) {
  const raw = String(pattern == null ? '' : pattern);
  if (!raw) return { ok: false, error: 'Enter a regular expression to test.' };
  const flagText = String(flags == null ? '' : flags);

  let re;
  try {
    re = new RegExp(raw, flagText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: 'Invalid regex: ' + message };
  }

  const source = String(text == null ? '' : text);
  const matches = [];
  let truncated = false;

  const record = (match) => {
    const { line, column } = lineColumnAt(source, match.index);
    matches.push({
      value: match[0],
      index: match.index,
      end: match.index + match[0].length,
      line,
      column,
      groups: groupList(match),
    });
  };

  // With g or y the pattern finds every match; without them, only the first.
  if (/[gy]/.test(flagText)) {
    let match = re.exec(source);
    while (match !== null) {
      record(match);
      if (match[0] === '') re.lastIndex += 1; // avoid an infinite loop
      if (matches.length >= MAX_MATCHES) {
        truncated = true;
        break;
      }
      match = re.exec(source);
    }
  } else {
    const match = re.exec(source);
    if (match) record(match);
  }

  return { ok: true, matches, truncated, count: matches.length };
}

/** Escape text for HTML, then wrap every match in a <mark> element. */
export function buildHighlight(text, matches) {
  const source = String(text == null ? '' : text);
  const escape = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  if (!matches || matches.length === 0) return escape(source);

  let html = '';
  let cursor = 0;
  for (const match of matches) {
    if (match.index < cursor) continue;
    html += escape(source.slice(cursor, match.index));
    const value = source.slice(match.index, match.end);
    html += '<mark class="hit">' + (value === '' ? '\u200b' : escape(value)) + '</mark>';
    cursor = match.end;
  }
  html += escape(source.slice(cursor));
  return html;
}
