/** HTML entity encode / decode (named, decimal and hexadecimal entities). */

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  iexcl: '\u00a1', cent: '\u00a2', pound: '\u00a3', curren: '\u00a4', yen: '\u00a5',
  brvbar: '\u00a6', sect: '\u00a7', uml: '\u00a8', copy: '\u00a9', ordf: '\u00aa',
  laquo: '\u00ab', not: '\u00ac', shy: '\u00ad', reg: '\u00ae', macr: '\u00af',
  deg: '\u00b0', plusmn: '\u00b1', sup2: '\u00b2', sup3: '\u00b3', acute: '\u00b4',
  micro: '\u00b5', para: '\u00b6', middot: '\u00b7', cedil: '\u00b8', sup1: '\u00b9',
  ordm: '\u00ba', raquo: '\u00bb', frac14: '\u00bc', frac12: '\u00bd', frac34: '\u00be',
  iquest: '\u00bf', times: '\u00d7', divide: '\u00f7',
  OElig: '\u0152', oelig: '\u0153', Scaron: '\u0160', scaron: '\u0161', Yuml: '\u0178',
  fnof: '\u0192', circ: '\u02c6', tilde: '\u02dc',
  ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', zwnj: '\u200c', zwj: '\u200d',
  lrm: '\u200e', rlm: '\u200f', ndash: '\u2013', mdash: '\u2014',
  lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201a', ldquo: '\u201c', rdquo: '\u201d',
  bdquo: '\u201e', dagger: '\u2020', Dagger: '\u2021', bull: '\u2022', hellip: '\u2026',
  permil: '\u2030', prime: '\u2032', Prime: '\u2033', lsaquo: '\u2039', rsaquo: '\u203a',
  oline: '\u203e', frasl: '\u2044', euro: '\u20ac', trade: '\u2122', minus: '\u2212',
  lowast: '\u2217', infin: '\u221e', ne: '\u2260', le: '\u2264', ge: '\u2265',
  larr: '\u2190', uarr: '\u2191', rarr: '\u2192', darr: '\u2193', harr: '\u2194',
  spades: '\u2660', clubs: '\u2663', hearts: '\u2665', diams: '\u2666',
  check: '\u2713', cross: '\u2717', star: '\u2606',
};

const REVERSE = new Map();
for (const [name, char] of Object.entries(NAMED)) {
  if (!REVERSE.has(char)) REVERSE.set(char, name);
}

const ENTITY_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/**
 * Encode text for safe use in HTML.
 * The five structural characters always become named entities; with
 * `encodeNonAscii` any remaining non-ASCII code point becomes a numeric one.
 */
export function encodeEntities(text, { encodeNonAscii = false } = {}) {
  let out = '';
  for (const char of String(text == null ? '' : text)) {
    if (char === '&') out += '&amp;';
    else if (char === '<') out += '&lt;';
    else if (char === '>') out += '&gt;';
    else if (char === '"') out += '&quot;';
    else if (char === "'") out += '&#39;';
    else if (encodeNonAscii && char.codePointAt(0) > 127) {
      out += '&#x' + char.codePointAt(0).toString(16).toUpperCase() + ';';
    } else out += char;
  }
  return out;
}

/**
 * Decode named, decimal and hexadecimal entities in a single pass, so
 * "&amp;lt;" becomes "&lt;" rather than "<". Unknown entities are left alone.
 */
export function decodeEntities(text) {
  return String(text == null ? '' : text).replace(ENTITY_RE, (whole, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return whole;
      // Surrogate halves are not valid stand-alone code points.
      if (code >= 0xd800 && code <= 0xdfff) return whole;
      return String.fromCodePoint(code);
    }
    return Object.prototype.hasOwnProperty.call(NAMED, body) ? NAMED[body] : whole;
  });
}
