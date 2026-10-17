/** Unit tests for the QR generator and its renderers. */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQr,
  createQrSvg,
  qrByteLength,
  qrOutputSize,
} from '../js/lib/qr.js';

function assertFinder(matrix, top, left) {
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const border = row === 0 || row === 6 || col === 0 || col === 6;
      const center = row >= 2 && row <= 4 && col >= 2 && col <= 4;
      assert.equal(
        matrix[top + row][left + col],
        border || center,
        'finder pattern mismatch at ' + (top + row) + ',' + (left + col),
      );
    }
  }
}

test('a URL produces a structurally valid QR matrix', () => {
  const qr = createQr('https://github.com/nitro-alvin/PocketDevTools', { errorCorrectionLevel: 'M' });
  assert.equal(qr.ok, true);
  assert.equal(qr.errorCorrectionLevel, 'M');
  assert.equal((qr.moduleCount - 17) % 4, 0);
  assert.ok(qr.moduleCount >= 21 && qr.moduleCount <= 177);
  assert.equal(qr.version, (qr.moduleCount - 17) / 4);
  assert.equal(qr.byteLength, qrByteLength(qr.text));
  assert.ok(qr.byteLength > 0);

  // Three finder patterns, exactly where a scanner looks for them.
  assertFinder(qr.modules, 0, 0);
  assertFinder(qr.modules, 0, qr.moduleCount - 7);
  assertFinder(qr.modules, qr.moduleCount - 7, 0);

  // Timing patterns alternate between the finders on row/column 6.
  for (let i = 8; i < qr.moduleCount - 8; i += 1) {
    assert.equal(qr.modules[6][i], i % 2 === 0, 'row timing pattern at ' + i);
    assert.equal(qr.modules[i][6], i % 2 === 0, 'column timing pattern at ' + i);
  }
});

test('plain text, emails, phone numbers and Unicode all encode', () => {
  const samples = [
    'Hello, Pocket DevTools!',
    'hello@example.com',
    '+1 555 0100',
    'Malayalam: നമസ്കാരം 🎉',
    'Line one\nLine two\nLine three',
    'https://example.com/path?q=1&x=2',
  ];
  for (const sample of samples) {
    const qr = createQr(sample);
    assert.equal(qr.ok, true, sample + ' should encode');
    assert.equal(qr.text, sample, 'text must be preserved exactly');
    assert.equal(qr.byteLength, qrByteLength(sample));
    assert.equal(qr.modules.length, qr.moduleCount);
  }

  const emoji = createQr('🎉🙏');
  assert.equal(emoji.ok, true);
  assert.equal(emoji.byteLength, 8); // 4 UTF-8 bytes per emoji
});

test('higher error correction uses an equal or larger version', () => {
  const text = 'The quick brown fox jumps over the lazy dog. '.repeat(4).trim();
  const low = createQr(text, { errorCorrectionLevel: 'L' });
  const high = createQr(text, { errorCorrectionLevel: 'H' });
  assert.equal(low.ok, true);
  assert.equal(high.ok, true);
  assert.ok(high.moduleCount >= low.moduleCount);
  assert.equal(low.errorCorrectionLevel, 'L');
  assert.equal(high.errorCorrectionLevel, 'H');
});

test('long text encodes and too-long text is rejected clearly', () => {
  const long = createQr('a'.repeat(2000), { errorCorrectionLevel: 'L' });
  assert.equal(long.ok, true);
  assert.ok(long.version > 20);
  assert.ok(long.moduleCount > 100);

  const tooLong = createQr('a'.repeat(4000), { errorCorrectionLevel: 'L' });
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.error, /at most 2953 bytes/i);

  const tooLongForH = createQr('a'.repeat(2000), { errorCorrectionLevel: 'H' });
  assert.equal(tooLongForH.ok, false);
  assert.match(tooLongForH.error, /too long/i);
});

test('empty input and invalid options return friendly errors', () => {
  const empty = createQr('');
  assert.equal(empty.ok, false);
  assert.equal(empty.empty, true);
  assert.match(empty.error, /Type or paste/i);

  const spaces = createQr('   \n\t ');
  assert.equal(spaces.empty, true);

  const badLevel = createQr('text', { errorCorrectionLevel: 'Z' });
  assert.equal(badLevel.ok, false);
  assert.match(badLevel.error, /error correction level/i);
});

test('SVG rendering keeps a quiet zone and no external resources', () => {
  const qr = createQr('Pocket DevTools');
  const svg = createQrSvg(qr, { size: 512, margin: 4 });
  const total = qr.moduleCount + 8;
  const outputSize = qrOutputSize(qr, 512, 4);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(svg.includes('viewBox="0 0 ' + total + ' ' + total + '"'));
  assert.ok(svg.includes('width="' + outputSize + '" height="' + outputSize + '"'));
  assert.ok(outputSize >= 512);
  assert.equal(outputSize % total, 0, 'modules must have a uniform integer size');
  assert.ok(svg.includes('fill="#ffffff"'));
  assert.ok(svg.includes('fill="#000000"'));
  assert.ok(!svg.includes('NaN'));
  assert.ok(!svg.includes('<script'));

  const noMargin = createQrSvg(qr, { size: 256, margin: 0 });
  const noMarginSize = qrOutputSize(qr, 256, 0);
  assert.ok(noMargin.includes('viewBox="0 0 ' + qr.moduleCount + ' ' + qr.moduleCount + '"'));
  assert.ok(noMargin.includes('width="' + noMarginSize + '" height="' + noMarginSize + '"'));
});

test('output keeps uniform modules and never falls below the requested size', () => {
  const qr = createQr('a'.repeat(2000), { errorCorrectionLevel: 'L' });
  const total = qr.moduleCount + 8;
  assert.equal(qrOutputSize(qr, 256, 4), total * 2);
  const big = qrOutputSize(qr, 1024, 4);
  assert.ok(big >= 1024);
  assert.equal(big % total, 0);
});
