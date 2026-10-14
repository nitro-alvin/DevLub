/** Line-based diff (longest common subsequence) plus unified-diff output. */

export const MAX_DIFF_LINES = 2000;
const MAX_CELLS = 4000000;

function splitLines(text) {
  const normalised = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
  if (normalised === '') return [];
  const lines = normalised.split('\n');
  // A single trailing newline should not count as an extra empty line.
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function normalise(line, { ignoreWhitespace, ignoreCase }) {
  let value = line;
  if (ignoreWhitespace) value = value.replace(/\s+/g, ' ').trim();
  if (ignoreCase) value = value.toLowerCase();
  return value;
}

function lcsTable(a, b) {
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] = a[i] === b[j]
        ? table[(i + 1) * width + (j + 1)] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + (j + 1)]);
    }
  }
  return table;
}

/**
 * Compare two texts line by line.
 * Returns { ok: false, error } when the inputs are too big for a browser diff,
 * or { ok: true, rows, stats, identical, empty }.
 */
export function diffLines(original, modified, options = {}) {
  const left = splitLines(original);
  const right = splitLines(modified);
  if ((left.length + 1) * (right.length + 1) > MAX_CELLS) {
    return {
      ok: false,
      error: 'These inputs are too large to compare here. Try up to about ' + MAX_DIFF_LINES + ' lines on each side.',
    };
  }

  const a = left.map((line) => normalise(line, options));
  const b = right.map((line) => normalise(line, options));
  const width = b.length + 1;
  const table = lcsTable(a, b);

  const rows = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (a[i] === b[j]) {
      rows.push({ type: 'same', left: { n: i + 1, text: left[i] }, right: { n: j + 1, text: right[j] } });
      i += 1;
      j += 1;
    } else if (table[(i + 1) * width + j] >= table[i * width + (j + 1)]) {
      rows.push({ type: 'del', left: { n: i + 1, text: left[i] }, right: null });
      i += 1;
    } else {
      rows.push({ type: 'add', left: null, right: { n: j + 1, text: right[j] } });
      j += 1;
    }
  }
  while (i < left.length) {
    rows.push({ type: 'del', left: { n: i + 1, text: left[i] }, right: null });
    i += 1;
  }
  while (j < right.length) {
    rows.push({ type: 'add', left: null, right: { n: j + 1, text: right[j] } });
    j += 1;
  }

  const stats = { added: 0, removed: 0, unchanged: 0 };
  for (const row of rows) {
    if (row.type === 'add') stats.added += 1;
    else if (row.type === 'del') stats.removed += 1;
    else stats.unchanged += 1;
  }

  return {
    ok: true,
    rows,
    stats,
    identical: stats.added === 0 && stats.removed === 0,
    empty: left.length === 0 && right.length === 0,
  };
}

/** Build a standard unified diff (with @@ hunk headers) from diff rows. */
export function unifiedDiff(rows, { originalName = 'original', modifiedName = 'modified', context = 3 } = {}) {
  const header = ['--- ' + originalName, '+++ ' + modifiedName];
  const changed = [];
  rows.forEach((row, index) => {
    if (row.type !== 'same') changed.push(index);
  });
  if (changed.length === 0) return header.join('\n');

  const hunks = [];
  let start = Math.max(0, changed[0] - context);
  let end = Math.min(rows.length - 1, changed[0] + context);
  for (let k = 1; k < changed.length; k += 1) {
    const nextStart = Math.max(0, changed[k] - context);
    if (nextStart <= end + 1) end = Math.min(rows.length - 1, changed[k] + context);
    else {
      hunks.push([start, end]);
      start = nextStart;
      end = Math.min(rows.length - 1, changed[k] + context);
    }
  }
  hunks.push([start, end]);

  const lineNumber = (index, side) => {
    if (rows[index][side]) return rows[index][side].n;
    for (let k = index - 1; k >= 0; k -= 1) if (rows[k][side]) return rows[k][side].n + 1;
    return 0;
  };

  const lines = [...header];
  for (const [from, to] of hunks) {
    const leftStart = lineNumber(from, 'left');
    const rightStart = lineNumber(from, 'right');
    const body = [];
    let leftCount = 0;
    let rightCount = 0;
    for (let index = from; index <= to; index += 1) {
      const row = rows[index];
      if (row.type === 'same') {
        leftCount += 1;
        rightCount += 1;
        body.push(' ' + row.left.text);
      } else if (row.type === 'del') {
        leftCount += 1;
        body.push('-' + row.left.text);
      } else {
        rightCount += 1;
        body.push('+' + row.right.text);
      }
    }
    lines.push('@@ -' + (leftCount ? leftStart : 0) + ',' + leftCount + ' +' + (rightCount ? rightStart : 0) + ',' + rightCount + ' @@');
    lines.push(...body);
  }
  return lines.join('\n');
}
