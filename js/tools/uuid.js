/** UUID Generator using the secure browser crypto API. */

import { generateUuids } from '../lib/uuid.js';
import { copyToClipboard } from '../clipboard.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';

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
    });

  const countInput = qs(section, '#uuid-count');
  const output = qs(section, '#uuid-output');
  const errorBoxEl = qs(section, '.error-box');

  function generate() {
    const raw = countInput.value.trim();
    const count = Number(raw);
    if (!raw || !Number.isInteger(count) || count < 1) {
      output.value = '';
      showError(errorBoxEl, 'Enter a whole number between 1 and ' + MAX_UUIDS + '.');
      return;
    }
    if (count > MAX_UUIDS) {
      output.value = '';
      showError(errorBoxEl, 'You can generate at most ' + MAX_UUIDS + ' UUIDs at a time.');
      return;
    }
    clearError(errorBoxEl);
    output.value = generateUuids(count).join('\n');
    output.rows = Math.min(Math.max(count, 3), 12);
  }

  countInput.addEventListener('input', () => clearError(errorBoxEl));

  bindActions(section, {
    back: goBack,
    generate,
    copy: () => copyToClipboard(output.value, 'UUIDs copied'),
    clear: () => {
      clearFields([countInput, output], { focusFirst: false });
      countInput.value = '1';
      output.rows = 8;
      clearError(errorBoxEl);
      countInput.focus();
    },
  });
}
