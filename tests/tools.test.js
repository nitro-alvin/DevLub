/** Unit tests for the libraries behind tools 9–18 (run with: node --test). */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---------- Tool 9: Diff ----------
import { diffLines, unifiedDiff } from '../js/lib/diff.js';

test('diffLines marks unchanged, added and removed lines', () => {
  const result = diffLines('a\nb\nc', 'a\nB\nc');
  assert.equal(result.ok, true);
  assert.equal(result.identical, false);
  assert.deepEqual(result.stats, { added: 1, removed: 1, unchanged: 2 });
  assert.deepEqual(result.rows.map((row) => row.type), ['same', 'del', 'add', 'same']);
  assert.equal(result.rows[1].left.text, 'b');
  assert.equal(result.rows[2].right.text, 'B');
});

test('diffLines reports identical, empty and one-sided inputs', () => {
  const same = diffLines('a\nb', 'a\nb');
  assert.equal(same.identical, true);
  assert.deepEqual(same.stats, { added: 0, removed: 0, unchanged: 2 });

  const empty = diffLines('', '');
  assert.equal(empty.empty, true);
  assert.equal(empty.rows.length, 0);

  const added = diffLines('a', 'a\nb\nc');
  assert.deepEqual(added.stats, { added: 2, removed: 0, unchanged: 1 });

  const removed = diffLines('a\nb\nc', 'a');
  assert.deepEqual(removed.stats, { added: 0, removed: 2, unchanged: 1 });
});

test('diffLines honours ignore whitespace and ignore case', () => {
  assert.equal(diffLines('a b', 'a   b').identical, false);
  assert.equal(diffLines('a b', 'a   b', { ignoreWhitespace: true }).identical, true);
  assert.equal(diffLines('Let X = 1', 'let x = 1').identical, false);
  assert.equal(diffLines('Let X = 1', 'let x = 1', { ignoreCase: true }).identical, true);
});

test('diffLines ignores a trailing newline and guards huge inputs', () => {
  assert.equal(diffLines('a\n', 'a').identical, true);
  const huge = Array.from({ length: 2500 }, (_, i) => 'line ' + i).join('\n');
  const result = diffLines(huge, huge.replace('line 3', 'line three'));
  assert.equal(result.ok, false);
  assert.match(result.error, /too large/i);
});

test('unifiedDiff writes standard hunks', () => {
  const rows = diffLines('a\nb\nc', 'a\nB\nc').rows;
  const patch = unifiedDiff(rows, { originalName: 'old', modifiedName: 'new' });
  assert.equal(patch, '--- old\n+++ new\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c');
  const identical = unifiedDiff(diffLines('a', 'a').rows);
  assert.equal(identical, '--- original\n+++ modified');
});

// ---------- Tool 10: JWT ----------
import { decodeJwt, formatClaimValue } from '../js/lib/jwt.js';

