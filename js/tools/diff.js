/** Diff Checker: compare two texts line by line. */

import { diffLines, unifiedDiff, MAX_DIFF_LINES } from '../lib/diff.js';
import { CODE_EXTENSIONS } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

function editor({ id, label, placeholder, chooseAction, removeAction, fileId }) {
  return (
    fileImportMarkup({
      id: fileId,
      extensions: CODE_EXTENSIONS,
      label: 'Choose ' + label.toLowerCase() + ' file',
      chooseAction,
      removeAction,
      hint: 'Import a text or code file for the ' + label.toLowerCase() + ' side.',
    }) +
    '<div>' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<textarea class="code-input" id="' + id + '" rows="7" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="' + placeholder + '"></textarea>' +
    '</div>'
  );
}

function renderRows(container, rows) {
  container.textContent = '';
  for (const row of rows) {
    const line = document.createElement('div');
    line.className = 'diff-line diff-' + row.type;
    const left = document.createElement('span');
    left.className = 'diff-gutter';
    left.textContent = row.left ? String(row.left.n) : '';
    const right = document.createElement('span');
    right.className = 'diff-gutter';
    right.textContent = row.right ? String(row.right.n) : '';
    const marker = document.createElement('span');
    marker.className = 'diff-marker';
    marker.textContent = row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' ';
    const text = document.createElement('span');
    text.className = 'diff-text';
    text.textContent = (row.left || row.right).text;
    line.append(left, right, marker, text);
    container.appendChild(line);
  }
}

export function mountDiffTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'Diff Checker',
      description: 'Compare two blocks of text or code and see exactly what was added, removed or left unchanged.',
    }) +
    '<div class="diff-columns">' +
    '<section class="diff-side">' +
    editor({ id: 'diff-input-a', label: 'Original', placeholder: 'Paste the original text here', chooseAction: 'chooseOriginal', removeAction: 'removeOriginal', fileId: 'diff-file-a' }) +
    '</section>' +
    '<section class="diff-side">' +
    editor({ id: 'diff-input-b', label: 'Modified', placeholder: 'Paste the changed text here', chooseAction: 'chooseModified', removeAction: 'removeModified', fileId: 'diff-file-b' }) +
    '</section>' +
    '</div>' +
    '<fieldset class="option-group"><legend class="field-label">Options</legend>' +
    '<label class="option"><input type="checkbox" id="diff-ignore-ws"> Ignore whitespace</label>' +
    '<label class="option"><input type="checkbox" id="diff-ignore-case"> Ignore case</label>' +
    '</fieldset>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="compare">Compare</button>' +
    '<button type="button" class="btn" data-action="swap">' + icons.swap + '<span>Swap</span></button>' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    errorBox() +
    '<p class="diff-summary" id="diff-summary" hidden></p>' +
    '<div class="diff-view" id="diff-view" hidden></div>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="copyResult">' + icons.copy + '<span>Copy result</span></button>' +
    '</div>' +
    downloadMarkup({ id: 'diff-name', hint: 'Download the unified diff (' + MAX_DIFF_LINES + ' lines max per side).' });

  const inputA = qs(section, '#diff-input-a');
  const inputB = qs(section, '#diff-input-b');
  const ignoreWs = qs(section, '#diff-ignore-ws');
  const ignoreCase = qs(section, '#diff-ignore-case');
  const errorBoxEl = qs(section, '.error-box');
  const summary = qs(section, '#diff-summary');
  const view = qs(section, '#diff-view');
  const bar = createDownloadBar(section, { id: 'diff-name', defaultName: 'changes.diff' });
  let lastDiff = '';

  const importerA = createFileImport(section, {
    id: 'diff-file-a',
    extensions: CODE_EXTENSIONS,
    removeAction: 'removeOriginal',
    onText: (text) => {
      inputA.value = text;
      clearError(errorBoxEl);
      showToast('Original file loaded.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });
  const importerB = createFileImport(section, {
    id: 'diff-file-b',
    extensions: CODE_EXTENSIONS,
    removeAction: 'removeModified',
    onText: (text) => {
      inputB.value = text;
      clearError(errorBoxEl);
      showToast('Modified file loaded.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function reset() {
    summary.hidden = true;
    view.hidden = true;
    view.textContent = '';
    bar.hide();
    lastDiff = '';
  }

  function compare() {
    const result = diffLines(inputA.value, inputB.value, {
      ignoreWhitespace: ignoreWs.checked,
      ignoreCase: ignoreCase.checked,
    });
    if (!result.ok) {
      reset();
      showError(errorBoxEl, result.error);
      return;
    }
    if (result.empty) {
      reset();
      showError(errorBoxEl, 'Add some text to both sides, then compare.');
      return;
    }
    clearError(errorBoxEl);
    lastDiff = unifiedDiff(result.rows, { originalName: 'original', modifiedName: 'modified' });
    summary.textContent = result.identical
      ? 'No differences — the two sides are identical.'
      : result.stats.added + ' added · ' + result.stats.removed + ' removed · ' + result.stats.unchanged + ' unchanged';
    summary.hidden = false;
    renderRows(view, result.rows);
    view.hidden = false;
    bar.show('changes.diff');
  }

  inputA.addEventListener('input', () => {
    clearError(errorBoxEl);
    reset();
  });
  inputB.addEventListener('input', () => {
    clearError(errorBoxEl);
    reset();
  });
  ignoreWs.addEventListener('change', reset);
  ignoreCase.addEventListener('change', reset);

  bindActions(section, {
    back: goBack,
    chooseOriginal: () => importerA.choose(),
    removeOriginal: () => {
      importerA.remove();
      inputA.value = '';
      clearError(errorBoxEl);
      reset();
    },
    chooseModified: () => importerB.choose(),
    removeModified: () => {
      importerB.remove();
      inputB.value = '';
      clearError(errorBoxEl);
      reset();
    },
    compare,
    swap: () => {
      const previousA = inputA.value;
      inputA.value = inputB.value;
      inputB.value = previousA;
      clearError(errorBoxEl);
      reset();
    },
    copyResult: () => copyToClipboard(lastDiff, 'Diff copied'),
    download: () => {
      if (!lastDiff) {
        showError(errorBoxEl, 'Compare two sides first, then download the diff.');
        return;
      }
      downloadText(lastDiff, bar.name);
    },
    clear: () => {
      clearFields([inputA, inputB], { focusFirst: false });
      importerA.reset();
      importerB.reset();
      clearError(errorBoxEl);
      reset();
      inputA.focus();
    },
  });
}
