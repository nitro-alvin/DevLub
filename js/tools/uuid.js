/** UUID Generator using the secure browser crypto API. */

import { generateUuids } from '../lib/uuid.js';
import { copyToClipboard } from '../clipboard.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const MAX_UUIDS = 100;

export function mountUuidTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'UUID Generator',
      description: 'Generate secure, random UUID v4 values — perfect for test data, ids and samples.',
    }) +
    '<div class="count-field">' +
    '<div>' +
    '<label class="field-label" for="uuid-count">How many</label>' +
    '<input class="count-input" id="uuid-count" type="number" min="1" max="' + MAX_UUIDS + '" step="1" ' +
    'value="1" inputmode="numeric" aria-describedby="uuid-hint">' +
    '</div>' +
    '</div>' +
    '<p class="field-hint" id="uuid-hint">Between 1 and ' + MAX_UUIDS + '. Generated on your device with secure randomness.</p>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="generate">Generate</button>' +
    '</div>' +
    errorBox() +
    outputSection({
      id: 'uuid-output',
      label: 'Generated UUIDs',
      placeholder: 'Tap Generate to create UUIDs.',
    }) +
    downloadMarkup({ id: 'uuid-name', hint: 'Download single UUIDs or a whole batch as a .txt file.' });

  const countInput = qs(section, '#uuid-count');
  const output = qs(section, '#uuid-output');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'uuid-name', defaultName: 'uuid.txt' });

  function generate() {
    const raw = countInput.value.trim();
    const count = Number(raw);
    if (!raw || !Number.isInteger(count) || count < 1) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, 'Enter a whole number between 1 and ' + MAX_UUIDS + '.');
      return;
    }
    if (count > MAX_UUIDS) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, 'You can generate at most ' + MAX_UUIDS + ' UUIDs at a time.');
      return;
    }
    clearError(errorBoxEl);
    output.value = generateUuids(count).join('\n');
    output.rows = Math.min(Math.max(count, 3), 12);
    bar.show(count === 1 ? 'uuid.txt' : 'uuids.txt');
  }

  countInput.addEventListener('input', () => {
    clearError(errorBoxEl);
    bar.hide();
  });

  bindActions(section, {
    back: goBack,
    generate,
    copy: () => copyToClipboard(output.value, 'UUIDs copied'),
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Generate some UUIDs first, then download them.');
        return;
      }
      downloadText(output.value, bar.name);
    },
    clear: () => {
      clearFields([countInput, output], { focusFirst: false });
      countInput.value = '1';
      output.rows = 8;
      clearError(errorBoxEl);
      bar.reset();
      countInput.focus();
    },
  });
}
