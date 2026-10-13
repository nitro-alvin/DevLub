/** Unit tests for the pure logic modules (run with: node --test). */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatJson, minifyJson, validateJson } from '../js/lib/json.js';
import { encodeBase64, decodeBase64 } from '../js/lib/base64.js';
import { encodeUrl, decodeUrl } from '../js/lib/url.js';
import { generateUuid, generateUuids } from '../js/lib/uuid.js';
import { countText } from '../js/lib/text-stats.js';

// ---------- JSON ----------
test('formatJson pretty-prints compact JSON', () => {
  const result = formatJson('{"name":"Alvin","age":18}');
  assert.equal(result.ok, true);
  assert.equal(result.output, '{\n  "name": "Alvin",\n  "age": 18\n}');
});

test('formatJson handles nested structures, unicode and arrays', () => {
  const input = '{"list":[1,2,{"lang":"മലയാളം","emoji":"🙏"}],"ok":true,"nothing":null}';
  const result = formatJson(input);
  assert.equal(result.ok, true);
  assert.ok(result.output.includes('"lang": "മലയാളം"'));
  assert.deepEqual(JSON.parse(result.output), JSON.parse(input));
});

test('formatJson reports invalid JSON without throwing', () => {
  const result = formatJson('{"name": "Alvin",}');
  assert.equal(result.ok, false);
  assert.match(result.error, /^Invalid JSON:/);
});

test('formatJson error message includes position details when available', () => {
  const trailing = formatJson('{\n  "a": 1,\n  "b": 2\n} extra');
  assert.equal(trailing.ok, false);
  assert.match(trailing.error, /Invalid JSON/);
  assert.match(trailing.error, /line \d+/);

  const missingName = formatJson('{"name": "Alvin",}');
  assert.equal(missingName.ok, false);
  assert.match(missingName.error, /column 18/);
});

test('formatJson survives errors without position info', () => {
  const result = formatJson('{\n  "a": 1,\n  "b": oops\n}');
  assert.equal(result.ok, false);
  assert.match(result.error, /^Invalid JSON: /);
});

test('minifyJson removes whitespace', () => {
  const result = minifyJson('{\n  "a": [1, 2],\n  "b": "x y"\n}');
  assert.equal(result.ok, true);
  assert.equal(result.output, '{"a":[1,2],"b":"x y"}');
});

test('validateJson accepts scalars and rejects garbage', () => {
  assert.equal(validateJson('42').ok, true);
  assert.equal(validateJson('"hello"').ok, true);
  assert.equal(validateJson('null').ok, true);
  assert.equal(validateJson('hello').ok, false);
  assert.equal(validateJson('').ok, false);
});

// ---------- Base64 ----------
test('encodeBase64 matches known values', () => {
  assert.equal(encodeBase64('Man'), 'TWFu');
  assert.equal(encodeBase64(''), '');
  assert.equal(encodeBase64('✓'), '4pyT');
});

test('base64 roundtrip keeps Malayalam, emoji and newlines intact', () => {
  const text = 'നമസ്കാരം 🙏✨\nSecond line — with "quotes" & symbols ~!@#$%^&*()';
  const encoded = encodeBase64(text);
  assert.match(encoded, /^[A-Za-z0-9+/]+={0,2}$/);
  assert.equal(decodeBase64(encoded), text);
});

test('decodeBase64 tolerates whitespace, missing padding and long input', () => {
  assert.equal(decodeBase64('  TWFu\n'), 'Man');
  assert.equal(decodeBase64('TWFu'), 'Man');
  const long = 'x'.repeat(100000);
  assert.equal(decodeBase64(encodeBase64(long)), long);
});

test('decodeBase64 rejects invalid input with friendly errors', () => {
  assert.throws(() => decodeBase64('not!!valid@@base64'), /Invalid Base64/);
  assert.throws(() => decodeBase64('QQQQQQQQQ'), /Invalid Base64/); // length % 4 === 1
  assert.throws(() => decodeBase64('////'), /not valid UTF-8/); // valid base64, invalid UTF-8
});