const segment = (value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

test('decodeJwt reads the header, payload and claims', () => {
  const token = [segment({ alg: 'HS256', typ: 'JWT' }), segment({ sub: '123', name: 'Alvin' }), 'sig'].join('.');
  const result = decodeJwt(token);
  assert.equal(result.ok, true);
  assert.equal(result.algorithm, 'HS256');
  assert.equal(result.type, 'JWT');
  assert.equal(result.header.typ, 'JWT');
  assert.equal(result.payload.sub, '123');
  assert.equal(result.headerJson, '{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const names = result.claims.map((claim) => claim.name);
  assert.deepEqual(names, ['sub', 'name']);
  assert.equal(result.claims[0].standard, true);
  assert.equal(result.claims[1].standard, false);
  assert.match(result.claims[0].description, /Subject/);
});

test('decodeJwt reports expiration and issued-at information', () => {
  const now = Date.parse('2024-06-01T12:00:00Z');
  const issued = Math.floor(now / 1000) - 3600;
  const future = Math.floor(now / 1000) + 3600;
  const live = decodeJwt([segment({ alg: 'none' }), segment({ iat: issued, exp: future }), ''].join('.'), now);
  assert.equal(live.exp.expired, false);
  assert.equal(live.exp.iso, new Date(future * 1000).toISOString());
  assert.equal(live.iat.iso, new Date(issued * 1000).toISOString());
  assert.equal(live.exp.relative, '1 hour from now');
  assert.equal(live.iat.relative, '1 hour ago');

  const stale = decodeJwt([segment({ alg: 'none' }), segment({ exp: Math.floor(now / 1000) - 60 }), ''].join('.'), now);
  assert.equal(stale.exp.expired, true);

  const none = decodeJwt([segment({ alg: 'none' }), segment({ sub: 'x' }), ''].join('.'));
  assert.equal(none.exp, null);
  assert.equal(none.iat, null);
});

test('decodeJwt rejects invalid input with clear errors', () => {
  const empty = decodeJwt('   ');
  assert.equal(empty.empty, true);

  const onePart = decodeJwt('abc');
  assert.equal(onePart.ok, false);
  assert.match(onePart.error, /three parts/);

  const twoParts = decodeJwt('a.b');
  assert.equal(twoParts.ok, false);
  assert.match(twoParts.error, /three parts/);

  const emptySegment = decodeJwt('.b.c');
  assert.equal(emptySegment.ok, false);
  assert.match(emptySegment.error, /empty/);

  const badBase64 = decodeJwt('!!!.@@@.sig');
  assert.equal(badBase64.ok, false);
  assert.match(badBase64.error, /Base64URL/);

  const notJson = decodeJwt([Buffer.from('hello').toString('base64url'), segment({ a: 1 }), ''].join('.'));
  assert.equal(notJson.ok, false);
  assert.match(notJson.error, /valid JSON object/);

  const notObject = decodeJwt([segment([1, 2]), segment({ a: 1 }), ''].join('.'));
  assert.equal(notObject.ok, false);
  assert.match(notObject.error, /valid JSON object/);
});

test('formatClaimValue renders every claim type', () => {
  assert.equal(formatClaimValue('text'), 'text');
  assert.equal(formatClaimValue(42), '42');
  assert.equal(formatClaimValue(null), 'null');
  assert.equal(formatClaimValue(['a']), '["a"]');
  assert.equal(formatClaimValue({ a: 1 }), '{"a":1}');
});

// ---------- Tool 11: Regex ----------
import { runRegex, buildHighlight, REGEX_EXAMPLES } from '../js/lib/regex.js';

test('runRegex finds all matches only with g or y', () => {
  const all = runRegex('a', 'g', 'banana');
  assert.equal(all.count, 3);
  assert.deepEqual(all.matches.map((match) => match.index), [1, 3, 5]);

  const first = runRegex('a', '', 'banana');
  assert.equal(first.count, 1);
  assert.equal(first.matches[0].index, 1);
});

test('runRegex reports positions, line/column and capture groups', () => {
  const result = runRegex('(\\w+)-(\\d+)', 'g', 'abc-12 def-34');
  assert.equal(result.count, 2);
  assert.deepEqual(result.matches[0].groups.numbered.map((group) => group.value), ['abc', '12']);
  assert.equal(result.matches[1].line, 1);
  assert.equal(result.matches[1].column, 8);

  const lines = runRegex('bar', 'g', 'foo\nbar');
  assert.equal(lines.matches[0].line, 2);
  assert.equal(lines.matches[0].column, 1);

  const named = runRegex('(?<year>\\d{4})', 'g', 'in 2024');
  assert.deepEqual(named.matches[0].groups.named, [{ name: 'year', value: '2024' }]);
});

test('runRegex applies flags and reports clean errors', () => {
  assert.equal(runRegex('ABC', 'i', 'abcdef').count, 1);
  assert.equal(runRegex('^b$', 'm', 'a\nb\nc').count, 1);
  assert.equal(runRegex('a.b', 's', 'a\nb').count, 1);
  assert.equal(runRegex('zzz', 'g', 'banana').count, 0);

  const badPattern = runRegex('(', 'g', 'x');
  assert.equal(badPattern.ok, false);
  assert.match(badPattern.error, /Invalid regex/);

  const badFlag = runRegex('a', 'z', 'x');
  assert.equal(badFlag.ok, false);
  assert.match(badFlag.error, /Invalid regex/);

  const emptyPattern = runRegex('', 'g', 'x');
  assert.equal(emptyPattern.ok, false);
  assert.match(emptyPattern.error, /Enter a regular expression/);
});

test('runRegex survives zero-length matches', () => {
  const result = runRegex('a*', 'g', 'bbb');
  assert.equal(result.count, 4);
  assert.ok(result.matches.every((match) => match.value === ''));
});

test('buildHighlight escapes text and marks every match', () => {
  const result = runRegex('a', 'g', 'a<b');
  const html = buildHighlight('a<b', result.matches);
  assert.equal(html, '<mark class="hit">a</mark>&lt;b');
  assert.equal(buildHighlight('<x>', []), '&lt;x&gt;');
  assert.equal(buildHighlight('', []), '');
});

test('regex examples all match the sample text', () => {
  const sample = 'Contact alvin@example.com or visit docs.example.dev on 2024-05-01. Colour #4c8dff, order 42 total.';
  assert.ok(REGEX_EXAMPLES.length >= 5);
  for (const example of REGEX_EXAMPLES) {
    const result = runRegex(example.pattern, example.flags, sample);
    assert.equal(result.ok, true, example.label + ' should compile');
    assert.ok(result.count > 0, example.label + ' should match the sample text');
  }
});

// ---------- Tool 12: SQL ----------
import { tokenizeSql, formatSql, minifySql } from '../js/lib/sql.js';

const QUERIES = [
  "select u.id, u.name from users u where u.active = 1 and u.name like '%a%'",
  "insert into t (a, b) values (1, 'x, y'), (2, 'z')",
  'update t set a = 1, b = 2 where id = 3',
  'delete from t where id in (select id from other where flag = 1)',
  'create table users (id int primary key, name text not null)',
  'alter table users add column email text',
  'drop table if exists temp',
  'select a from t1 left outer join t2 on t1.id = t2.id group by a having count(*) > 1 order by a desc limit 10 offset 5',
  'select * from a union all select * from b',
  '-- note\nselect 1; /* block */ select 2',
  'select "Quoted Name", `back tick` from [bracket table]',
  'select coalesce(a, 0), (a + b) * 2 from t where a::text = :name and b = $1',
];
const values = (sql) => tokenizeSql(sql).filter((token) => token.type !== 'ws').map((token) => token.value);

test('formatting and minifying never lose or reorder tokens', () => {
  for (const query of QUERIES) {
    assert.deepEqual(values(minifySql(query)), values(query), 'minify lost tokens in: ' + query);
    assert.deepEqual(values(formatSql(query)), values(query), 'format lost tokens in: ' + query);
  }
});

test('minifySql collapses whitespace but keeps strings intact', () => {
  assert.equal(minifySql('SELECT   *   FROM   t'), 'SELECT * FROM t');
  assert.equal(minifySql("select 'a, b' from t"), "select 'a, b' from t");
  assert.equal(minifySql('count ( * ) as total'), 'count(*) as total');
  assert.equal(minifySql('a . b'), 'a.b');
});

test('formatSql lays out clauses on their own lines', () => {
  assert.equal(
    formatSql('select * from users where active = 1'),
    'select\n  *\nfrom users\nwhere\n  active = 1',
  );

  const formatted = formatSql("select id, name from users where active = 1 and role = 'admin' order by name");
  assert.ok(formatted.startsWith('select\n'));
  assert.ok(formatted.includes('\nfrom users\n'));
  assert.ok(formatted.includes('\nwhere\n'));
  assert.ok(formatted.includes('\n  id,\n'));
  assert.ok(formatted.includes('\n  and role'));
  assert.ok(formatted.includes('\norder by\n'));
});

test('formatSql indents subqueries and separates join clauses', () => {
  const subquery = formatSql('select * from (select id from t) x');
  assert.ok(subquery.includes('from (\n  select\n'), subquery);
  assert.ok(subquery.includes('\n) x'), subquery);

  const joined = formatSql('select a from t1 join t2 on t1.id = t2.id');
  assert.ok(joined.includes('\njoin t2 on t1.id = t2.id'), joined);
});

test('tokenizeSql understands strings, identifiers and comments', () => {
  const tokens = tokenizeSql("select 'it''s', \"col\" -- tail");
  assert.deepEqual(tokens.filter((token) => token.type !== 'ws').map((token) => token.type), [
    'word', 'string', 'punct', 'quoted', 'comment',
  ]);
  assert.equal(tokens.find((token) => token.type === 'string').value, "'it''s'");
  assert.equal(tokenizeSql('')[0], undefined);
});

// ---------- Tool 13: JSON → CSV ----------
import { jsonToCsv, csvEscape } from '../js/lib/csv.js';

test('jsonToCsv converts the documented example', () => {
  const result = jsonToCsv('[{"name":"Alvin","age":18},{"name":"Alex","age":19}]');
  assert.equal(result.ok, true);
  assert.equal(result.output, 'name,age\nAlvin,18\nAlex,19');
  assert.deepEqual(result.columns, ['name', 'age']);
  assert.equal(result.rowCount, 2);
});

test('jsonToCsv unions keys and handles missing and null values', () => {
  const result = jsonToCsv('[{"a":1},{"b":2},{"a":3,"b":null,"c":"x"}]');
  assert.deepEqual(result.columns, ['a', 'b', 'c']);
  assert.equal(result.output, 'a,b,c\n1,,\n,2,\n3,,x');
});

test('jsonToCsv escapes commas, quotes, newlines and nested values', () => {
  assert.equal(csvEscape('plain'), 'plain');
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape('line1\nline2'), '"line1\nline2"');

  const result = jsonToCsv('[{"note":"a,b","quote":"say \\"hi\\"","multi":"x\\ny","tags":["a","b"]}]');
  assert.equal(
    result.output,
    'note,quote,multi,tags\n"a,b","say ""hi""","x\ny","[""a"",""b""]"',
  );
});

test('jsonToCsv accepts a single object and arrays of primitives', () => {
  assert.equal(jsonToCsv('{"a":1,"b":2}').output, 'a,b\n1,2');
  assert.equal(jsonToCsv('[1,2,3]').output, 'value\n1\n2\n3');
});

test('jsonToCsv reports empty and invalid input clearly', () => {
  assert.equal(jsonToCsv('').empty, true);
  assert.equal(jsonToCsv('   ').empty, true);
  const invalid = jsonToCsv('{"a": }');
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /Invalid JSON/);
  const emptyArray = jsonToCsv('[]');
  assert.equal(emptyArray.ok, false);
  assert.match(emptyArray.error, /empty/);
  const scalar = jsonToCsv('42');
  assert.equal(scalar.ok, false);
  assert.match(scalar.error, /array of objects/);
});

