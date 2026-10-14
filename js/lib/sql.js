/**
 * SQL tokenizer plus a readable formatter and a minifier.
 * Text in, text out: this never connects to a database or executes anything.
 */

const OPERATORS = ['<=>', '!=', '<>', '<=', '>=', '||', '::', '->>', '->', ':=', '|/', '&&', '+', '-', '*', '/', '%', '=', '<', '>', '~', '!', '&', '|', '^'];
const PUNCTUATION = new Set(['(', ')', ',', ';', '.', '[', ']', '{', '}']);

const MULTI_WORD = [
  'left outer join', 'right outer join', 'full outer join',
  'insert into', 'delete from', 'group by', 'order by', 'union all',
  'create table', 'create view', 'create index', 'alter table', 'drop table', 'drop view', 'drop index',
  'on conflict', 'on duplicate key', 'primary key', 'foreign key', 'not null', 'is not', 'is null',
  'natural join', 'cross join', 'inner join', 'left join', 'right join', 'full join',
].sort((a, b) => b.split(' ').length - a.split(' ').length);

/** Break these onto a new line (multi-word phrases are matched first). */
const BREAK_BEFORE = new Set([
  'select', 'from', 'where', 'group by', 'having', 'order by', 'limit', 'offset', 'returning', 'values', 'set', 'with',
  'insert into', 'update', 'delete from', 'union', 'union all', 'intersect', 'except',
  'create table', 'create view', 'create index', 'alter table', 'drop table', 'drop view', 'drop index', 'truncate', 'on conflict',
  'join', 'inner join', 'left join', 'left outer join', 'right join', 'right outer join',
  'full join', 'full outer join', 'cross join', 'natural join',
]);

/** Clause keywords that read better with a space before an opening parenthesis. */
const SPACE_BEFORE_PAREN = new Set([
  'from', 'join', 'inner', 'left', 'right', 'full', 'cross', 'natural', 'outer',
  'on', 'in', 'where', 'having', 'select', 'union', 'exists', 'values', 'using',
  'into', 'by', 'and', 'or', 'not', 'when', 'then', 'else', 'case', 'all', 'any',
  'between', 'like', 'is',
]);

/** Clause keywords whose contents are placed on the following (indented) line. */
const INDENT_CONTENT = new Set(['select', 'set', 'values', 'returning', 'where', 'having', 'group by', 'order by']);

/** Split SQL into typed tokens (whitespace included). */
export function tokenizeSql(sql) {
  const text = String(sql == null ? '' : sql);
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (/\s/.test(char)) {
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j += 1;
      tokens.push({ type: 'ws', value: text.slice(i, j) });
      i = j;
      continue;
    }

    if (char === '-' && text[i + 1] === '-') {
      let j = i;
      while (j < text.length && text[j] !== '\n') j += 1;
      tokens.push({ type: 'comment', value: text.slice(i, j) });
      i = j;
      continue;
    }

    if (char === '/' && text[i + 1] === '*') {
      let j = i + 2;
      while (j < text.length && !(text[j] === '*' && text[j + 1] === '/')) j += 1;
      j = Math.min(text.length, j + 2);
      tokens.push({ type: 'comment', value: text.slice(i, j) });
      i = j;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === char) {
          if (text[j + 1] === char) { j += 2; continue; }
          j += 1;
          break;
        }
        if (char === '`' && text[j] === '\\') { j += 2; continue; }
        j += 1;
      }
      tokens.push({ type: char === "'" ? 'string' : 'quoted', value: text.slice(i, j) });
      i = j;
      continue;
    }

    if (char === '[') {
      let j = i + 1;
      while (j < text.length && text[j] !== ']') j += 1;
      j = Math.min(text.length, j + 1);
      tokens.push({ type: 'quoted', value: text.slice(i, j) });
      i = j;
      continue;
    }

    const number = text.slice(i).match(/^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/);
    if (number) {
      tokens.push({ type: 'number', value: number[0] });
      i += number[0].length;
      continue;
    }

    const word = text.slice(i).match(/^[A-Za-z_][A-Za-z0-9_$]*/);
    if (word) {
      tokens.push({ type: 'word', value: word[0], upper: word[0].toUpperCase() });
      i += word[0].length;
      continue;
    }

    const param = text.slice(i).match(/^[@$][A-Za-z0-9_]*/);
    if (param) {
      tokens.push({ type: 'param', value: param[0] });
      i += param[0].length;
      continue;
    }
    if (char === ':' && /[A-Za-z_]/.test(text[i + 1] || '')) {
      const named = text.slice(i).match(/^:[A-Za-z_][A-Za-z0-9_]*/);
      tokens.push({ type: 'param', value: named[0] });
      i += named[0].length;
      continue;
    }
    if (char === '?') {
      tokens.push({ type: 'param', value: '?' });
      i += 1;
      continue;
    }

    const operator = OPERATORS.find((op) => text.startsWith(op, i));
    if (operator) {
      tokens.push({ type: 'operator', value: operator });
      i += operator.length;
      continue;
    }

    tokens.push({ type: PUNCTUATION.has(char) ? 'punct' : 'operator', value: char });
    i += 1;
  }

  return tokens;
}

