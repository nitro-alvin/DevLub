/** Regex Tester: try a pattern against text and highlight the matches. */

import { runRegex, buildHighlight, REGEX_FLAGS, REGEX_EXAMPLES } from '../lib/regex.js';
import { escapeHtml } from '../lib/escape.js';
import { DATA_EXTENSIONS } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const SAMPLE = 'Contact alvin@example.com or visit docs.example.dev on 2024-05-01. Colour #4c8dff, order 42 total.';

function matchesReport(result) {
  if (!result || result.count === 0) return 'No matches.';
  const lines = [result.count + (result.count === 1 ? ' match' : ' matches'), ''];
  result.matches.forEach((match, index) => {
    lines.push((index + 1) + '. "' + match.value + '" — line ' + match.line + ', column ' + match.column + ' (index ' + match.index + ')');
    for (const group of match.groups.numbered) {
      if (group.value !== undefined) lines.push('   group ' + group.index + ': "' + group.value + '"');
    }
    for (const group of match.groups.named) {
      if (group.value !== undefined) lines.push('   ' + group.name + ': "' + group.value + '"');
    }
  });
  return lines.join('\n');
}

export function mountRegexTool(section, { goBack }) {
  const flagInputs = REGEX_FLAGS.map((flag) =>
    '<label class="option" title="' + flag.hint + '"><input type="checkbox" id="regex-flag-' + flag.flag + '"' +
    (flag.flag === 'g' ? ' checked' : '') + '> ' + flag.label + '</label>').join('');

  const exampleButtons = REGEX_EXAMPLES.map((example, index) =>
    '<button type="button" class="btn btn-chip" data-action="useExample" data-example="' + index + '">' +
    escapeHtml(example.label) + '</button>').join('');

  section.innerHTML =
    toolHead({
      title: 'Regex Tester',
      description: 'Test a regular expression against your text, with highlighted matches, positions and capture groups.',
    }) +
    fileImportMarkup({
      id: 'regex-file',
      extensions: DATA_EXTENSIONS,
      hint: 'Import a text or log file to test against.',
    }) +
    '<div>' +
    '<label class="field-label" for="regex-pattern">Pattern</label>' +
    '<input class="code-input" id="regex-pattern" type="text" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" placeholder="\\b\\w+@\\w+\\.\\w+\\b">' +
    '</div>' +
    '<fieldset class="option-group"><legend class="field-label">Flags</legend><div class="option-row">' + flagInputs + '</div></fieldset>' +
    '<div>' +
    '<label class="field-label" for="regex-text">Test text</label>' +
    '<textarea class="code-input" id="regex-text" rows="7" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" placeholder="Paste the text to search"></textarea>' +
    '</div>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="test">Test regex</button>' +
    '<button type="button" class="btn" data-action="clear">' + 'Clear</button>' +
    '</div>' +
    errorBox() +
    '<p class="field-hint">Examples:</p>' +
    '<div class="chip-row">' + exampleButtons + '</div>' +
    '<p class="match-count" id="regex-count" hidden></p>' +
    '<pre class="regex-preview" id="regex-preview" hidden></pre>' +
    '<div class="match-list" id="regex-matches" hidden></div>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="copyMatches">Copy matches</button>' +
    '</div>' +
    downloadMarkup({ id: 'regex-name', hint: 'Download the matches as a .txt report.' });

  const patternInput = qs(section, '#regex-pattern');
  const textInput = qs(section, '#regex-text');
  const errorBoxEl = qs(section, '.error-box');
  const countEl = qs(section, '#regex-count');
  const previewEl = qs(section, '#regex-preview');
  const listEl = qs(section, '#regex-matches');
  const bar = createDownloadBar(section, { id: 'regex-name', defaultName: 'regex-matches.txt' });
  let report = '';

  const importer = createFileImport(section, {
    id: 'regex-file',
    extensions: DATA_EXTENSIONS,
    onText: (text) => {
      textInput.value = text;
      clearError(errorBoxEl);
      showToast('Text file loaded — press Test regex.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function readFlags() {
    return REGEX_FLAGS.map((flag) => flag.flag)
      .filter((flag) => qs(section, '#regex-flag-' + flag).checked)
      .join('');
  }

  function clearResults() {
    countEl.hidden = true;
    previewEl.hidden = true;
    listEl.hidden = true;
    listEl.textContent = '';
    previewEl.textContent = '';
    report = '';
    bar.hide();
  }

  function test() {
    const outcome = runRegex(patternInput.value, readFlags(), textInput.value);
    if (!outcome.ok) {
      clearResults();
      showError(errorBoxEl, outcome.error);
      return;
    }
    clearError(errorBoxEl);
    report = matchesReport(outcome);
    countEl.textContent = outcome.truncated
      ? 'Showing the first ' + outcome.count + ' matches.'
      : outcome.count + (outcome.count === 1 ? ' match' : ' matches');
    countEl.hidden = false;
    previewEl.innerHTML = buildHighlight(textInput.value, outcome.matches);
    previewEl.hidden = false;

    if (outcome.count === 0) {
      listEl.hidden = true;
      listEl.textContent = '';
      bar.hide();
      return;
    }

    listEl.innerHTML = outcome.matches.slice(0, 200).map((match, index) =>
      '<div class="match-item">' +
      '<div class="match-head"><span class="match-index">#' + (index + 1) + '</span>' +
      '<code class="match-value">' + escapeHtml(match.value === '' ? '(empty match)' : match.value) + '</code></div>' +
      '<div class="match-meta">line ' + match.line + ', column ' + match.column + ' · index ' + match.index + '</div>' +
      (match.groups.numbered.length || match.groups.named.length
        ? '<ul class="match-groups">' +
          match.groups.numbered.map((group) => '<li>group ' + group.index + ': ' + escapeHtml(String(group.value)) + '</li>').join('') +
          match.groups.named.map((group) => '<li>' + escapeHtml(group.name) + ': ' + escapeHtml(String(group.value)) + '</li>').join('') +
          '</ul>'
        : '') +
      '</div>').join('');
    listEl.hidden = false;
    bar.show('regex-matches.txt');
  }

  textInput.addEventListener('input', () => {
    clearError(errorBoxEl);
    clearResults();
  });
  patternInput.addEventListener('input', () => {
    clearError(errorBoxEl);
    clearResults();
  });

  bindActions(section, {
    back: goBack,
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      clearFields([textInput]);
      clearError(errorBoxEl);
      clearResults();
    },
    test,
    useExample: (target) => {
      const example = REGEX_EXAMPLES[Number(target.dataset.example)];
      if (!example) return;
      patternInput.value = example.pattern;
      for (const flag of REGEX_FLAGS) {
        qs(section, '#regex-flag-' + flag.flag).checked = example.flags.includes(flag.flag);
      }
      if (!textInput.value.trim()) textInput.value = SAMPLE;
      test();
    },
    copyMatches: () => copyToClipboard(report, 'Matches copied'),
    download: () => {
      if (!report || report === 'No matches.') {
        showError(errorBoxEl, 'Run a pattern that produces matches first.');
        return;
      }
      downloadText(report, bar.name);
    },
    clear: () => {
      clearFields([patternInput, textInput], { focusFirst: false });
      for (const flag of REGEX_FLAGS) qs(section, '#regex-flag-' + flag.flag).checked = flag.flag === 'g';
      clearError(errorBoxEl);
      clearResults();
      importer.reset();
      patternInput.focus();
    },
  });
}
