/** JSON Formatter: pretty-print, minify and validate JSON. */

import { formatJson, minifyJson, validateJson } from '../lib/json.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';

export function mountJsonTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'JSON Formatter',
      description: 'Paste JSON to pretty-print, minify or validate it. Errors show exactly where the problem is.',
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
    });

  const input = qs(section, '#json-input');
  const output = qs(section, '#json-output');
  const errorBoxEl = qs(section, '.error-box');

  function run(mode) {
    const text = input.value;
    if (!text.trim()) {
      output.value = '';
      showError(errorBoxEl, 'Paste or type some JSON first.');
      return;
    }
    const result = mode === 'format'
      ? formatJson(text)
      : mode === 'minify'
        ? minifyJson(text)
        : validateJson(text);
    if (!result.ok) {
      output.value = '';
      showError(errorBoxEl, result.error);
      return;
    }
    clearError(errorBoxEl);
    if (mode === 'validate') {
      showToast('Valid JSON');
    } else {
      output.value = result.output;
    }
  }

  input.addEventListener('input', () => clearError(errorBoxEl));

  bindActions(section, {
    back: goBack,
    format: () => run('format'),
    minify: () => run('minify'),
    validate: () => run('validate'),
    copy: () => copyToClipboard(output.value, 'Output copied'),
    swap: () => {
      const previousInput = input.value;
      input.value = output.value;
      output.value = previousInput;
      clearError(errorBoxEl);
    },
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
    },
  });
}
