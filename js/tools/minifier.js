/** Tool 20 — HTML / CSS / JavaScript Minifier (fully client-side). */

import { minifyHtml, reductionPercent, formatPercent } from '../lib/minify.js';
import { minifyCss } from '../lib/css-minify.js';
import { minifyJavaScript } from '../lib/js-minify.js';
import { formatBytes, extensionOf, baseName, safeFileName } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const MODES = {
  html: {
    label: 'HTML',
    extensions: ['html', 'htm'],
    ext: 'html',
    mime: 'text/html;charset=utf-8',
    placeholder: '<!doctype html>\n<html>\n  <body>\n    <h1>Hello</h1>\n  </body>\n</html>',
  },
  css: {
    label: 'CSS',
    extensions: ['css'],
    ext: 'css',
    mime: 'text/css;charset=utf-8',
    placeholder: 'body {\n  color: #e6edf3;\n  font-family: system-ui, sans-serif;\n}',
  },
  js: {
    label: 'JavaScript',
    extensions: ['js', 'mjs'],
    ext: 'js',
    mime: 'text/javascript;charset=utf-8',
    placeholder: 'function greet(name) {\n  // say hello\n  return `Hello, ${name}!`;\n}\nconsole.log(greet("world"));',
  },
};

const ALL_EXTENSIONS = ['html', 'htm', 'css', 'js', 'mjs'];
const MAX_MINIFY_BYTES = 2 * 1024 * 1024;

function modeTabs() {
  return Object.entries(MODES).map(
    ([id, mode]) =>
      '<button type="button" class="btn btn-chip' + (id === 'html' ? ' is-active' : '') + '" ' +
      'data-action="mode" data-mode="' + id + '" aria-pressed="' + (id === 'html') + '">' +
      mode.label + '</button>',
  ).join('');
}

