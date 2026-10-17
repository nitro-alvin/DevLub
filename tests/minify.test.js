/** Unit tests for Tool 20's minification pipeline. */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { minifyHtml, checkCssSyntax, reductionPercent, formatPercent } from '../js/lib/minify.js';
import { minifyCss } from '../js/lib/css-minify.js';
import { minifyJavaScript } from '../js/lib/js-minify.js';
import { formatBytes } from '../js/lib/files.js';

test('minifyHtml removes safe whitespace, comments and tag padding', () => {
  const html = [
    '<!doctype html>',
    '<html>',
    '  <head>',
    '    <title>  Hi  there </title>',
    '  </head>',
    '  <body>',
    '    <p>Hello   world</p>',
    '    <!-- remove me -->',
    '    <div  class="a   b"  data-x="1 2" >',
    '      <span>a</span> <span>b</span>',
    '    </div>',
    '  </body>',
    '</html>',
  ].join('\n');
  assert.equal(
    minifyHtml(html),
    '<!doctype html><html><head><title>Hi there</title></head><body>' +
      '<p>Hello world</p><div class="a   b" data-x="1 2">' +
      '<span>a</span> <span>b</span></div></body></html>',
  );
});

test('minifyHtml never changes pre, textarea, script or style content', () => {
  const pre = '<pre>  keep\n  this   exactly  </pre>';
  assert.equal(minifyHtml(pre), pre);

  const textarea = '<textarea>  a   b\n c </textarea>';
  assert.equal(minifyHtml(textarea), textarea);

  const script = '<script>\n  var s = "a  b"; // keep\n  /* keep */\n</script>';
  assert.equal(minifyHtml(script), script);

  const style = '<style>\n  a { color: red; }\n</style>';
  assert.equal(minifyHtml(style), style);

  assert.equal(
    minifyHtml('<div>\n  <pre> a  b </pre>\n</div>'),
    '<div><pre> a  b </pre></div>',
  );
});

test('minifyHtml preserves meaningful inline spaces and avoids corrupting text', () => {
  assert.equal(minifyHtml('<span>a</span> <span>b</span>'), '<span>a</span> <span>b</span>');
  assert.equal(minifyHtml('a <!--x--> b'), 'a b');
  assert.equal(minifyHtml('a<!--x-->b'), 'ab');
  assert.equal(minifyHtml('<p>a < b</p>'), '<p>a < b</p>');
  assert.equal(minifyHtml('<p title="a > b">x</p>'), '<p title="a > b">x</p>');
  assert.equal(minifyHtml('text with <not a tag'), 'text with <not a tag');
});

test('minifyHtml keeps conditional comments and unclosed comments', () => {
  const conditional = '<!--[if IE]><p>ie</p><![endif]--><p>after</p>';
  assert.equal(minifyHtml(conditional), conditional);
  assert.equal(minifyHtml('<!-- unclosed'), '<!-- unclosed');
});

test('checkCssSyntax validates the common broken cases', () => {
  assert.deepEqual(checkCssSyntax('a{color:red}'), { ok: true });
  assert.deepEqual(checkCssSyntax('a{content:"}"}'), { ok: true });
  assert.deepEqual(checkCssSyntax('a{content:"\\"}"}'), { ok: true });

  assert.match(checkCssSyntax('a{color:red').error, /curly braces/);
  assert.match(checkCssSyntax('a{color:red}}').error, /unexpected/);
  assert.match(checkCssSyntax('a{content:"open}').error, /quoted string/);
  assert.match(checkCssSyntax('a{/* open').error, /comment is not closed/);
});

test('minifyCss shrinks real CSS while preserving strings and syntax', async () => {
  const css = [
    '/* a normal comment */',
    ':root { --brand: #4c8dff; }',
    'body {',
    '  color: var(--brand);',
    '  font-family: "A  B", sans-serif;',
    '  margin: 0 auto;',
    '}',
    '@media (max-width: 600px) {',
    '  body { padding: 8px; }',
    '}',
  ].join('\n');

  const result = await minifyCss(css);
  assert.equal(result.ok, true);
  assert.equal(
    result.code,
    ':root{--brand:#4c8dff}body{color:var(--brand);font-family:"A  B",sans-serif;' +
      'margin:0 auto}@media (max-width:600px){body{padding:8px}}',
  );
  assert.ok(!result.code.includes('normal comment'));
  assert.ok(result.code.includes('"A  B"'));
  assert.ok(result.code.length < css.length);
});

