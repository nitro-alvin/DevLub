/** JSON → CSV: turn an array of objects into a CSV file, fully in the browser. */

import { jsonToCsv } from '../lib/csv.js';
import { JSON_EXTENSIONS } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const SAMPLE = '[\n  { "name": "Alvin", "age": 18 },\n  { "name": "Alex", "age": 19 }\n]';

export function mountJsonCsvTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'JSON → CSV',
      description: 'Turn a JSON array of objects into CSV, with proper quoting for commas, quotes and line breaks.',
    }) +
    fileImportMarkup({
      id: 'csv-file',
      extensions: JSON_EXTENSIONS,
      hint: 'Import a .json file, or paste JSON below.',
    }) +
    '<div>' +
    '<label class="field-label" for="csv-input">JSON input</label>' +
    '<textarea class="code-input" id="csv-input" rows="8" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder=\'[{"name":"Alvin","age":18}]\'></textarea>' +
    '</div>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="convert">Convert to CSV</button>' +
    '<button type="button" class="btn" data-action="useSample">Example</button>' +
    '</div>' +
    errorBox() +
    outputSection({ id: 'csv-output', label: 'CSV preview', placeholder: 'CSV appears here.' }) +
    downloadMarkup({ id: 'csv-name', hint: 'Download the converted data as a .csv file.' });

  const input = qs(section, '#csv-input');
  const output = qs(section, '#csv-output');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'csv-name', defaultName: 'data.csv' });

  const importer = createFileImport(section, {
    id: 'csv-file',
    extensions: JSON_EXTENSIONS,
    onText: (text) => {
      input.value = text;
      output.value = '';
      clearError(errorBoxEl);
      bar.hide();
      showToast('JSON file loaded — press Convert to CSV.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function convert() {
    const result = jsonToCsv(input.value);
    if (!result.ok) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, result.empty ? 'Paste or import some JSON first.' : result.error);
      return;
    }
    clearError(errorBoxEl);
    output.value = result.output;
    output.rows = Math.min(20, Math.max(6, result.rowCount + 2));
    bar.show(importer.fileName ? importer.fileName.replace(/\.[^.]+$/, '') + '.csv' : 'data.csv');
    showToast(result.rowCount + (result.rowCount === 1 ? ' row' : ' rows') + ' converted');
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
    convert,
    useSample: () => {
      input.value = SAMPLE;
      clearError(errorBoxEl);
      convert();
    },
    copy: () => copyToClipboard(output.value, 'CSV copied'),
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Convert some JSON first, then download the CSV.');
        return;
      }
      downloadText(output.value, bar.name, 'text/csv;charset=utf-8');
    },
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
      bar.reset();
      importer.reset();
    },
  });
}
