/** Number base conversion built on BigInt, so large integers stay exact. */

export const BASE_OPTIONS = [
  { value: '2', label: 'Binary (2)' },
  { value: '8', label: 'Octal (8)' },
  { value: '10', label: 'Decimal (10)' },
  { value: '16', label: 'Hexadecimal (16)' },
];

const RADIX = { 2: 2, 8: 8, 10: 10, 16: 16 };
const NAME = { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hexadecimal' };
const DIGIT_HELP = { 2: '0 and 1', 8: '0 to 7', 10: '0 to 9', 16: '0 to 9 and A to F' };
const DIGIT = { 2: /^[01]$/, 8: /^[0-7]$/, 10: /^[0-9]$/, 16: /^[0-9a-f]$/ };
const PREFIX = { 2: /^0b/, 8: /^0o/, 16: /^0x/ };
const BIGINT_PREFIX = { 2: '0b', 8: '0o', 16: '0x', 10: '' };

/**
 * Convert `raw` (text in `fromBase`) into all four bases.
 * Returns { ok: false, empty } for an empty field, { ok: false, error } for
 * invalid digits, or { ok: true, binary, octal, decimal, hex } on success.
 */
export function convertNumberBase(raw, fromBase) {
  const base = Number(fromBase);
  if (!RADIX[base]) return { ok: false, error: 'Choose a base of 2, 8, 10 or 16.' };

  let text = String(raw == null ? '' : raw).trim();
  if (!text) return { ok: false, empty: true };

  let negative = false;
  if (text[0] === '+' || text[0] === '-') {
    negative = text[0] === '-';
    text = text.slice(1).trim();
  }
  // Accept a matching 0b / 0o / 0x prefix, and digit-group separators.
  if (base !== 10) text = text.replace(PREFIX[base], '');
  const digits = text.replace(/[\s_]/g, '').toLowerCase();
  if (!digits) return { ok: false, empty: true };

  for (const char of digits) {
    if (!DIGIT[base].test(char)) {
      return {
        ok: false,
        error: 'Invalid ' + NAME[base] + ' digit "' + char + '". Use ' + DIGIT_HELP[base] + '.',
      };
    }
  }

  const magnitude = BigInt(BIGINT_PREFIX[base] + digits);
  const value = negative ? -magnitude : magnitude;
  return {
    ok: true,
    value,
    negative,
    binary: value.toString(2),
    octal: value.toString(8),
    decimal: value.toString(10),
    hex: value.toString(16).toUpperCase(),
  };
}