function combinePhrases(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i += 1) {
    let match = null;
    for (const phrase of MULTI_WORD) {
      const words = phrase.split(' ');
      let matched = true;
      for (let k = 0; k < words.length; k += 1) {
        const token = tokens[i + k];
        if (!token || token.type !== 'word' || token.upper !== words[k].toUpperCase()) { matched = false; break; }
      }
      if (matched) { match = words; break; }
    }
    if (match) {
      const slice = tokens.slice(i, i + match.length);
      out.push({ type: 'keyword', value: slice.map((t) => t.value).join(' '), upper: match.join(' ').toUpperCase() });
      i += match.length - 1;
    } else {
      out.push(tokens[i]);
    }
  }
  return out;
}

function separator(previous, current) {
  if (!previous) return '';
  if (previous.type === 'comment' && previous.value.startsWith('--')) return '\n';
  const before = previous.value;
  const after = current.value;
  if (after === ',' || after === ';' || after === ')' || after === ']' || after === '}') return '';
  if (after === '.') return '';
  if (before === '(' || before === '[' || before === '{') return '';
  if (before === '.') return '';
  if (after === '(') {
    const keyword = previous.upper ? previous.upper.toLowerCase() : '';
    return SPACE_BEFORE_PAREN.has(keyword) ? ' ' : '';
  }
  if (before === ',') return ' ';
  return ' ';
}

function joinTokens(tokens) {
  let out = '';
  for (let i = 0; i < tokens.length; i += 1) {
    out += separator(tokens[i - 1], tokens[i]) + tokens[i].value;
  }
  return out;
}

/** Collapse SQL onto as few lines as possible without losing anything. */
export function minifySql(sql) {
  return joinTokens(tokenizeSql(sql).filter((token) => token.type !== 'ws'));
}

/** Format SQL with one clause per line and indented clause contents. */
export function formatSql(sql, { indentUnit = '  ' } = {}) {
  const tokens = combinePhrases(tokenizeSql(sql).filter((token) => token.type !== 'ws'));
  const lines = [];
  let current = [];
  let lineIndent = 0;
  let depth = 0;
  let nextIndent = 0;
  const parens = [];

  const flush = () => {
    if (current.length) lines.push({ indent: lineIndent, tokens: current });
    current = [];
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const upper = token.upper || '';
    const next = tokens[index + 1];

    if (token.value === ';') {
      current.push(token);
      flush();
      lineIndent = 0;
      depth = 0;
      nextIndent = 0;
      parens.length = 0;
      continue;
    }

    if (token.value === '(') {
      current.push(token);
      depth += 1;
      const expand = Boolean(next && next.upper && BREAK_BEFORE.has(next.upper.toLowerCase()));
      parens.push(expand);
      if (expand) {
        flush();
        lineIndent = depth;
        nextIndent = depth + 1;
      }
      continue;
    }

    if (token.value === ')') {
      const expand = parens.pop();
      depth = Math.max(0, depth - 1);
      if (expand) {
        flush();
        lineIndent = depth;
      }
      current.push(token);
      continue;
    }

    if (upper && BREAK_BEFORE.has(upper.toLowerCase())) {
      const indentContent = INDENT_CONTENT.has(upper.toLowerCase());
      flush();
      lineIndent = depth;
      current.push(token);
      nextIndent = indentContent ? depth + 1 : depth;
      if (indentContent) {
        flush();
        lineIndent = depth + 1;
      }
      continue;
    }

    if (upper === 'AND' || upper === 'OR') {
      flush();
      lineIndent = depth + 1;
      current.push(token);
      continue;
    }

    if (upper === 'ON') {
      current.push(token);
      nextIndent = depth + 1;
      continue;
    }

    if (token.value === ',') {
      current.push(token);
      if (depth === 0) {
        flush();
        lineIndent = nextIndent;
      }
      continue;
    }

    current.push(token);
  }
  flush();

  return lines
    .map((line) => indentUnit.repeat(Math.max(0, line.indent)) + joinTokens(line.tokens))
    .join('\n');
}
