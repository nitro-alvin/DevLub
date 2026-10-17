/** CSS minification backed by the vendored CSso library (MIT). */

import { checkCssSyntax } from './minify.js';

let cssoPromise = null;

function loadCsso() {
  // Loaded on first use so the home screen and other tools stay light.
  if (!cssoPromise) cssoPromise = import('../vendor/csso.esm.js');
  return cssoPromise;
}

/**
 * Minify a stylesheet. Returns { ok: true, code } or { ok: false, error }.
 * Never throws, so a malformed stylesheet cannot break the tool view.
 */
export async function minifyCss(css) {
  const source = String(css == null ? '' : css);
  if (!source.trim()) return { ok: false, error: 'Paste or import some CSS first.' };

  const structural = checkCssSyntax(source);
  if (!structural.ok) return structural;

  try {
    const { minify } = await loadCsso();
    const result = minify(source);
    const code = result && typeof result.css === 'string' ? result.css.trim() : '';

    if (!code) {
      return {
        ok: false,
        error:
          'CSS could not be minified — the input looks invalid or incomplete. ' +
          'Check for empty declarations such as “color:” or a rule without a property.',
      };
    }
    return { ok: true, code };
  } catch (error) {
    const message = (error && (error.formattedMessage || error.message)) || String(error);
    return { ok: false, error: 'CSS error: ' + message };
  }
}
