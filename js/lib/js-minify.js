/** JavaScript minification backed by the vendored Terser bundle (MIT). */

let terserPromise = null;

function loadTerser() {
  // Loaded on first use — the bundle is large and most visitors never need it.
  if (!terserPromise) {
    terserPromise = import('../vendor/terser.js').then((module) => module.default);
  }
  return terserPromise;
}

function describeError(error) {
  if (!error) return 'The JavaScript could not be minified.';
  const message = error.message || String(error);
  let location = '';
  if (Number.isFinite(error.line)) {
    location = ' (line ' + error.line;
    if (Number.isFinite(error.col)) location += ', column ' + error.col;
    location += ')';
  }
  return 'JavaScript syntax error: ' + message + location;
}

async function runMinify(Terser, code, module) {
  try {
    const result = await Terser.minify(code, {
      compress: { passes: 2 },
      mangle: true,
      module,
      format: { comments: false },
    });
    if (result.error) throw result.error;
    if (typeof result.code !== 'string') throw new Error('Terser did not return any output.');
    return { ok: true, code: result.code };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

/**
 * Minify JavaScript with Terser's real parser/AST pipeline — never regexes.
 * Strings, template literals and regular expressions keep their contents.
 * Returns { ok: true, code, moduleUsed? } or { ok: false, error }.
 */
export async function minifyJavaScript(code, { module = false } = {}) {
  const source = String(code == null ? '' : code);
  if (!source.trim()) return { ok: false, error: 'Paste or import some JavaScript first.' };

  let Terser;
  try {
    Terser = await loadTerser();
  } catch {
    return { ok: false, error: 'The JavaScript minifier could not be loaded. Reload the page and try again.' };
  }

  const first = await runMinify(Terser, source, Boolean(module));
  if (first.ok || module) return first;

  // A .mjs file (or pasted module code) needs module parsing. If Terser
  // rejected module syntax, retry once as a module and tell the caller.
  if (/keyword \((?:import|export)\)|import\.meta|top[- ]level await|await is only valid/i.test(first.error)) {
    const retry = await runMinify(Terser, source, true);
    if (retry.ok) return { ...retry, moduleUsed: true };
  }
  return first;
}
