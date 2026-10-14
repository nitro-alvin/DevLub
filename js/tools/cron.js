/** Cron Expression Helper: explain a 5-field cron expression in plain English. */

import { describeCron, CRON_EXAMPLES } from '../lib/cron.js';
import { escapeHtml } from '../lib/escape.js';
import { copyToClipboard } from '../clipboard.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

export function mountCronTool(section, { goBack }) {
  const examples = CRON_EXAMPLES.map((example, index) =>
    '<button type="button" class="btn btn-chip" data-action="useExample" data-example="' + index + '">' +
    escapeHtml(example.label) + '</button>').join('');

  section.innerHTML =
    toolHead({
      title: 'Cron Helper',
      description: 'Explain a cron schedule field by field. Supports the standard 5-field format and the common @shortcuts.',
    }) +
    '<div>' +
    '<label class="field-label" for="cron-input">Cron expression</label>' +
    '<input class="code-input" id="cron-input" type="text" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" placeholder="*/5 * * * *">' +
    '</div>' +
    '<p class="field-hint">Format: <code>minute hour day-of-month month day-of-week</code> &nbsp;·&nbsp; ' +
    'also accepts @hourly, @daily, @weekly, @monthly and @yearly. Seconds and exact next-run times are not supported.</p>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="copy">Copy expression</button>' +
    '<button type="button" class="btn" data-action="clear">Clear</button>' +
    '</div>' +
    errorBox() +
    '<p class="field-hint">Examples:</p>' +
    '<div class="chip-row">' + examples + '</div>' +
    '<p class="status-pill" id="cron-summary" hidden></p>' +
    '<div class="table-wrap" id="cron-table-wrap" hidden>' +
    '<table class="data-table"><thead><tr><th>Field</th><th>Value</th><th>Meaning</th></tr></thead>' +
    '<tbody id="cron-fields"></tbody></table>' +
    '</div>' +
    downloadMarkup({ id: 'cron-name', hint: 'Download the explanation as a .txt file.' });

  const input = qs(section, '#cron-input');
  const errorBoxEl = qs(section, '.error-box');
  const summaryEl = qs(section, '#cron-summary');
  const tableWrap = qs(section, '#cron-table-wrap');
  const fieldsBody = qs(section, '#cron-fields');
  const bar = createDownloadBar(section, { id: 'cron-name', defaultName: 'cron-explanation.txt' });
  let report = '';

  function reset() {
    summaryEl.hidden = true;
    tableWrap.hidden = true;
    fieldsBody.innerHTML = '';
    bar.hide();
    report = '';
  }

  function explain() {
    const result = describeCron(input.value);
    if (!result.ok) {
      reset();
      if (result.empty) clearError(errorBoxEl);
      else showError(errorBoxEl, result.error);
      return;
    }
    clearError(errorBoxEl);
    summaryEl.textContent = result.summary;
    summaryEl.hidden = false;
    fieldsBody.innerHTML = result.fields.map((field) =>
      '<tr><td>' + escapeHtml(field.label) + '</td>' +
      '<td><code>' + escapeHtml(field.value) + '</code></td>' +
      '<td>' + escapeHtml(field.description) + '</td></tr>').join('');
    tableWrap.hidden = false;
    report = [
      'Cron expression: ' + result.normalized,
      result.shortcut ? '(expanded from a @shortcut)' : null,
      '',
      result.summary,
      '',
      ...result.fields.map((field) => field.label + ': ' + field.value + ' — ' + field.description),
      '',
      'Format: standard 5-field cron (minute hour day-of-month month day-of-week).',
      'This tool explains a schedule; it does not calculate exact next-run times.',
    ].filter((line) => line !== null).join('\n');
    bar.show('cron-explanation.txt');
  }

  input.addEventListener('input', () => {
    clearError(errorBoxEl);
    explain();
  });

  bindActions(section, {
    back: goBack,
    useExample: (target) => {
      const example = CRON_EXAMPLES[Number(target.dataset.example)];
      if (!example) return;
      input.value = example.expression;
      explain();
    },
    copy: () => copyToClipboard(input.value, 'Cron expression copied'),
    download: () => {
      if (!report) {
        showError(errorBoxEl, 'Enter a valid cron expression first.');
        return;
      }
      downloadText(report, bar.name);
    },
    clear: () => {
      clearFields([input]);
      clearError(errorBoxEl);
      reset();
    },
  });

  input.value = CRON_EXAMPLES[1].expression;
  explain();
}
