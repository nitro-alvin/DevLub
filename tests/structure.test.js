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

test('the registry exposes exactly the five core tools', () => {
  assert.deepEqual(tools.map((t) => t.id), ['json', 'base64', 'url', 'uuid', 'counter']);
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

test('the app never contacts the network or leaves data on the device', () => {
  for (const file of jsFiles) {
    const source = readFileSync(file, 'utf8');
    assert.ok(!/\bfetch\s*\(/.test(source), file + ' must not call fetch()');
    assert.ok(!/XMLHttpRequest/.test(source), file + ' must not use XMLHttpRequest');
    assert.ok(!/sendBeacon/.test(source), file + ' must not use sendBeacon');
    assert.ok(!/https?:\/\//.test(source), file + ' must not reference external URLs');
  }
  assert.ok(!/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'CSS must not reference external URLs');
  assert.ok(!/<script[^>]+src="https?:/.test(html), 'no external scripts');
  assert.ok(!/<link[^>]+href="https?:/.test(html), 'no external stylesheets');
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
