/** Static checks: page wiring, tool registry, and the offline/privacy constraints. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tools } from '../js/tools/registry.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const html = read('index.html');
const jsFiles = listFiles(join(root, 'js')).filter((f) => f.endsWith('.js'));
const css = read('css/styles.css');

test('index.html references local assets that exist', () => {
  for (const ref of ['css/styles.css', 'js/main.js', 'favicon.svg']) {
    assert.ok(html.includes(ref), 'index.html should reference ' + ref);
    assert.ok(existsSync(join(root, ref)), ref + ' should exist');
  }
  assert.ok(html.includes('width=device-width'), 'viewport meta tag is required for mobile');
  assert.ok(html.includes('type="module"'), 'main script must be an ES module');
});

test('every element id used from the shell exists in index.html', () => {
  const shellJs = read('js/main.js') + read('js/home.js') + read('js/theme.js');
  const ids = [...shellJs.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(ids.length >= 5, 'expected the shell to look up several ids');
  for (const id of new Set(ids)) {
    assert.ok(html.includes('id="' + id + '"'), 'index.html is missing #' + id);
  }
});

test('tool views use unique element ids', () => {
  const toolFiles = jsFiles.filter((f) => f.includes('tools' + '/'));
  const seen = new Map();
  for (const file of toolFiles) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/id="([a-z0-9-]+)"/g)) {
      const id = match[1];
      assert.ok(!seen.has(id), 'duplicate element id ' + id + ' in ' + file + ' and ' + seen.get(id));
      seen.set(id, file);
    }
  }
});

test('the registry exposes exactly the twenty tools', () => {
  assert.deepEqual(tools.map((t) => t.id), [
    'json', 'base64', 'url', 'uuid', 'counter', 'color', 'hash', 'timestamp',
    'diff', 'jwt', 'regex', 'sql', 'json2csv', 'markdown', 'httpstatus', 'cron', 'htmlentity', 'base',
    'qr', 'minifier',
  ]);
  for (const tool of tools) {
    assert.equal(typeof tool.name, 'string');
    assert.ok(tool.name.length > 0);
    assert.equal(typeof tool.description, 'string');
    assert.ok(tool.description.length > 0);
    assert.ok(Array.isArray(tool.keywords) && tool.keywords.length > 0);
    assert.equal(typeof tool.badge, 'string');
    assert.equal(typeof tool.mount, 'function');
  }
});

test('every tool offers a download control and the right tools offer file import', () => {
  // Import suits text/code tools; it is deliberately absent from the reference-style
  // tools (colour, UUID, timestamp, HTTP status, cron, number bases).
  const withImport = [
    'json', 'base64', 'url', 'counter', 'hash',
    'diff', 'jwt', 'regex', 'sql', 'json2csv', 'markdown', 'htmlentity', 'qr', 'minifier',
  ];
  // The HTTP status lookup is a static reference, so it generates nothing to download.
  // The QR tool has dedicated PNG/SVG buttons instead of the shared name bar.
  const withDownload = tools.map((tool) => tool.id).filter((id) => id !== 'httpstatus');
  for (const tool of tools) {
    const source = read('js/tools/' + tool.id + '.js');
    if (tool.id === 'qr') {
      assert.ok(source.includes('downloadBlob'), 'qr should download a PNG');
      assert.ok(source.includes('downloadText'), 'qr should download an SVG');
    } else if (withDownload.includes(tool.id)) {
      assert.ok(source.includes('downloadMarkup'), tool.id + ' should offer a download control');
    } else {
      assert.ok(!source.includes('downloadMarkup'), tool.id + ' should not offer a download control');
    }
    if (withImport.includes(tool.id)) {
      assert.ok(source.includes('fileImportMarkup'), tool.id + ' should offer file import');
    } else {
      assert.ok(!source.includes('fileImportMarkup'), tool.id + ' should not force file import');
    }
  }
});

test('the app never contacts the network or leaves data on the device', () => {
  // Third-party bundles carry source/licence URLs in comments. The W3C SVG
  // namespace is an identifier, not a request. Every other URL is rejected.
  const allowedUrls = new Set(['http://www.w3.org/2000/svg']);
  for (const file of jsFiles) {
    const source = readFileSync(file, 'utf8');
    assert.ok(!/\bfetch\s*\(/.test(source), file + ' must not call fetch()');
    if (file.includes('/vendor/')) {
      // Bundled libraries list browser globals (including XMLHttpRequest) as
      // names; only an actual call would be a network request.
      assert.ok(!/new\s+XMLHttpRequest\s*\(/.test(source), file + ' must not create an XMLHttpRequest');
      assert.ok(!/navigator\.sendBeacon\s*\(/.test(source), file + ' must not call sendBeacon');
      continue;
    }
    assert.ok(!/XMLHttpRequest/.test(source), file + ' must not use XMLHttpRequest');
    assert.ok(!/sendBeacon/.test(source), file + ' must not use sendBeacon');
    for (const match of source.matchAll(/https?:\/\/[^\s"'<>`]+/g)) {
      assert.ok(allowedUrls.has(match[0]), file + ' must not reference external URL ' + match[0]);
    }
  }
  assert.ok(!/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'CSS must not reference external URLs');
  assert.ok(!/<script[^>]+src="https?:/.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+href="https?:/.test(html), 'no external stylesheets');

  for (const vendored of ['js/vendor/qrcode.js', 'js/vendor/terser.js', 'js/vendor/csso.esm.js']) {
    assert.ok(existsSync(join(root, vendored)), vendored + ' should be bundled locally');
  }
});

test('every data-action button has a matching handler', () => {
  // Buttons are declared in tool templates; handlers are keyed in bindActions calls.
  for (const file of jsFiles.filter((f) => f.includes('tools' + '/'))) {
    const source = readFileSync(file, 'utf8');
    const actions = [...source.matchAll(/data-action="([a-zA-Z]+)"/g)].map((m) => m[1]);
    for (const action of new Set(actions)) {
      // Accept both `action: handler` and the shorthand `action,` form.
      const handlerPattern = new RegExp('\\b' + action + '\\s*[:,]');
      assert.ok(handlerPattern.test(source), file + ' is missing a handler for "' + action + '"');
    }
  }
});
