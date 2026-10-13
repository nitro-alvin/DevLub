/** SHA-256 Hash Generator using the browser's Web Crypto API. */

import { sha256Hex, isSha256Supported, UNSUPPORTED_MESSAGE } from '../lib/hash.js';
import { DATA_EXTENSIONS, suggestFileName } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

export function mountHashTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'SHA-256 Hash Generator',
      description: 'Turn any text into its SHA-256 hex digest with the built-in Web Crypto API.',
    }) +
    fileImportMarkup({
      id: 'hash-file',
      extensions: DATA_EXTENSIONS,
      hint: 'Import a text file to hash its text content.',
    }) +
    '<div>' +
    '<label class="field-label" for="hash-input">Text to hash</label>' +
    '<textarea class="code-input" id="hash-input" rows="7" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="Type or paste any text"></textarea>' +
    '</div>' +
    '<p class="field-hint">The digest is computed from the text above, encoded as UTF-8. For a plain text file ' +
    'that matches the file\'s contents, but it is not a byte-for-byte checksum of an arbitrary binary file.</p>' +
    '<p class="field-hint">The same text always produces the same SHA-256 hash. Hashing is one-way — ' +
    'the hash cannot be reversed to recover your text, and everything runs in your browser: ' +
    'nothing is sent to a server.</p>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="hash">Generate hash</button>' +
    '</div>' +
    errorBox() +
    outputSection({
      id: 'hash-output',
      label: 'SHA-256 (hex)',
      placeholder: 'The 64-character hash appears here.',
    }) +
    downloadMarkup({ id: 'hash-name', hint: 'Download the hexadecimal hash as a .txt file.' });

  const input = qs(section, '#hash-input');
  const output = qs(section, '#hash-output');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'hash-name', defaultName: 'sha256.txt' });

  const importer = createFileImport(section, {
    id: 'hash-file',
    extensions: DATA_EXTENSIONS,
    onText: (text) => {
      input.value = text;
      output.value = '';
      clearError(errorBoxEl);
      bar.hide();
      input.focus();
      showToast('Text file loaded — generate its hash.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function suggestedName() {
    return importer.fileName
      ? suggestFileName(importer.fileName, { suffix: 'sha256', ext: 'txt' })
      : 'sha256.txt';
  }

  if (!isSha256Supported()) showError(errorBoxEl, UNSUPPORTED_MESSAGE);

  async function generate() {
    const text = input.value;
    if (!text) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, 'Type or paste some text to hash first.');
      return;
    }
    if (!isSha256Supported()) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, UNSUPPORTED_MESSAGE);
      return;
    }
    try {
      output.value = await sha256Hex(text);
      clearError(errorBoxEl);
      bar.show(suggestedName());
    } catch (error) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, error instanceof Error ? error.message : 'The hash could not be computed.');
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
    hash: generate,
    copy: () => copyToClipboard(output.value, 'Hash copied'),
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Generate a hash first, then download it.');
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