export function mountMinifierTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'HTML / CSS / JS Minifier',
      description:
        'Remove safe whitespace, comments and formatting to shrink files. Syntax is parsed properly, and your original file is never changed.',
    }) +
    '<div class="mode-tabs" role="group" aria-label="Language to minify">' + modeTabs() + '</div>' +
    fileImportMarkup({
      id: 'min-file',
      extensions: ALL_EXTENSIONS,
      hint: 'Choose an .html, .htm, .css, .js or .mjs file. The mode switches to match the file.',
      maxBytes: MAX_MINIFY_BYTES,
    }) +
    '<div>' +
    '<label class="field-label" for="min-input">Source code</label>' +
    '<textarea class="code-input" id="min-input" rows="12" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="' + MODES.html.placeholder + '"></textarea>' +
    '</div>' +
    '<fieldset class="option-group" id="min-module-group" hidden>' +
    '<legend class="field-label">JavaScript options</legend>' +
    '<label class="option"><input type="checkbox" id="min-module"> ' +
    'Treat as an ES module (import / export / top-level await)</label>' +
    '<p class="field-hint">Automatically enabled for .mjs files and when module syntax is detected.</p>' +
    '</fieldset>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="minify">' +
    icons.check + '<span>Minify</span></button>' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    errorBox() +
    '<section class="minify-output" id="min-result" aria-live="polite" hidden>' +
    '<div class="stats minify-stats">' +
    '<div class="stat"><div class="stat-value" id="min-orig">0 B</div><div class="stat-label">Original</div></div>' +
    '<div class="stat"><div class="stat-value" id="min-size">0 B</div><div class="stat-label">Minified</div></div>' +
    '<div class="stat"><div class="stat-value" id="min-saved">0 B</div><div class="stat-label">Saved</div></div>' +
    '<div class="stat"><div class="stat-value" id="min-percent">0.0%</div><div class="stat-label">Reduction</div></div>' +
    '</div>' +
    '<label class="field-label" for="min-output">Minified output</label>' +
    '<textarea class="code-input" id="min-output" rows="10" readonly spellcheck="false"></textarea>' +
    '<div class="actions minify-actions">' +
    '<button type="button" class="btn" data-action="copy">' + icons.copy +
    '<span>Copy minified code</span></button>' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    '</section>' +
    downloadMarkup({
      id: 'min-name',
      hint: 'Downloads a new .min file. The original file on disk is never modified.',
      buttonLabel: 'Download minified file',
      stacked: true,
    });

  const input = qs(section, '#min-input');
  const output = qs(section, '#min-output');
  const errorBoxEl = qs(section, '.error-box');
  const resultBox = qs(section, '#min-result');
  const moduleGroup = qs(section, '#min-module-group');
  const moduleCheck = qs(section, '#min-module');
  const minifyButton = qs(section, '[data-action="minify"]');
  const minifyLabel = minifyButton.querySelector('span');
  const originalStat = qs(section, '#min-orig');
  const minifiedStat = qs(section, '#min-size');
  const savedStat = qs(section, '#min-saved');
  const percentStat = qs(section, '#min-percent');

  let mode = 'html';
  let sourceName = '';
  let busy = false;
  let activeRun = 0;

  const bar = createDownloadBar(section, { id: 'min-name', defaultName: 'code.min.html' });

  const importer = createFileImport(section, {
    id: 'min-file',
    extensions: ALL_EXTENSIONS,
    maxBytes: MAX_MINIFY_BYTES,
    onText: (text, file) => {
      const ext = extensionOf(file.name);
      const nextMode = ext === 'css' ? 'css' : (ext === 'js' || ext === 'mjs') ? 'js' : 'html';
      sourceName = file.name;
      moduleCheck.checked = ext === 'mjs';
      if (nextMode !== mode) applyMode(nextMode, { fromFile: true });
      input.value = text;
      resetOutput();
      clearError(errorBoxEl);
      input.focus();
      showToast(
        'Loaded ' + file.name + ' — ' + MODES[nextMode].label + ' mode. Minify when ready.',
      );
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function downloadName() {
    const base = (sourceName ? baseName(sourceName) : '') || 'code';
    return safeFileName(base + '.min.' + MODES[mode].ext) || 'code.min.' + MODES[mode].ext;
  }

  function setBusy(value) {
    busy = value;
    minifyButton.disabled = value;
    minifyLabel.textContent = value ? 'Minifying…' : 'Minify';
    minifyButton.setAttribute('aria-busy', String(value));
  }

  function resetOutput() {
    resultBox.hidden = true;
    output.value = '';
    bar.reset(downloadName());
  }

  function applyMode(nextMode, { fromFile = false } = {}) {
    if (!MODES[nextMode]) return;
    activeRun += 1;
    mode = nextMode;
    for (const button of section.querySelectorAll('[data-action="mode"]')) {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    input.placeholder = MODES[mode].placeholder;
    moduleGroup.hidden = mode !== 'js';
    resetOutput();
    clearError(errorBoxEl);
    if (!fromFile) input.focus();
  }

  function updateStats(source, minified) {
    const originalBytes = new TextEncoder().encode(source).length;
    const minifiedBytes = new TextEncoder().encode(minified).length;
    const saved = originalBytes - minifiedBytes;
    originalStat.textContent = formatBytes(originalBytes);
    minifiedStat.textContent = formatBytes(minifiedBytes);
    savedStat.textContent = saved > 0 ? formatBytes(saved) : '0 B';
    percentStat.textContent = formatPercent(reductionPercent(originalBytes, minifiedBytes));
  }

  async function runMinify() {
    const source = input.value;
    if (!source.trim()) {
      resetOutput();
      showError(errorBoxEl, 'Paste some code or choose a file first.');
      input.focus();
      return;
    }
    if (new TextEncoder().encode(source).length > MAX_MINIFY_BYTES) {
      resetOutput();
      showError(errorBoxEl, 'That input is too large to minify safely here. The limit is 2 MB.');
      return;
    }

    clearError(errorBoxEl);
    setBusy(true);
    const token = ++activeRun;

    try {
      let result;
      if (mode === 'html') {
        result = { ok: true, code: minifyHtml(source) };
      } else if (mode === 'css') {
        result = await minifyCss(source);
      } else {
        result = await minifyJavaScript(source, { module: moduleCheck.checked });
      }

      // A newer action (mode switch, file import, clear) invalidates this run.
      if (token !== activeRun) return;
      if (!result.ok) throw new Error(result.error);

      const minified = result.code;
      if (!minified.trim()) {
        throw new Error('The minifier returned empty output — the input looks invalid or incomplete.');
      }

      if (result.moduleUsed) {
        moduleCheck.checked = true;
        showToast('Detected ES module syntax — parsed as a module.');
      }

      output.value = minified;
      updateStats(source, minified);
      resultBox.hidden = false;
      bar.reset(downloadName());
      bar.show(downloadName());
    } catch (error) {
      if (token !== activeRun) return;
      resetOutput();
      showError(errorBoxEl, error instanceof Error ? error.message : 'The code could not be minified.');
    } finally {
      setBusy(false);
    }
  }

  input.addEventListener('input', () => {
    activeRun += 1;
    resetOutput();
    clearError(errorBoxEl);
  });

  moduleCheck.addEventListener('change', () => {
    activeRun += 1;
    resetOutput();
    clearError(errorBoxEl);
  });

  bindActions(section, {
    back: goBack,
    mode: (target) => {
      if (busy) return;
      const next = target.dataset.mode;
      if (next && next !== mode) applyMode(next);
    },
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      sourceName = '';
      moduleCheck.checked = false;
      activeRun += 1;
      input.value = '';
      resetOutput();
      clearError(errorBoxEl);
      input.focus();
    },
    minify: () => { runMinify(); },
    copy: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Minify some code first, then copy the result.');
        return;
      }
      copyToClipboard(output.value, 'Minified code copied');
    },
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Minify some code first, then download the result.');
        return;
      }
      downloadText(output.value, bar.name, MODES[mode].mime);
    },
    clear: () => {
      activeRun += 1;
      input.value = '';
      output.value = '';
      sourceName = '';
      moduleCheck.checked = false;
      importer.reset();
      resetOutput();
      clearError(errorBoxEl);
      input.focus();
    },
  });
}
