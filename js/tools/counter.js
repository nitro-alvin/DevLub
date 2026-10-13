/** Text Counter: live statistics as you type. */

import { countText } from '../lib/text-stats.js';
import { DOCUMENT_EXTENSIONS, suggestFileName } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const STAT_FIELDS = [
  ['characters', 'Characters'],
  ['charactersNoSpaces', 'Excluding spaces'],
  ['words', 'Words'],
  ['lines', 'Lines'],
  ['sentences', 'Sentences'],
  ['utf8Bytes', 'UTF-8 bytes'],
];

export function mountCounterTool(section, { goBack }) {
  const statCells = STAT_FIELDS.map(
    ([key, label]) =>
      '<div class="stat">' +
      '<div class="stat-value" data-stat="' + key + '">0</div>' +
      '<div class="stat-label">' + label + '</div>' +
      '</div>',
  ).join('');

  section.innerHTML =
    toolHead({
      title: 'Text Counter',
      description: 'Characters, words, lines, sentences and UTF-8 size — updated instantly while you type.',
    }) +
    fileImportMarkup({
      id: 'counter-file',
      extensions: DOCUMENT_EXTENSIONS,
      hint: 'Import a .txt, .md or .csv file to count it, then keep editing.',
    }) +
    '<div>' +
    '<label class="field-label" for="counter-input">Your text</label>' +
    '<textarea class="code-input" id="counter-input" rows="8" ' +
    'autocapitalize="sentences" placeholder="Start typing or paste text here…"></textarea>' +
    '</div>' +
    '<div class="stats" id="counter-stats">' + statCells + '</div>' +
    errorBox() +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="copyStats">' + icons.copy + '<span>Copy stats</span></button>' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    downloadMarkup({ id: 'counter-name', hint: 'Download the text (including your edits) as a .txt file.' });

  const input = qs(section, '#counter-input');
  const statsBox = qs(section, '.stats');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'counter-name', defaultName: 'text.txt' });

  const importer = createFileImport(section, {
    id: 'counter-file',
    extensions: DOCUMENT_EXTENSIONS,
    onText: (text) => {
      input.value = text;
      clearError(errorBoxEl);
      update();
      input.focus();
      showToast('Text file loaded — counts updated.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  let latest = countText('');

  function downloadName() {
    return importer.fileName
      ? suggestFileName(importer.fileName, { suffix: 'edited', ext: 'txt' })
      : 'text.txt';
  }

  function update() {
    latest = countText(input.value);
    for (const [key] of STAT_FIELDS) {
      const cell = statsBox.querySelector('[data-stat="' + key + '"]');
      if (cell) cell.textContent = latest[key].toLocaleString();
    }
    clearError(errorBoxEl);
    if (input.value) bar.show(downloadName());
    else bar.hide();
  }

  input.addEventListener('input', update);
  update();

  bindActions(section, {
    back: goBack,
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      clearFields([input]);
      bar.reset();
      update();
    },
    copyStats: () => {
      if (latest.characters === 0) {
        showError(errorBoxEl, 'Type some text first to collect statistics.');
        return;
      }
      const summary = STAT_FIELDS.map(([key, label]) => label + ': ' + latest[key]).join('\n');
      copyToClipboard(summary, 'Stats copied');
    },
    download: () => {
      if (!input.value) {
        showError(errorBoxEl, 'Add some text first, then download it.');
        return;
      }
      downloadText(input.value, bar.name);
    },
    clear: () => {
      clearFields([input]);
      bar.reset();
      importer.reset();
      update();
    },
  });
}
