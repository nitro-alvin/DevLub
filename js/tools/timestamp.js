/** Unix Timestamp Converter: epoch ⇄ readable dates, seconds or milliseconds. */

import { parseTimestamp, parseDateTimeInput, formatUtc, formatLocal } from '../lib/timestamp.js';
import { copyToClipboard } from '../clipboard.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const DEFAULT_UNIT_HINT = 'Auto-detects seconds or milliseconds — you can override it.';

function resultRow({ id, label, action }) {
  return (
    '<div class="field-group">' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<div class="field-input-group">' +
    '<input class="code-input" id="' + id + '" type="text" readonly spellcheck="false">' +
    '<button type="button" class="btn" data-action="' + action + '">' +
    icons.copy + '<span>Copy</span></button>' +
    '</div>' +
    '</div>'
  );
}

export function mountTimestampTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'Unix Timestamp Converter',
      description: 'Convert epoch timestamps to readable dates and back — in seconds or milliseconds.',
    }) +
    '<section class="converter" id="ts-from">' +
    '<h3 class="converter-title">Timestamp → date</h3>' +
    '<div class="field-group">' +
    '<label class="field-label" for="ts-value">Unix timestamp</label>' +
    '<div class="field-input-group">' +
    '<input class="code-input" id="ts-value" type="text" inputmode="numeric" autocomplete="off" ' +
    'spellcheck="false" placeholder="1700000000">' +
    '<label class="visually-hidden" for="ts-unit">Unit</label>' +
    '<select class="select-input" id="ts-unit">' +
    '<option value="auto">Auto</option>' +
    '<option value="s">Seconds</option>' +
    '<option value="ms">Milliseconds</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<p class="field-hint" id="ts-unit-hint">' + DEFAULT_UNIT_HINT + '</p>' +
    errorBox() +
    resultRow({ id: 'ts-local', label: 'Local time', action: 'copyLocal' }) +
    resultRow({ id: 'ts-utc', label: 'UTC', action: 'copyUtc' }) +
    '</section>' +
    '<section class="converter" id="ts-to">' +
    '<h3 class="converter-title">Date → timestamp</h3>' +
    '<div class="field-group">' +
    '<label class="field-label" for="ts-date">Date and time (your local time)</label>' +
    '<input class="code-input" id="ts-date" type="datetime-local">' +
    '</div>' +
    errorBox() +
    resultRow({ id: 'ts-seconds', label: 'Unix seconds', action: 'copySeconds' }) +
    resultRow({ id: 'ts-ms', label: 'Milliseconds', action: 'copyMs' }) +
    '</section>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    downloadMarkup({ id: 'ts-name', hint: 'Download the input, its unit and both local and UTC results as .txt.' });

  const valueInput = qs(section, '#ts-value');
  const unitSelect = qs(section, '#ts-unit');
  const unitHint = qs(section, '#ts-unit-hint');
  const localOutput = qs(section, '#ts-local');
  const utcOutput = qs(section, '#ts-utc');
  const dateInput = qs(section, '#ts-date');
  const secondsOutput = qs(section, '#ts-seconds');
  const msOutput = qs(section, '#ts-ms');
  const fromError = qs(section, '#ts-from .error-box');
  const toError = qs(section, '#ts-to .error-box');
  const bar = createDownloadBar(section, { id: 'ts-name', defaultName: 'timestamp.txt' });

  let unitText = '';

  function compose() {
    const lines = ['Unix timestamp conversion', ''];
    if (valueInput.value.trim() && localOutput.value) {
      lines.push('Timestamp input: ' + valueInput.value.trim());
      lines.push('Unit: ' + unitText);
      lines.push('Local time: ' + localOutput.value);
      lines.push('UTC: ' + utcOutput.value);
    }
    if (secondsOutput.value) {
      if (localOutput.value) lines.push('');
      if (dateInput.value) lines.push('Date input: ' + dateInput.value);
      lines.push('Unix seconds: ' + secondsOutput.value);
      lines.push('Milliseconds: ' + msOutput.value);
    }
    if (lines.length <= 2) return '';
    return lines.join('\n').trim();
  }

  function refreshBar() {
    const text = compose();
    if (text) bar.show('timestamp.txt');
    else bar.hide();
  }

  function clearFromResults() {
    localOutput.value = '';
    utcOutput.value = '';
    unitText = '';
    unitHint.textContent = DEFAULT_UNIT_HINT;
  }

  function updateFromDate() {
    const result = parseTimestamp(valueInput.value, unitSelect.value);
    if (!result.ok) {
      clearFromResults();
      if (result.empty) clearError(fromError);
      else showError(fromError, result.error);
      refreshBar();
      return;
    }
    clearError(fromError);
    localOutput.value = formatLocal(result.date);
    utcOutput.value = formatUtc(result.date);
    unitText = result.unit === 's' ? 'seconds' : 'milliseconds';
    unitHint.textContent =
      'Using ' + unitText + (unitSelect.value === 'auto' ? ' (auto-detected)' : '');
    refreshBar();
  }

  function updateToDate() {
    const result = parseDateTimeInput(dateInput.value);
    if (!result.ok) {
      secondsOutput.value = '';
      msOutput.value = '';
      if (result.empty) clearError(toError);
      else showError(toError, result.error);
      refreshBar();
      return;
    }
    clearError(toError);
    secondsOutput.value = String(result.seconds);
    msOutput.value = String(result.ms);
    refreshBar();
  }

  valueInput.addEventListener('input', updateFromDate);
  unitSelect.addEventListener('change', updateFromDate);
  dateInput.addEventListener('input', updateToDate);

  bindActions(section, {
    back: goBack,
    copyLocal: () => copyToClipboard(localOutput.value, 'Local time copied'),
    copyUtc: () => copyToClipboard(utcOutput.value, 'UTC time copied'),
    copySeconds: () => copyToClipboard(secondsOutput.value, 'Timestamp copied'),
    copyMs: () => copyToClipboard(msOutput.value, 'Milliseconds copied'),
    download: () => {
      const text = compose();
      if (!text) {
        showError(fromError, 'Convert a timestamp or a date first, then download the result.');
        return;
      }
      downloadText(text, bar.name);
    },
    clear: () => {
      clearFields([valueInput, dateInput], { focusFirst: false });
      clearFromResults();
      secondsOutput.value = '';
      msOutput.value = '';
      clearError(fromError);
      clearError(toError);
      bar.reset();
      valueInput.focus();
    },
  });
}
