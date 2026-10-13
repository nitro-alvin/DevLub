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
