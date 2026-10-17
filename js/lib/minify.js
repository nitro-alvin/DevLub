/**
 * Pure minification helpers shared by Tool 20.
 *
 * HTML is tokenised with a small, quote-aware scanner rather than regex-only
 * substitutions, so text inside <pre>, <textarea>, <script> and <style> is
 * copied byte-for-byte while the surrounding document is compacted safely.
 */

/** Elements whose surrounding whitespace is not rendered in normal flow. */
const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'details', 'dialog',
  'div', 'dl', 'dt', 'dd', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
  'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'script', 'style', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'ul', 'meta', 'link',
  'base', 'noscript',
]);

/** Elements whose content must be preserved exactly. */
const RAW_TEXT_TAGS = new Set(['pre', 'textarea', 'script', 'style']);

function readTag(source, start) {
  let i = start + 1;
  let closing = false;
  if (source[i] === '/') {
    closing = true;
    i += 1;
  }
  const nameStart = i;
  while (i < source.length && !/[\s/>]/.test(source[i])) i += 1;
  const name = source.slice(nameStart, i).toLowerCase();
  if (!name || !/^[a-z][a-z0-9:._-]*$/.test(name)) return null;

  let quote = '';
  while (i < source.length) {
    const char = source[i];
    if (quote) {
      if (char === quote) quote = '';
      i += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      i += 1;
      continue;
    }
    if (char === '>') {
      return { end: i + 1, name, closing, raw: source.slice(start, i + 1) };
    }
    i += 1;
  }
  return null; // unterminated tag: leave it as text rather than truncating input
}

/** Collapse whitespace in markup, never inside quoted attribute values. */
function collapseTagWhitespace(raw) {
  let out = '';
  let quote = '';
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (quote) {
      out += char;
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      continue;
    }
    if (/\s/.test(char)) {
      let j = i;
      while (j < raw.length && /\s/.test(raw[j])) j += 1;
      const next = raw[j];
      if (next === '>' || next === undefined || (next === '/' && raw[j + 1] === '>')) {
        i = j - 1;
        continue;
      }
      out += ' ';
      i = j - 1;
      continue;
    }
    out += char;
  }
  return out;
}

function isConditionalComment(value) {
  return /\[if\b/i.test(value) || /\[endif\]/i.test(value);
}

function tokenizeHtml(source) {
  const tokens = [];
  const lower = source.toLowerCase();
  let text = '';
  let i = 0;

  const flushText = () => {
    if (text) {
      tokens.push({ type: 'text', value: text });
      text = '';
    }
  };

  while (i < source.length) {
    if (source.startsWith('<!--', i)) {
      flushText();
      const end = source.indexOf('-->', i + 4);
      if (end === -1) {
        // An unclosed comment is kept verbatim instead of swallowing content.
        tokens.push({ type: 'raw', value: source.slice(i) });
        i = source.length;
      } else {
        tokens.push({ type: 'comment', value: source.slice(i, end + 3) });
        i = end + 3;
      }
      continue;
    }

    if (source[i] === '<') {
      if (source.startsWith('<!', i) || source.startsWith('<?', i)) {
        flushText();
        const end = source.indexOf('>', i + 2);
        if (end === -1) {
          tokens.push({ type: 'raw', value: source.slice(i) });
          i = source.length;
        } else {
          tokens.push({ type: 'doctype', value: source.slice(i, end + 1) });
          i = end + 1;
        }
        continue;
      }

      const tag = readTag(source, i);
      if (tag) {
        flushText();
        tokens.push({
          type: 'tag',
          name: tag.name,
          closing: tag.closing,
          value: collapseTagWhitespace(tag.raw),
        });
        i = tag.end;

        if (!tag.closing && RAW_TEXT_TAGS.has(tag.name)) {
          const needle = '</' + tag.name;
          let close = lower.indexOf(needle, i);
          while (close !== -1 && !/[\s/>]/.test(lower[close + needle.length] || '')) {
            close = lower.indexOf(needle, close + 1);
          }
          if (close === -1) {
            tokens.push({ type: 'raw', value: source.slice(i) });
            i = source.length;
          } else {
            const closeEnd = source.indexOf('>', close);
            if (closeEnd === -1) {
              tokens.push({ type: 'raw', value: source.slice(i) });
              i = source.length;
            } else {
              // Content and closing tag are copied exactly as written.
              tokens.push({ type: 'raw', value: source.slice(i, closeEnd + 1) });
              i = closeEnd + 1;
            }
          }
        }
        continue;
      }
    }

    text += source[i];
    i += 1;
  }

  flushText();
  return tokens;
}

function isBlock(token) {
  return Boolean(token && token.type === 'tag' && BLOCK_TAGS.has(token.name));
}

/** Collapse safe whitespace, strip ordinary comments and keep raw content. */
export function minifyHtml(html) {
  const source = String(html == null ? '' : html);
  if (!source) return '';

  // Drop ordinary comments, then join text that the comment split apart.
  const tokens = [];
  for (const token of tokenizeHtml(source)) {
    if (token.type === 'comment') {
      if (isConditionalComment(token.value)) tokens.push(token);
      continue;
    }
    const previous = tokens[tokens.length - 1];
    if (token.type === 'text' && previous && previous.type === 'text') {
      previous.value += token.value;
    } else {
      tokens.push(token);
    }
  }

  let out = '';
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== 'text') {
      out += token.value;
      continue;
    }

    let text = token.value.replace(/[ \t\r\n\f]+/g, ' ');
    const prevBlock = i === 0 || isBlock(tokens[i - 1]);
    const nextBlock = i === tokens.length - 1 || isBlock(tokens[i + 1]);

    if (text === ' ') {
      if (prevBlock || nextBlock) continue;
    } else {
      if (prevBlock) text = text.replace(/^ /, '');
      if (nextBlock) text = text.replace(/ $/, '');
    }
    out += text;
  }
  return out;
}

/**
 * Lightweight CSS structural validation. CSso deliberately recovers from
 * broken input, which can silently drop a whole rule; these checks catch the
 * common cases first so the tool can explain the problem instead.
 */
export function checkCssSyntax(css) {
  const source = String(css == null ? '' : css);
  let depth = 0;
  let quote = '';
  let comment = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (comment) {
      if (char === '*' && next === '/') {
        comment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      else if (char === '\n' || char === '\r') {
        return { ok: false, error: 'CSS error: a quoted string is not closed before the end of the line.' };
      }
      continue;
    }

    if (char === '/' && next === '*') {
      comment = true;
      i += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '\\') {
      i += 1; // escaped character, e.g. a brace in a selector
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth < 0) {
        return { ok: false, error: 'CSS error: unexpected “}” — there is no matching opening brace.' };
      }
    }
  }

  if (comment) return { ok: false, error: 'CSS error: a comment is not closed (missing “*/”).' };
  if (quote) return { ok: false, error: 'CSS error: a quoted string is not closed.' };
  if (depth !== 0) {
    return { ok: false, error: 'CSS error: a rule is not closed — check the curly braces.' };
  }
  return { ok: true };
}

/** Percentage saved, rounded to one decimal. Negative if output grew. */
export function reductionPercent(originalBytes, minifiedBytes) {
  const original = Number(originalBytes);
  const minified = Number(minifiedBytes);
  if (!Number.isFinite(original) || original <= 0) return 0;
  if (!Number.isFinite(minified) || minified < 0) return 0;
  return Math.round(((original - minified) / original) * 1000) / 10;
}

/** "12.4%" — one decimal, including for 0 and negative values. */
export function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.0%';
  return number.toFixed(1) + '%';
}