// ---------- URL ----------
test('encodeUrl percent-encodes reserved characters and unicode', () => {
  assert.equal(encodeUrl('a b&c=d'), 'a%20b%26c%3Dd');
  assert.equal(encodeUrl('你好 😀'), '%E4%BD%A0%E5%A5%BD%20%F0%9F%98%80');
});

test('url encode/decode roundtrips and malformed input fails gracefully', () => {
  const text = 'query=hello world & lang=മലയാളം';
  assert.equal(decodeUrl(encodeUrl(text)), text);
  assert.equal(decodeUrl('plain text'), 'plain text'); // nothing to decode
  assert.throws(() => decodeUrl('broken%2%sequence'), /Invalid URL encoding/);
});

// ---------- UUID ----------
test('generateUuid returns RFC 4122 v4 UUIDs', () => {
  const uuid = generateUuid();
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('generateUuids produces the requested count, all unique', () => {
  const uuids = generateUuids(50);
  assert.equal(uuids.length, 50);
  assert.equal(new Set(uuids).size, 50);
});

// ---------- Text counter ----------
test('countText reports all statistics', () => {
  const stats = countText('Hello world. How are you? Fine!');
  assert.equal(stats.characters, 31);
  assert.equal(stats.charactersNoSpaces, 26);
  assert.equal(stats.words, 6);
  assert.equal(stats.lines, 1);
  assert.equal(stats.sentences, 3);
  assert.equal(stats.utf8Bytes, 31);
});

test('countText handles multiline, unicode and empty input', () => {
  const stats = countText('line one\nline two\n');
  assert.equal(stats.lines, 3);
  assert.equal(stats.words, 4);

  const malayalam = countText('നമസ്കാരം 🙏');
  assert.equal(malayalam.characters, 10); // 8 Malayalam code points + space + emoji
  assert.equal(malayalam.charactersNoSpaces, 9);
  assert.equal(malayalam.utf8Bytes, new TextEncoder().encode('നമസ്കാരം 🙏').length);
  assert.ok(malayalam.utf8Bytes > malayalam.characters, 'UTF-8 bytes should exceed code points for Malayalam');

  const empty = countText('');
  assert.deepEqual(empty, { characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, sentences: 0, utf8Bytes: 0 });
});

// ---------- Colour ----------
import { convertColor, parseHex, parseRgb, parseHsl } from '../js/lib/color.js';

test('convertColor converts all three directions', () => {
  const fromHex = convertColor('#ff0000', 'hex');
  assert.equal(fromHex.rgb, '255, 0, 0');
  assert.equal(fromHex.hsl, '0, 100%, 50%');

  const fromRgb = convertColor('0, 0, 255', 'rgb');
  assert.equal(fromRgb.hex, '#0000ff');
  assert.equal(fromRgb.hsl, '240, 100%, 50%');

  const fromHsl = convertColor('120, 100%, 50%', 'hsl');
  assert.equal(fromHsl.hex, '#00ff00');
  assert.equal(fromHsl.rgb, '0, 255, 0');
});

test('convertColor accepts shorthand hex, # prefixes and css-style wrappers', () => {
  assert.equal(convertColor('#fff', 'hex').rgb, '255, 255, 255');
  assert.equal(convertColor('4c8dff', 'hex').rgb, '76, 141, 255');
  assert.equal(convertColor('rgb(76, 141, 255)', 'rgb').hex, '#4c8dff');
  assert.equal(convertColor('hsl(240 100% 50%)', 'hsl').rgb, '0, 0, 255');
});

test('convertColor rejects invalid input with helpful messages', () => {
  assert.throws(() => convertColor('#gg00zz', 'hex'), /Enter a colour like/);
  assert.throws(() => convertColor('300, 0, 0', 'rgb'), /three numbers between 0 and 255/);
  assert.throws(() => convertColor('10, 20', 'rgb'), /Enter RGB/);
  assert.throws(() => convertColor('400, 50%, 50%', 'hsl'), /hue 0/);
  assert.throws(() => convertColor('x', 'nope'), /Unknown colour format/);
  assert.throws(() => parseHex('#12'), /Enter a colour like/);
  assert.throws(() => parseRgb('abc'), /Enter RGB/);
  assert.throws(() => parseHsl('hsl(12)', 'hsl'), /Enter HSL/);
});

// ---------- SHA-256 ----------
import { sha256Hex, isSha256Supported } from '../js/lib/hash.js';

test('sha256Hex matches known digests and is available in modern runtimes', async () => {
  assert.equal(isSha256Supported(), true);
  assert.equal(
    await sha256Hex(''),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
  assert.equal(
    await sha256Hex('hello world'),
    'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  );
  // Unicode is hashed as UTF-8, same as the browser's TextEncoder path.
  assert.equal(
    await sha256Hex('\u0D28\u0D2E\u0D38\u0D4D\u0D15\u0D3E\u0D30\u0D02'),
    'c9e70fa04f455d3989c191e63415fc2d343a76bd36fd8212625cdc2f2394a176',
  );
});

// ---------- Timestamp ----------
import { parseTimestamp, parseDateTimeInput, detectTimestampUnit, formatUtc } from '../js/lib/timestamp.js';

test('parseTimestamp handles seconds, milliseconds and auto-detection', () => {
  const asSeconds = parseTimestamp('1700000000', 'auto');
  assert.equal(asSeconds.ok, true);
  assert.equal(asSeconds.unit, 's');
  assert.equal(formatUtc(asSeconds.date), 'Tue, 14 Nov 2023 22:13:20 GMT');

  const asMillis = parseTimestamp('1700000000000', 'auto');
  assert.equal(asMillis.ok, true);
  assert.equal(asMillis.unit, 'ms');
  assert.equal(formatUtc(asMillis.date), 'Tue, 14 Nov 2023 22:13:20 GMT');

  // Explicit unit overrides detection: ms value read as seconds -> out of Date range.
  const forced = parseTimestamp('170000000000000000', 's');
  assert.equal(forced.ok, false);
  assert.match(forced.error, /outside the range/);

  assert.equal(detectTimestampUnit(1700000000), 's');
  assert.equal(detectTimestampUnit(1700000000000), 'ms');
});

test('parseTimestamp treats empty input as no-result and invalid input as an error', () => {
  const empty = parseTimestamp('');
  assert.equal(empty.ok, false);
  assert.equal(empty.empty, true);
  const halfTyped = parseTimestamp('-');
  assert.equal(halfTyped.empty, true); // still typing, not an error
  const trailingDot = parseTimestamp('12.');
  assert.equal(trailingDot.empty, true); // decimal point mid-edit
  const small = parseTimestamp('1700'); // a complete, valid (small) timestamp
  assert.equal(small.ok, true);
  assert.equal(small.unit, 's');
  const invalid = parseTimestamp('yesterday');
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /Enter a Unix timestamp/);
  const outOfRange = parseTimestamp('99999999999999999');
  assert.equal(outOfRange.ok, false);
  assert.match(outOfRange.error, /outside the range/);
});

test('parseDateTimeInput converts local datetime values', () => {
  const result = parseDateTimeInput('2023-11-15T03:43:20'); // IST interpretation in test env
  assert.equal(result.ok, true);
  assert.equal(result.seconds * 1000, result.ms);
  const empty = parseDateTimeInput('');
  assert.equal(empty.empty, true);
  const invalid = parseDateTimeInput('not-a-date');
  assert.equal(invalid.ok, false);
});

test('sha256Hex fails gracefully when Web Crypto is unavailable', async () => {
  // Simulate a non-secure context (e.g. plain-HTTP hosting) where crypto is absent.
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true, writable: true });
  try {
    assert.equal(isSha256Supported(), false);
    await assert.rejects(
      () => sha256Hex('hello'),
      (error) => {
        assert.match(error.message, /secure context/); // the same message the tool shows
        return true;
      },
    );
  } finally {
    Object.defineProperty(globalThis, 'crypto', original);
  }
  assert.equal(isSha256Supported(), true); // environment restored
});
