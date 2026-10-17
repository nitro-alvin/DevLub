/**
 * QR Code generation and rendering.
 *
 * Encoding is handled by the vendored qrcode-generator library (MIT,
 * Kazuhiko Arase) so the matrix is a real, standards-compliant QR code.
 * Rendering to SVG/Canvas lives here too, which keeps the tool free of
 * third-party rendering guesses.
 */

import qrcode from '../vendor/qrcode.js';

/** The library ships an optional UTF-8 byte encoder; use it for all text. */
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

export const QR_LEVELS = ['L', 'M', 'Q', 'H'];

export const QR_LEVEL_INFO = {
  L: { label: 'L — low (7%)', hint: 'Smallest code, best for clean screens.' },
  M: { label: 'M — medium (15%)', hint: 'Recommended balance for most codes.' },
  Q: { label: 'Q — quartile (25%)', hint: 'Survives more damage or blur.' },
  H: { label: 'H — high (30%)', hint: 'Largest code, strongest recovery.' },
};

/** Pixel sizes offered by the tool. Long text is enlarged past this minimum. */
export const QR_SIZES = [256, 384, 512, 768, 1024];

export const QR_MAX_BYTES = 2953; // byte mode, version 40, level L

/** UTF-8 byte count, matching what actually goes into the QR code. */
export function qrByteLength(text) {
  return new TextEncoder().encode(String(text == null ? '' : text)).length;
}

/**
 * Build a QR matrix for `text`.
 * Returns { ok: true, ... } or { ok: false, empty?, error }.
 * The matrix is a plain array of rows of booleans, which makes it easy to
 * render, inspect and test without touching the DOM.
 */
export function createQr(text, { errorCorrectionLevel = 'M' } = {}) {
  const value = String(text == null ? '' : text);
  if (!value.trim()) {
    return { ok: false, empty: true, error: 'Type or paste some text, a URL or a phone number first.' };
  }

  const level = String(errorCorrectionLevel || 'M').toUpperCase();
  if (!QR_LEVELS.includes(level)) {
    return { ok: false, error: 'Choose a valid error correction level (L, M, Q or H).' };
  }

  const bytes = qrByteLength(value);
  if (bytes > QR_MAX_BYTES) {
    return {
      ok: false,
      error:
        'That text is ' + bytes + ' bytes. A QR code can hold at most ' +
        QR_MAX_BYTES + ' bytes at level L — shorten it or lower the error correction level.',
    };
  }

  try {
    const qr = qrcode(0, level); // 0 = pick the smallest version that fits
    qr.addData(value, 'Byte');
    qr.make();

    const moduleCount = qr.getModuleCount();
    const modules = new Array(moduleCount);
    for (let row = 0; row < moduleCount; row += 1) {
      const line = new Array(moduleCount);
      for (let col = 0; col < moduleCount; col += 1) line[col] = qr.isDark(row, col);
      modules[row] = line;
    }

    return {
      ok: true,
      text: value,
      modules,
      moduleCount,
      version: (moduleCount - 17) / 4,
      errorCorrectionLevel: level,
      byteLength: bytes,
    };
  } catch (error) {
    const message = String((error && error.message) || error || '');
    if (/overflow|too long|length/i.test(message)) {
      return {
        ok: false,
        error:
          'That text is too long for a QR code at level ' + level +
          '. Shorten it or choose a lower error correction level.',
      };
    }
    return { ok: false, error: 'The QR code could not be generated. Try shorter or simpler text.' };
  }
}

/**
 * Pick an output size with a uniform, integer pixel size per module.
 * Fractional module widths are the usual reason a dense QR code will not
 * scan, so the requested size is a minimum rather than an exact guarantee:
 * the result is always a whole number of pixels per module (at least 2).
 */
export function qrOutputSize(qr, size, margin = 4) {
  const requested = Math.max(1, Math.round(Number(size) || 512));
  const quiet = Math.max(0, Math.round(Number(margin) || 0));
  const total = qr.moduleCount + quiet * 2;
  const cell = Math.max(2, Math.ceil(requested / total));
  return cell * total;
}

/**
 * Render a QR as a standalone SVG string. Fixed white background and black
 * modules keep it scannable in both the dark and light UI themes.
 */
export function createQrSvg(qr, { size = 512, margin = 4 } = {}) {
  const quiet = Math.max(0, Math.round(Number(margin) || 0));
  const total = qr.moduleCount + quiet * 2;
  const outputSize = qrOutputSize(qr, size, quiet);
  let path = '';

  for (let row = 0; row < qr.moduleCount; row += 1) {
    let col = 0;
    while (col < qr.moduleCount) {
      if (!qr.modules[row][col]) {
        col += 1;
        continue;
      }
      let run = 1;
      while (col + run < qr.moduleCount && qr.modules[row][col + run]) run += 1;
      path += 'M' + (col + quiet) + ' ' + (row + quiet) + 'h' + run + 'v1h-' + run + 'z';
      col += run;
    }
  }

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + outputSize + '" height="' + outputSize +
    '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges" role="img" aria-label="QR code">' +
    '<rect width="100%" height="100%" fill="#ffffff"/>' +
    (path ? '<path d="' + path + '" fill="#000000"/>' : '') +
    '</svg>'
  );
}

/**
 * Paint a QR onto a canvas at the requested size (never below 2 px/module).
 * Returns the actual pixel size used.
 */
export function drawQrToCanvas(canvas, qr, { size = 512, margin = 4 } = {}) {
  const quiet = Math.max(0, Math.round(Number(margin) || 0));
  const total = qr.moduleCount + quiet * 2;
  const outputSize = qrOutputSize(qr, size, quiet);
  const cell = outputSize / total; // always an integer
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the QR canvas.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, outputSize, outputSize);
  context.fillStyle = '#000000';

  // Paint horizontal runs so dense codes need far fewer canvas operations.
  for (let row = 0; row < qr.moduleCount; row += 1) {
    const y = (row + quiet) * cell;
    let col = 0;
    while (col < qr.moduleCount) {
      if (!qr.modules[row][col]) {
        col += 1;
        continue;
      }
      let run = 1;
      while (col + run < qr.moduleCount && qr.modules[row][col + run]) run += 1;
      context.fillRect((col + quiet) * cell, y, run * cell, cell);
      col += run;
    }
  }

  return outputSize;
}
