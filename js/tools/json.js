/** JSON Formatter: pretty-print, minify and validate JSON. */

import { formatJson, minifyJson, validateJson } from '../lib/json.js';
import { suggestFileName } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const EXTENSIONS = ['json'];

export function mountJsonTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'JSON Formatter',
      description: 'Paste or import JSON to pretty-print, minify or validate it. Errors show exactly where the problem is.',
    }) +
    fileImportMarkup({
      id: 'json-file',
      extensions: EXTENSIONS,
      hint: 'Import a .json file, or paste it below.',
    }) +
    '<div>' +
    '<label class="field-label" for="json-input">Input JSON</label>' +
    '<textarea class="code-input" id="json-input" rows="8" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="Paste JSON here, e.g. {&quot;name&quot;:&quot;Alvin&quot;,&quot;age&quot;:18}"></textarea>' +
    '</div>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="format">Format</button>' +
    '<button type="button" class="btn" data-action="minify">Minify</button>' +
    '<button type="button" class="btn" data-action="validate">Validate</button>' +
    '</div>' +
    errorBox() +
    outputSection({
      id: 'json-output',
      label: 'Output',
      placeholder: 'Formatted JSON appears here.',
      extraButtons:
        '<button type="button" class="btn" data-action="swap">' + icons.swap + '<span>Swap</span></button>',
    }) +
    downloadMarkup({ id: 'json-name', hint: 'Rename the file before saving a copy.' });

  const input = qs(section, '#json-input');
  const output = qs(section, '#json-output');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'json-name', defaultName: 'data-formatted.json' });

  const importer = createFileImport(section, {
    id: 'json-file',
    extensions: EXTENSIONS,
    onText: (text) => {
      input.value = text;
      output.value = '';
      clearError(errorBoxEl);
      bar.hide();
      input.focus();
      showToast('JSON file loaded — edit it, then format or minify.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function suggest(mode) {
    return suggestFileName(importer.fileName, {
      suffix: mode === 'minify' ? 'minified' : 'formatted',
      ext: 'json',
      fallbackBase: 'data',
    });
  }

  function run(mode) {
    const text = input.value;
    if (!text.trim()) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, 'Paste or type some JSON first.');
      return;
    }
    const result = mode === 'format'
      ? formatJson(text)
      : mode === 'minify'
        ? minifyJson(text)
        : validateJson(text);
    if (!result.ok) {
      // Keep the original imported/typed text so the user can fix it.
      output.value = '';
      bar.hide();
      showError(errorBoxEl, result.error);
      return;
    }
    clearError(errorBoxEl);
    if (mode === 'validate') {
      output.value = '';
      bar.hide();
      showToast('Valid JSON');
    } else {
      output.value = result.output;
      bar.show(suggest(mode));
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
    format: () => run('format'),
    minify: () => run('minify'),
    validate: () => run('validate'),
    copy: () => copyToClipboard(output.value, 'Output copied'),
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Format or minify some JSON first, then download it.');
        return;
      }
      downloadText(output.value, bar.name);
    },
    swap: () => {
      const previousInput = input.value;
      input.value = output.value;
      output.value = previousInput;
      clearError(errorBoxEl);
      bar.hide();
    },
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
      bar.reset();
      importer.reset();
    },
  });
}
