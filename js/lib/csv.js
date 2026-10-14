/** Convert JSON (an array of objects) into CSV with proper escaping. */

/** Quote a CSV cell when it contains a comma, quote or line break. */
export function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

/** Arrays and objects become compact JSON so a row is never silently lost. */
function cellValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Convert a JSON document into CSV text.
 * Returns { ok: false, error } / { ok: false, empty } / { ok: true, output, columns, rowCount }.
 */
export function jsonToCsv(text) {
  const source = String(text == null ? '' : text);
  if (!source.trim()) return { ok: false, empty: true };

  let data;
  try {
    data = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: 'Invalid JSON: ' + message };
  }

  let rows;
  if (Array.isArray(data)) rows = data;
  else if (data && typeof data === 'object') rows = [data];
  else {
    return { ok: false, error: 'The JSON must be an array of objects, or a single object.' };
  }
  if (rows.length === 0) {
    return { ok: false, error: 'The JSON array is empty — there is nothing to convert.' };
  }

  const objects = rows.every((row) => row && typeof row === 'object' && !Array.isArray(row));
  const columns = [];
  if (objects) {
    for (const row of rows) {
      for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
    }
  } else {
    columns.push('value');
  }

  const lines = [columns.map(csvEscape).join(',')];
  for (const row of rows) {
    const cells = objects ? columns.map((key) => csvEscape(cellValue(row[key]))) : [csvEscape(cellValue(row))];
    lines.push(cells.join(','));
  }

  return { ok: true, output: lines.join('\n'), columns, rowCount: rows.length };
}
