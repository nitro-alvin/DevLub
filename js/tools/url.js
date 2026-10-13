/** URL Encoder / Decoder using the browser's built-in percent-encoding. */

import { encodeUrl, decodeUrl } from '../lib/url.js';
import { copyToClipboard } from '../clipboard.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';

export function mountUrlTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'URL Encoder / Decoder',
      description: 'Percent-encode text for use in URLs and query strings, or decode it back to readable text.',
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
    });

  const input = qs(section, '#url-input');
  const output = qs(section, '#url-output');
  const errorBoxEl = qs(section, '.error-box');

  function run(mode) {
    const text = input.value;
    if (!text.trim()) {
      output.value = '';
      showError(errorBoxEl, mode === 'encode' ? 'Type some text to encode first.' : 'Paste some encoded text to decode first.');
      return;
    }
    try {
      const result = mode === 'encode' ? encodeUrl(text) : decodeUrl(text);
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
