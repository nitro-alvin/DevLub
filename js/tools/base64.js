/** Base64 Encoder / Decoder, Unicode and emoji safe. */

import { encodeBase64, decodeBase64 } from '../lib/base64.js';
import { copyToClipboard } from '../clipboard.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';

export function mountBase64Tool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'Base64 Encoder / Decoder',
      description: 'Encode text into Base64 or decode Base64 back into text. Unicode and emoji are fully supported.',
    }) +
    '<div>' +
    '<label class="field-label" for="b64-input">Input</label>' +
    '<textarea class="code-input" id="b64-input" rows="8" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="Text to encode, or Base64 to decode"></textarea>' +
    '</div>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="encode">Encode</button>' +
    '<button type="button" class="btn" data-action="decode">Decode</button>' +
    '</div>' +
    errorBox() +
    outputSection({
      id: 'b64-output',
      label: 'Output',
      placeholder: 'Result appears here.',
    });

  const input = qs(section, '#b64-input');
  const output = qs(section, '#b64-output');
  const errorBoxEl = qs(section, '.error-box');

  function run(mode) {
    const text = input.value;
    if (!text.trim()) {
      output.value = '';
      showError(errorBoxEl, mode === 'encode' ? 'Type some text to encode first.' : 'Paste some Base64 to decode first.');
      return;
    }
    try {
      const result = mode === 'encode' ? encodeBase64(text) : decodeBase64(text);
      clearError(errorBoxEl);
      output.value = result;
    } catch (error) {
      output.value = '';
      showError(errorBoxEl, error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  input.addEventListener('input', () => clearError(errorBoxEl));

  bindActions(section, {
    back: goBack,
    encode: () => run('encode'),
    decode: () => run('decode'),
    copy: () => copyToClipboard(output.value, 'Output copied'),
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
    },
  });
}
