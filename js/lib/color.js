/** Colour parsing and conversions: HEX ⇄ RGB ⇄ HSL. Pure functions. */

const HEX_ERROR = 'Enter a colour like #4c8dff — 3 or 6 hex digits, with or without "#".';
const RGB_ERROR = 'Enter RGB like 76, 141, 255 — three numbers between 0 and 255.';
const HSL_ERROR = 'Enter HSL like 217, 100%, 65% — hue 0–360, saturation and lightness 0–100.';

const NUMBER = /^-?\d+(\.\d+)?$/;

function wrapperBody(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : text;
}

export function parseHex(input) {
  let text = String(input).trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(text)) {
    text = text.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9a-f]{6}$/.test(text)) throw new Error(HEX_ERROR);
  return {
    r: parseInt(text.slice(0, 2), 16),
    g: parseInt(text.slice(2, 4), 16),
    b: parseInt(text.slice(4, 6), 16),
  };
}

export function parseRgb(input) {
  const body = wrapperBody(String(input).trim(), /^rgba?\(([^)]+)\)$/i);
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length !== 3) throw new Error(RGB_ERROR);
  const channels = parts.map((part) => {
    if (!NUMBER.test(part)) throw new Error(RGB_ERROR);
    return Math.round(Number(part));
  });
  if (channels.some((channel) => channel < 0 || channel > 255)) throw new Error(RGB_ERROR);
  return { r: channels[0], g: channels[1], b: channels[2] };
}

export function parseHsl(input) {
  const body = wrapperBody(String(input).trim(), /^hsla?\(([^)]+)\)$/i);
  const parts = body.split(/[\s,/]+/).filter(Boolean).map((part) => part.replace(/%$/, ''));
  if (parts.length !== 3) throw new Error(HSL_ERROR);
  if (!parts.every((part) => NUMBER.test(part))) throw new Error(HSL_ERROR);
  const [h, s, l] = parts.map(Number);
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) throw new Error(HSL_ERROR);
  return { h, s, l };
}

export function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rn) hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
    hue *= 60;
  }
  return { h: hue, s: saturation * 100, l: lightness * 100 };
}

export function hslToRgb({ h, s, l }) {
  const hue = (((h % 360) + 360) % 360);
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  const match = lightness - chroma / 2;
  let rgb;
  if (section < 1) rgb = [chroma, second, 0];
  else if (section < 2) rgb = [second, chroma, 0];
  else if (section < 3) rgb = [0, chroma, second];
  else if (section < 4) rgb = [0, second, chroma];
  else if (section < 5) rgb = [second, 0, chroma];
  else rgb = [chroma, 0, second];
  return {
    r: Math.round((rgb[0] + match) * 255),
    g: Math.round((rgb[1] + match) * 255),
    b: Math.round((rgb[2] + match) * 255),
  };
}

const round1 = (value) => Math.round(value * 10) / 10;

export function formatHex({ r, g, b }) {
  return '#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('');
}

export function formatRgb({ r, g, b }) {
  return r + ', ' + g + ', ' + b;
}

export function formatHsl({ h, s, l }) {
  return round1(h) + ', ' + round1(s) + '%, ' + round1(l) + '%';
}

/**
 * Convert one field's text into all three representations.
 * `format` is the key of the field being edited: 'hex' | 'rgb' | 'hsl'.
 * Throws an Error with a friendly message when the input is invalid.
 */
export function convertColor(text, format) {
  if (format !== 'hex' && format !== 'rgb' && format !== 'hsl') {
    throw new Error('Unknown colour format: ' + format);
  }
  const rgb = format === 'hex'
    ? parseHex(text)
    : format === 'rgb'
      ? parseRgb(text)
      : hslToRgb(parseHsl(text));
  return {
    hex: formatHex(rgb),
    rgb: formatRgb(rgb),
    hsl: formatHsl(rgbToHsl(rgb)),
  };
}
