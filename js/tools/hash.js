/** SHA-256 Hash Generator using the browser's Web Crypto API. */

import { sha256Hex, isSha256Supported, UNSUPPORTED_MESSAGE } from '../lib/hash.js';
import { copyToClipboard } from '../clipboard.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';

export function mountHashTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'SHA-256 Hash Generator',
      description: 'Turn any text into its SHA-256 hex digest with the built-in Web Crypto API.',
    }) +
    '<div>' +
    '<label class="field-label" for="hash-input">Text to hash</label>' +
    '<textarea class="code-input" id="hash-input" rows="7" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="Type or paste any text"></textarea>' +
    '</div>' +
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
    });

  const input = qs(section, '#hash-input');
  const output = qs(section, '#hash-output');
  const errorBoxEl = qs(section, '.error-box');

  if (!isSha256Supported()) showError(errorBoxEl, UNSUPPORTED_MESSAGE);

  async function generate() {
    const text = input.value;
    if (!text) {
      output.value = '';
      showError(errorBoxEl, 'Type or paste some text to hash first.');
      return;
    }
    if (!isSha256Supported()) {
      output.value = '';
      showError(errorBoxEl, UNSUPPORTED_MESSAGE);
      return;
    }
    try {
      output.value = await sha256Hex(text);
      clearError(errorBoxEl);
    } catch (error) {
      output.value = '';
      showError(errorBoxEl, error instanceof Error ? error.message : 'The hash could not be computed.');
    }
  }

  input.addEventListener('input', () => clearError(errorBoxEl));

  bindActions(section, {
    back: goBack,
    hash: generate,
    copy: () => copyToClipboard(output.value, 'Hash copied'),
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
    },
  });
}
