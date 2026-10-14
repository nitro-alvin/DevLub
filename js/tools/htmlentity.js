/** HTML Entity Encoder / Decoder. */

import { encodeEntities, decodeEntities } from '../lib/entities.js';
import { HTML_EXTENSIONS } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

export function mountHtmlEntityTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'HTML Entity Converter',
      description: 'Encode text into HTML entities or decode entities back into plain text, including Unicode characters.',
    }) +
    fileImportMarkup({
      id: 'entity-file',
      extensions: HTML_EXTENSIONS,
      hint: 'Import a text or HTML file to convert.',
    }) +
    '<div>' +
    '<label class="field-label" for="entity-input">Original text</label>' +
    '<textarea class="code-input" id="entity-input" rows="7" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="Text, or HTML with &amp;lt;entities&amp;gt;"></textarea>' +
    '</div>' +
    '<fieldset class="option-group"><legend class="field-label">Options</legend>' +
    '<label class="option"><input type="checkbox" id="entity-nonascii"> Also encode non-ASCII characters (caf\u00e9 \u2192 caf&#233;)</label>' +
    '</fieldset>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="encode">Encode</button>' +
    '<button type="button" class="btn" data-action="decode">Decode</button>' +
    '</div>' +
    errorBox() +
    outputSection({ id: 'entity-output', label: 'Converted result', placeholder: 'Result appears here.' }) +
    downloadMarkup({ id: 'entity-name', hint: 'Download the converted text as a .txt file.' });

  const input = qs(section, '#entity-input');
  const output = qs(section, '#entity-output');
  const nonAscii = qs(section, '#entity-nonascii');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'entity-name', defaultName: 'entities.txt' });

  const importer = createFileImport(section, {
    id: 'entity-file',
    extensions: HTML_EXTENSIONS,
    onText: (text) => {
      input.value = text;
      output.value = '';
      clearError(errorBoxEl);
      bar.hide();
      showToast('File loaded — choose Encode or Decode.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function run(mode) {
    if (!input.value) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, mode === 'encode' ? 'Type or import some text to encode first.' : 'Paste some HTML entities to decode first.');
      return;
    }
    clearError(errorBoxEl);
    output.value = mode === 'encode'
      ? encodeEntities(input.value, { encodeNonAscii: nonAscii.checked })
      : decodeEntities(input.value);
    bar.show(mode === 'encode' ? 'encoded.txt' : 'decoded.txt');
  }

  input.addEventListener('input', () => {
    clearError(errorBoxEl);
    bar.hide();
  });
  nonAscii.addEventListener('change', () => {
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
    copy: () => copyToClipboard(output.value, 'Result copied'),
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Encode or decode some text first, then download it.');
        return;
      }
      downloadText(output.value, bar.name, 'text/html;charset=utf-8');
    },
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
      bar.reset();
      importer.reset();
    },
  });
}
