/**
 * Small, dependency-free Markdown → HTML renderer.
 *
 * Safety model: every piece of source text is HTML-escaped first, and only a
 * fixed set of tags is ever generated. Link and image URLs are scheme-checked,
 * and a final allow-list pass drops anything that could still be dangerous —
 * so JavaScript inside Markdown can never execute.
 */

import { escapeHtml } from './escape.js';

export { escapeHtml };

const BLOCKED_TAGS = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
  'form', 'meta', 'link', 'base', 'template', 'svg', 'math', 'audio', 'video',
]);

const UNSAFE_SCHEME = /^(?:javascript|vbscript|data):/i;

/** Only http(s), mailto, relative paths and fragments are ever linked. */
export function isSafeUrl(url, { image = false } = {}) {
  const value = String(url == null ? '' : url).trim().replace(/[\u0000-\u001f]/g, '');
  if (!value) return false;
  const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return true;
  const name = scheme[1].toLowerCase();
  if (name === 'http' || name === 'https' || name === 'mailto') return true;
  return Boolean(image && name === 'data' && /^data:image\//i.test(value));
}

function cleanTag(tag) {
  const bare = tag.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  const isImage = /^<\s*img[\s>]/i.test(tag);
  return bare.replace(/\s(href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (whole, attr, quoted, dq, sq, bareValue) => {
    const value = (dq !== undefined ? dq : sq !== undefined ? sq : bareValue || '').trim();
    if (UNSAFE_SCHEME.test(value) && !(isImage && /^data:image\//i.test(value))) return ' ' + attr + '="#"';
    return whole;
  });
}

/** Final safety pass over generated HTML: drop dangerous tags/attributes. */
export function sanitizeHtml(html) {
  const blocked = [...BLOCKED_TAGS].join('|');
  return String(html == null ? '' : html)
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove blocked elements together with their contents (script bodies, etc.).
    .replace(new RegExp('<\\s*(' + blocked + ')\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>', 'gi'), '')
    .replace(new RegExp('<\\s*\\/?\\s*(' + blocked + ')\\b[^>]*>', 'gi'), '')
    .replace(/<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g, (tag, name) =>
      BLOCKED_TAGS.has(String(name).toLowerCase()) ? '' : cleanTag(tag));
}

function inline(raw) {
  let text = escapeHtml(raw);
  const stash = [];
  const keep = (html) => {
    stash.push(html);
    return '\u0001' + (stash.length - 1) + '\u0001';
  };

  // Code spans first, so their contents are never re-processed.
  text = text.replace(/(`+)([\s\S]*?)\1/g, (m, ticks, code) => keep('<code>' + code.replace(/^ | $/g, '') + '</code>'));
  text = text.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)\s*\)/g, (m, alt, url) => {
    if (!isSafeUrl(url, { image: true })) return m;
    return keep('<img src="' + url + '" alt="' + alt + '" loading="lazy">');
  });
  text = text.replace(/\[([^\]]+)\]\(\s*([^\s)]+)\s*\)/g, (m, label, url) => {
    if (!isSafeUrl(url)) return m;
    const external = /^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return keep('<a href="' + url + '"' + external + '>' + label + '</a>');
  });

  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^\w_])_([^_\n]+)_/g, '$1<em>$2</em>');

  return text.replace(/\u0001(\d+)\u0001/g, (m, index) => stash[Number(index)]);
}

function inlineLines(lines) {
  let html = '';
  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0) html += / {2,}$/.test(lines[i - 1]) ? '<br>' : ' ';
    html += inline(lines[i].trim());
  }
  return html;
}

function isBlockStart(line) {
  return /^\s*(```|~~~)/.test(line)
    || /^\s{0,3}(#{1,6})\s/.test(line)
    || /^\s{0,3}>/.test(line)
    || /^(\s*)([-*+]|\d{1,9}[.)])\s+/.test(line)
    || /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line);
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isTableSeparator(line) {
  const text = line.trim();
  if (!text.includes('-')) return false;
  if (!/^[|\-:\s]+$/.test(text)) return false;
  return splitTableRow(text).every((cell) => /^:?-+:?$/.test(cell));
}

function tableAlign(cell) {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
}

function renderListLevel(items, level) {
  const tag = items[0].ordered ? 'ol' : 'ul';
  let html = '<' + tag + '>';
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.level !== level) {
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < items.length && items[j].level > level) j += 1;
    const nested = items.slice(i + 1, j);
    const task = item.text.match(/^\[( |x|X)\]\s+(.*)$/);
    const inner = task
      ? '<input type="checkbox" disabled' + (task[1].toLowerCase() === 'x' ? ' checked' : '') + '> ' + inline(task[2])
      : inline(item.text);
    html += '<li>' + inner + (nested.length ? renderListLevel(nested, nested[0].level) : '') + '</li>';
    i = j;
  }
  return html + '</' + tag + '>';
}

function buildList(items) {
  const base = Math.min(...items.map((item) => item.indent));
  const width = items.some((item) => item.indent - base >= 2) ? 2 : 1;
  const normalised = items.map((item) => ({ ...item, level: Math.floor((item.indent - base) / width) }));
  return renderListLevel(normalised, 0);
}

function renderBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([A-Za-z0-9#+._-]*)\s*$/);
    if (fence) {
      const marker = fence[1][0];
      const language = fence[2];
      const closing = new RegExp('^\\s*' + (marker === '`' ? '`{3,}' : '~{3,}') + '\\s*$');
      const buffer = [];
      i += 1;
      while (i < lines.length && !closing.test(lines[i])) {
        buffer.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push('<pre class="md-code"><code'
        + (language ? ' class="language-' + escapeHtml(language) + '"' : '')
        + '>' + escapeHtml(buffer.join('\n')) + '</code></pre>');
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      out.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>');
      i += 1;
      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const buffer = [];
      while (i < lines.length) {
        if (/^\s{0,3}>/.test(lines[i])) {
          buffer.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
          i += 1;
          continue;
        }
        if (!lines[i].trim() && i + 1 < lines.length && /^\s{0,3}>/.test(lines[i + 1])) {
          buffer.push('');
          i += 1;
          continue;
        }
        break;
      }
      out.push('<blockquote>' + renderBlocks(buffer) + '</blockquote>');
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line);
      const aligns = splitTableRow(lines[i + 1]).map(tableAlign);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      let table = '<div class="md-table-wrap"><table><thead><tr>';
      header.forEach((cell, index) => {
        table += '<th' + (aligns[index] ? ' style="text-align:' + aligns[index] + '"' : '') + '>' + inline(cell) + '</th>';
      });
      table += '</tr></thead><tbody>';
      for (const row of rows) {
        table += '<tr>';
        for (let c = 0; c < header.length; c += 1) {
          table += '<td' + (aligns[c] ? ' style="text-align:' + aligns[c] + '"' : '') + '>' + inline(row[c] === undefined ? '' : row[c]) + '</td>';
        }
        table += '</tr>';
      }
      out.push(table + '</tbody></table></div>');
      continue;
    }

    if (/^(\s*)([-*+]|\d{1,9}[.)])\s+/.test(line)) {
      const items = [];
      while (i < lines.length) {
        const match = lines[i].match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
        if (match) {
          items.push({
            indent: match[1].replace(/\t/g, '    ').length,
            ordered: /^\d/.test(match[2]),
            text: match[3],
          });
          i += 1;
          continue;
        }
        if (items.length && lines[i].trim() && /^\s+\S/.test(lines[i])) {
          items[items.length - 1].text += ' ' + lines[i].trim();
          i += 1;
          continue;
        }
        break;
      }
      out.push(buildList(items));
      continue;
    }

    const buffer = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buffer.push(lines[i]);
      i += 1;
    }
    out.push('<p>' + inlineLines(buffer) + '</p>');
  }

  return out.join('\n');
}

/** Render Markdown into sanitized HTML. */
export function renderMarkdown(markdown) {
  const text = String(markdown == null ? '' : markdown).replace(/\r\n?/g, '\n');
  return sanitizeHtml(renderBlocks(text.split('\n')));
}