test('minifyCss reports malformed or non-minifiable CSS instead of dropping it', async () => {
  const unbalanced = await minifyCss('a { color: red;');
  assert.equal(unbalanced.ok, false);
  assert.match(unbalanced.error, /curly braces/);

  const emptyDeclaration = await minifyCss('a { color: }');
  assert.equal(emptyDeclaration.ok, false);
  assert.match(emptyDeclaration.error, /invalid or incomplete/);

  const empty = await minifyCss('   ');
  assert.equal(empty.ok, false);
  assert.match(empty.error, /some CSS/);
});

test('minifyJavaScript uses a real parser and preserves strings and templates', async () => {
  const js = [
    '// greeting',
    'function greet(name) {',
    '  const msg = `Hello, ${name}!  keep  spaces`;',
    '  return msg;',
    '}',
    'console.log(greet("world"), "a  b", /x  y/);',
  ].join('\n');

  const result = await minifyJavaScript(js);
  assert.equal(result.ok, true);
  assert.ok(!result.code.includes('greeting'));
  assert.ok(result.code.includes('`Hello, ${name}!  keep  spaces`') ||
    result.code.includes('`Hello, ${e}!  keep  spaces`'));
  assert.ok(result.code.includes('"a  b"'));
  assert.ok(result.code.includes('/x  y/'));
  assert.ok(result.code.length < js.length);
});

test('minified JavaScript still behaves the same', async () => {
  const source = [
    'const parts = ["a  b", `tpl ${1 + 2}`, /x  y/];',
    'function join(values) { return values.join(" | "); }',
    'const result = join(parts) + " " + (6 * 7);',
    'result;',
  ].join('\n');
  const result = await minifyJavaScript(source);
  assert.equal(result.ok, true);
  // eslint-disable-next-line no-new-func
  const originalValue = new Function(source + '\nreturn result;')();
  // eslint-disable-next-line no-new-func
  const minifiedValue = new Function(result.code + '\nreturn result;')();
  assert.equal(minifiedValue, originalValue);
  assert.equal(minifiedValue, 'a  b | tpl 3 | /x  y/ 42');
});

test('minifyJavaScript reports syntax errors with position details', async () => {
  const broken = await minifyJavaScript('function ( {');
  assert.equal(broken.ok, false);
  assert.match(broken.error, /JavaScript syntax error/);
  assert.match(broken.error, /line 1/);

  const brokenString = await minifyJavaScript('const x = "unterminated;');
  assert.equal(brokenString.ok, false);
  assert.match(brokenString.error, /syntax error/i);
});

test('minifyJavaScript handles ES modules', async () => {
  const explicit = await minifyJavaScript('export const answer = 1 + 1;', { module: true });
  assert.equal(explicit.ok, true);
  assert.ok(explicit.code.includes('export'));

  const detected = await minifyJavaScript('export const answer = 1 + 1;', { module: false });
  assert.equal(detected.ok, true);
  assert.ok(detected.code.includes('export'));

  const imports = await minifyJavaScript('import x from "./x.js"; console.log(x);', { module: false });
  assert.equal(imports.ok, true);
  assert.ok(imports.code.includes('import'));
});

test('size statistics round the way the UI shows them', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(12), '12 B');
  assert.equal(formatBytes(1024), '1.0 KB');
  assert.equal(formatBytes(12345), '12.1 KB');
  assert.equal(formatBytes(1024 * 1024), '1.0 MB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');

  assert.equal(reductionPercent(100, 50), 50);
  assert.equal(reductionPercent(100, 0), 100);
  assert.equal(reductionPercent(0, 0), 0);
  assert.equal(reductionPercent(100, 101), -1);
  assert.equal(formatPercent(34.74), '34.7%');
  assert.equal(formatPercent(0), '0.0%');
});
