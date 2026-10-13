/** URL Encoder / Decoder using the browser's built-in percent-encoding. */

import { encodeUrl, decodeUrl } from '../lib/url.js';
import { DATA_EXTENSIONS, suggestFileName } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

export function mountUrlTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'URL Encoder / Decoder',
      description: 'Percent-encode text for use in URLs and query strings, or decode it back to readable text.',
    }) +
    fileImportMarkup({
      id: 'url-file',
      extensions: DATA_EXTENSIONS,
      hint: 'Import a text file to encode or decode it.',
    }) +
    '<div>' +
    '<label class="field-label" for="url-input">Input</label>' +
    '<textarea class="code-input" id="url-input" rows="8" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="e.g. hello world &amp; more?query=1"></textarea>' +
    '</div>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="encode">URL encode</button>' +
    '<button type="button" class="btn" data-action="decode">URL decode</button>' +
    '</div>' +
    errorBox() +
    outputSection({
      id: 'url-output',
      label: 'Output',
      placeholder: 'Result appears here.',
    }) +
    downloadMarkup({ id: 'url-name', hint: 'Rename the .txt file before saving a copy.' });

  const input = qs(section, '#url-input');
  const output = qs(section, '#url-output');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'url-name', defaultName: 'text-encoded.txt' });

  const importer = createFileImport(section, {
    id: 'url-file',
    extensions: DATA_EXTENSIONS,
    onText: (text) => {
      input.value = text;
      output.value = '';
      clearError(errorBoxEl);
      bar.hide();
      input.focus();
      showToast('Text file loaded — encode or decode it.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function run(mode) {
    const text = input.value;
    if (!text.trim()) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, mode === 'encode' ? 'Type some text to encode first.' : 'Paste some encoded text to decode first.');
      return;
    }
    try {
      const result = mode === 'encode' ? encodeUrl(text) : decodeUrl(text);
      clearError(errorBoxEl);
      output.value = result;
      bar.show(suggestFileName(importer.fileName, {
        suffix: mode === 'encode' ? 'encoded' : 'decoded',
        ext: 'txt',
        fallbackBase: 'text',
      }));
    } catch (error) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  input.addEventListener('input', () => {
    clearError(errorBoxEl);
    bar.hide();
  });

  bindActions(section, {
    back: goBack,
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      clearFields([input, output]);
      clearError(errorBoxEl);
      bar.reset();
    },
    encode: () => run('encode'),
    decode: () => run('decode'),
    copy: () => copyToClipboard(output.value, 'Output copied'),
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Encode or decode some text first, then download it.');
        return;
      }
      downloadText(output.value, bar.name);
    },
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
      bar.reset();
      importer.reset();
    },
  });
}
