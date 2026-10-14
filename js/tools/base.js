/** Number Base Converter: binary, octal, decimal and hexadecimal, via BigInt. */

import { convertNumberBase, BASE_OPTIONS } from '../lib/base-convert.js';
import { copyToClipboard } from '../clipboard.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const RESULTS = [
  { key: 'binary', id: 'base-binary', label: 'Binary (2)', action: 'copyBinary' },
  { key: 'octal', id: 'base-octal', label: 'Octal (8)', action: 'copyOctal' },
  { key: 'decimal', id: 'base-decimal', label: 'Decimal (10)', action: 'copyDecimal' },
  { key: 'hex', id: 'base-hex', label: 'Hexadecimal (16)', action: 'copyHex' },
];

export function mountBaseTool(section, { goBack }) {
  const options = BASE_OPTIONS.map((option) =>
    '<option value="' + option.value + '">' + option.label + '</option>').join('');

  const resultRows = RESULTS.map((row) =>
    '<div class="field-group">' +
    '<label class="field-label" for="' + row.id + '">' + row.label + '</label>' +
    '<div class="field-input-group">' +
    '<input class="code-input" id="' + row.id + '" type="text" readonly spellcheck="false" placeholder="—">' +
    '<button type="button" class="btn" data-action="' + row.action + '">Copy</button>' +
    '</div></div>').join('');

  section.innerHTML =
    toolHead({
      title: 'Number Base Converter',
      description: 'Convert between binary, octal, decimal and hexadecimal. Big integers use BigInt, so nothing is rounded.',
    }) +
    '<div>' +
    '<label class="field-label" for="base-input">Number</label>' +
    '<div class="field-input-group">' +
    '<input class="code-input" id="base-input" type="text" inputmode="text" autocomplete="off" spellcheck="false" ' +
    'autocapitalize="off" placeholder="255 or FF or 11111111">' +
    '<label class="visually-hidden" for="base-source">Input base</label>' +
    '<select class="select-input" id="base-source">' + options + '</select>' +
    '</div>' +
    '</div>' +
    '<p class="field-hint">The 0b, 0o and 0x prefixes and digit separators like 1_000 are accepted. Negative numbers are supported.</p>' +
    errorBox() +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    resultRows +
    downloadMarkup({ id: 'base-name', hint: 'Download all four values as a .txt file.' });

  const input = qs(section, '#base-input');
  const select = qs(section, '#base-source');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'base-name', defaultName: 'number-bases.txt' });
  let latest = null;

  select.value = '10';

  function clearResults() {
    for (const row of RESULTS) qs(section, '#' + row.id).value = '';
    latest = null;
    bar.hide();
  }

  function convert() {
    const result = convertNumberBase(input.value, select.value);
    if (!result.ok) {
      clearResults();
      if (result.empty) clearError(errorBoxEl);
      else showError(errorBoxEl, result.error);
      return;
    }
    clearError(errorBoxEl);
    for (const row of RESULTS) qs(section, '#' + row.id).value = result[row.key];
    latest = result;
    bar.show('number-bases.txt');
  }

  input.addEventListener('input', convert);
  select.addEventListener('change', convert);

  bindActions(section, {
    back: goBack,
    copyBinary: () => copyToClipboard(latest ? latest.binary : '', 'Binary copied'),
    copyOctal: () => copyToClipboard(latest ? latest.octal : '', 'Octal copied'),
    copyDecimal: () => copyToClipboard(latest ? latest.decimal : '', 'Decimal copied'),
    copyHex: () => copyToClipboard(latest ? latest.hex : '', 'Hexadecimal copied'),
    download: () => {
      if (!latest) {
        showError(errorBoxEl, 'Enter a valid number first, then download the results.');
        return;
      }
      const text = [
        'Number base conversion',
        'Input: ' + input.value.trim() + ' (base ' + select.value + ')',
        '',
        'Binary (2): ' + latest.binary,
        'Octal (8): ' + latest.octal,
        'Decimal (10): ' + latest.decimal,
        'Hexadecimal (16): ' + latest.hex,
      ].join('\n');
      downloadText(text, bar.name);
    },
    clear: () => {
      clearFields([input], { focusFirst: false });
      select.value = '10';
      clearError(errorBoxEl);
      clearResults();
      input.focus();
    },
  });
}