// ---------- Tool 14: Markdown ----------
import { renderMarkdown, sanitizeHtml, isSafeUrl } from '../js/lib/markdown.js';

test('renderMarkdown handles headings, emphasis, code and links', () => {
  assert.equal(renderMarkdown('# Hello'), '<h1>Hello</h1>');
  assert.equal(renderMarkdown('## Hi  ##'), '<h2>Hi</h2>');
  assert.equal(renderMarkdown('**bold** and *italic*'), '<p><strong>bold</strong> and <em>italic</em></p>');
  assert.equal(renderMarkdown('`a < b`'), '<p><code>a &lt; b</code></p>');
  assert.equal(renderMarkdown('[docs](/docs)'), '<p><a href="/docs">docs</a></p>');
  assert.equal(
    renderMarkdown('[site](https://portal.example.dev)'),
    '<p><a href="https://portal.example.dev" target="_blank" rel="noopener noreferrer">site</a></p>',
  );
  assert.equal(renderMarkdown('![logo](/logo.png)'), '<p><img src="/logo.png" alt="logo" loading="lazy"></p>');
});

test('renderMarkdown handles lists, tasks, quotes, tables and rules', () => {
  assert.equal(renderMarkdown('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(renderMarkdown('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
  assert.equal(
    renderMarkdown('- [x] done\n- [ ] todo'),
    '<ul><li><input type="checkbox" disabled checked> done</li><li><input type="checkbox" disabled> todo</li></ul>',
  );
  assert.equal(renderMarkdown('> quoted'), '<blockquote><p>quoted</p></blockquote>');
  assert.equal(renderMarkdown('---'), '<hr>');
  assert.equal(
    renderMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |'),
    '<div class="md-table-wrap"><table><thead><tr><th>a</th><th>b</th></tr></thead>' +
      '<tbody><tr><td>1</td><td>2</td></tr></tbody></table></div>',
  );
  const nested = renderMarkdown('- a\n  - b');
  assert.equal(nested, '<ul><li>a<ul><li>b</li></ul></li></ul>');
});

test('renderMarkdown renders fenced code blocks with a language', () => {
  assert.equal(
    renderMarkdown('```js\nlet x = 1;\n```'),
    '<pre class="md-code"><code class="language-js">let x = 1;</code></pre>',
  );
  assert.equal(renderMarkdown('```\nplain\n```'), '<pre class="md-code"><code>plain</code></pre>');
});

test('renderMarkdown joins paragraph lines and keeps hard breaks', () => {
  assert.equal(renderMarkdown('one\ntwo'), '<p>one two</p>');
  assert.equal(renderMarkdown('one  \ntwo'), '<p>one<br>two</p>');
});

test('renderMarkdown never executes markup from the source', () => {
  const script = renderMarkdown('<script>alert(1)</script>');
  assert.ok(!script.includes('<script'));
  assert.ok(script.includes('&lt;script&gt;'));

  const img = renderMarkdown('<img src=x onerror=alert(1)>');
  assert.ok(!img.includes('<img')); // escaped as text, never a live tag
  assert.ok(img.includes('&lt;img'));

  const link = renderMarkdown('[click](javascript:alert(1))');
  assert.ok(!link.includes('href="javascript:'));
  assert.ok(link.includes('[click](javascript:alert(1))'));

  const image = renderMarkdown('![x](javascript:alert(1))');
  assert.ok(!image.includes('<img'));

  assert.ok(!renderMarkdown('<iframe src="x"></iframe>').includes('<iframe'));
});

test('sanitizeHtml drops dangerous tags and attributes', () => {
  assert.equal(sanitizeHtml('<script>bad()</script>'), '');
  assert.equal(sanitizeHtml('<p onclick="bad()">ok</p>'), '<p>ok</p>');
  assert.equal(sanitizeHtml('<a href="javascript:bad()">x</a>'), '<a href="#">x</a>');
  assert.equal(sanitizeHtml('<!-- comment --><b>keep</b>'), '<b>keep</b>');
});

test('isSafeUrl allows normal links and blocks script schemes', () => {
  assert.equal(isSafeUrl('/docs'), true);
  assert.equal(isSafeUrl('#top'), true);
  assert.equal(isSafeUrl('https://portal.example.dev'), true);
  assert.equal(isSafeUrl('mailto:a@b.example'), true);
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('data:text/html,<b>x</b>'), false);
  assert.equal(isSafeUrl('data:image/png;base64,AAA', { image: true }), true);
});

// ---------- Tool 15: HTTP status ----------
import { STATUS_CODES, STATUS_GROUPS, filterStatusCodes, groupLabel } from '../js/lib/http-status.js';

test('the HTTP status reference covers every group with complete entries', () => {
  assert.equal(STATUS_GROUPS.length, 5);
  const groups = new Set(STATUS_CODES.map((entry) => entry.group));
  assert.deepEqual([...groups].sort(), [1, 2, 3, 4, 5]);
  assert.ok(STATUS_CODES.length >= 60);
  for (const entry of STATUS_CODES) {
    assert.equal(typeof entry.code, 'number');
    assert.ok(entry.name.length > 0);
    assert.ok(entry.description.length > 10);
    assert.equal(entry.group, Math.floor(entry.code / 100));
  }
  assert.equal(groupLabel(4), '4xx — Client error');
});

test('filterStatusCodes searches by code, name and description', () => {
  assert.deepEqual(filterStatusCodes('404').map((entry) => entry.code), [404]);
  assert.deepEqual(filterStatusCodes('gateway').map((entry) => entry.code), [502, 504]);
  assert.deepEqual(filterStatusCodes('rate limit').map((entry) => entry.code), [429]);
  assert.ok(filterStatusCodes('', '4').every((entry) => entry.group === 4));
  assert.ok(filterStatusCodes('', '4').length > 20);
  assert.ok(filterStatusCodes('', 'all').length === STATUS_CODES.length);
  assert.equal(filterStatusCodes('nonsense-query').length, 0);
  assert.equal(filterStatusCodes('ok').some((entry) => entry.code === 200), true);
});

// ---------- Tool 16: Cron ----------
import { describeCron, CRON_EXAMPLES } from '../js/lib/cron.js';

test('describeCron writes the expected plain-English summaries', () => {
  assert.equal(describeCron('* * * * *').summary, 'Runs every minute');
  assert.equal(describeCron('*/5 * * * *').summary, 'Runs every 5 minutes');
  assert.equal(describeCron('0 * * * *').summary, 'Runs every hour at minute 0');
  assert.equal(describeCron('0 0 * * *').summary, 'Runs at 00:00 every day');
  assert.equal(describeCron('0 0 * * 1').summary, 'Runs at 00:00 on Mondays');
  assert.equal(describeCron('0 0 1 * *').summary, 'Runs at 00:00 on day 1 of every month');
  assert.equal(describeCron('0 9 * * 1-5').summary, 'Runs at 09:00 on weekdays');
  assert.match(describeCron('*/15 9-17 * * *').summary, /every 15 minutes during hours 9–17/);
});

test('describeCron breaks the expression into its five fields', () => {
  const result = describeCron('*/5 3 * JAN MON-FRI');
  assert.equal(result.ok, true);
  assert.deepEqual(result.fields.map((field) => field.key), ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek']);
  assert.deepEqual(result.fields.map((field) => field.label), ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week']);
  assert.equal(result.fields[0].description, 'every 5 minutes');
  assert.equal(result.fields[1].description, '3');
  assert.equal(result.fields[2].description, 'every day');
  assert.equal(result.fields[3].description, 'Jan');
  assert.equal(result.fields[4].description, 'Mon–Fri');
});

test('describeCron expands @shortcuts and every example works', () => {
  const daily = describeCron('@daily');
  assert.equal(daily.ok, true);
  assert.equal(daily.shortcut, true);
  assert.equal(daily.normalized, '0 0 * * *');
  assert.equal(daily.summary, 'Runs at 00:00 every day');
  assert.equal(describeCron('@hourly').summary, 'Runs every hour at minute 0');

  for (const example of CRON_EXAMPLES) {
    const result = describeCron(example.expression);
    assert.equal(result.ok, true, example.label + ' should be valid');
    assert.ok(result.summary.startsWith('Runs '), example.label + ' should have a summary');
  }
});

test('describeCron rejects invalid expressions with clear messages', () => {
  assert.equal(describeCron('').empty, true);
  assert.match(describeCron('* * * *').error, /5 fields/);
  assert.match(describeCron('* * * * * *').error, /5 fields/);
  assert.match(describeCron('a * * * *').error, /Minute/);
  assert.match(describeCron('60 * * * *').error, /out of range/i);
  assert.match(describeCron('* 24 * * *').error, /Hour/);
  assert.match(describeCron('* * 0 * *').error, /Day of month/);
  assert.match(describeCron('* * * 13 *').error, /Month/);
  assert.match(describeCron('* * * * 9').error, /Day of week/);
  assert.match(describeCron('*/0 * * * *').error, /step of 0/);
  assert.match(describeCron('1-5-9 * * * *').error, /not a valid range/);
  assert.match(describeCron('* * * * *', '').error ?? '', /.*/);
});

// ---------- Tool 17: HTML entities ----------
import { encodeEntities, decodeEntities } from '../js/lib/entities.js';

test('encodeEntities escapes the five structural characters', () => {
  assert.equal(encodeEntities('& < > " \''), '&amp; &lt; &gt; &quot; &#39;');
  assert.equal(encodeEntities('plain text'), 'plain text');
  assert.equal(encodeEntities(''), '');
  assert.equal(encodeEntities('<a href="x">Tom & Jerry\'s</a>'),
    '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
});

test('encodeEntities can also encode non-ASCII characters', () => {
  assert.equal(encodeEntities('café'), 'café');
  assert.equal(encodeEntities('café', { encodeNonAscii: true }), 'caf&#xE9;');
  assert.equal(encodeEntities('🙏', { encodeNonAscii: true }), '&#x1F64F;');
});

test('decodeEntities handles named, decimal and hexadecimal entities', () => {
  assert.equal(decodeEntities('&amp;&lt;&gt;&quot;&#39;'), '&<>"\'');
  assert.equal(decodeEntities('&#65;&#x42;&#x1F64F;'), 'AB🙏');
  assert.equal(decodeEntities('&copy; &mdash; &nbsp;'), '\u00a9 \u2014 \u00a0');
  assert.equal(decodeEntities('&unknownname;'), '&unknownname;');
  assert.equal(decodeEntities('&#xZZ;'), '&#xZZ;');
  assert.equal(decodeEntities('plain'), 'plain');
});

test('entity encoding and decoding round-trip in a single pass', () => {
  assert.equal(decodeEntities('&amp;lt;'), '&lt;'); // no double decoding
  const original = 'Malayalam: \u0D28\u0D2E\u0D38\u0D4D\u0D15\u0D3E\u0D30\u0D02 & emoji 🎉 <b>"x"</b>';
  assert.equal(decodeEntities(encodeEntities(original, { encodeNonAscii: true })), original);
  assert.equal(decodeEntities(encodeEntities(original)), original);
});

// ---------- Tool 18: Number bases ----------
import { convertNumberBase, BASE_OPTIONS } from '../js/lib/base-convert.js';

test('convertNumberBase converts between every base', () => {
  const decimal = convertNumberBase('255', '10');
  assert.deepEqual(
    { binary: decimal.binary, octal: decimal.octal, decimal: decimal.decimal, hex: decimal.hex },
    { binary: '11111111', octal: '377', decimal: '255', hex: 'FF' },
  );

  assert.equal(convertNumberBase('FF', '16').decimal, '255');
  assert.equal(convertNumberBase('0xff', '16').decimal, '255');
  assert.equal(convertNumberBase('377', '8').decimal, '255');
  assert.equal(convertNumberBase('11111111', '2').decimal, '255');
  assert.equal(convertNumberBase('0b1010', '2').decimal, '10');
  assert.deepEqual(BASE_OPTIONS.map((option) => option.value), ['2', '8', '10', '16']);
});

test('convertNumberBase handles signs and digit separators', () => {
  assert.equal(convertNumberBase('-42', '10').binary, '-101010');
  assert.equal(convertNumberBase('-42', '10').hex, '-2A');
  assert.equal(convertNumberBase('+42', '10').decimal, '42');
  assert.equal(convertNumberBase('1_000', '10').decimal, '1000');
  assert.equal(convertNumberBase('1 000 000', '10').decimal, '1000000');
});

test('convertNumberBase keeps large integers exact with BigInt', () => {
  const big = '123456789012345678901234567890';
  const result = convertNumberBase(big, '10');
  assert.equal(result.ok, true);
  assert.equal(result.value, BigInt(big));
  assert.equal(convertNumberBase(result.hex, '16').decimal, big);
  assert.equal(convertNumberBase(result.binary, '2').decimal, big);

  const twoToSixtyFour = convertNumberBase('18446744073709551616', '10');
  assert.equal(twoToSixtyFour.hex, '10000000000000000');
  assert.equal(twoToSixtyFour.binary.length, 65);
  assert.equal(convertNumberBase(twoToSixtyFour.hex, '16').decimal, '18446744073709551616');
});

test('convertNumberBase validates digits, ranges and empty input', () => {
  assert.equal(convertNumberBase('', '10').empty, true);
  assert.equal(convertNumberBase('-', '10').empty, true);
  assert.equal(convertNumberBase('   ', '16').empty, true);

  assert.match(convertNumberBase('12', '2').error, /Invalid binary digit/);
  assert.match(convertNumberBase('8', '8').error, /Invalid octal digit/);
  assert.match(convertNumberBase('A', '10').error, /Invalid decimal digit/);
  assert.match(convertNumberBase('G', '16').error, /Invalid hexadecimal digit/);
  assert.match(convertNumberBase('5', '7').error, /Choose a base/);
});
