/** SQL Formatter: pretty-print or minify SQL text (never executed). */

import { formatSql, minifySql } from '../lib/sql.js';
import { SQL_EXTENSIONS } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox, outputSection } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const SAMPLE = 'select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = 1 and u.created_at > \'2024-01-01\' group by u.id, u.name having count(o.id) > 0 order by orders desc limit 20;';

export function mountSqlTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'SQL Formatter',
      description: 'Indent and line-break SQL so it is easy to read, or collapse it back to one line. Your SQL is never run or uploaded.',
    }) +
    fileImportMarkup({
      id: 'sql-file',
      extensions: SQL_EXTENSIONS,
      hint: 'Import a .sql file or any text file containing SQL.',
    }) +
    '<div>' +
    '<label class="field-label" for="sql-input">SQL</label>' +
    '<textarea class="code-input" id="sql-input" rows="9" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="SELECT * FROM users WHERE active = 1;"></textarea>' +
    '</div>' +
    '<p class="field-hint">Never executed and never sent anywhere — this only reformats the text.</p>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="format">Format</button>' +
    '<button type="button" class="btn" data-action="minify">Minify</button>' +
    '<button type="button" class="btn" data-action="useSample">Example</button>' +
    '</div>' +
    errorBox() +
    outputSection({ id: 'sql-output', label: 'Output', placeholder: 'Formatted SQL appears here.' }) +
    downloadMarkup({ id: 'sql-name', hint: 'Download the formatted SQL as a .sql file.' });

  const input = qs(section, '#sql-input');
  const output = qs(section, '#sql-output');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'sql-name', defaultName: 'query.sql' });

  const importer = createFileImport(section, {
    id: 'sql-file',
    extensions: SQL_EXTENSIONS,
    onText: (text) => {
      input.value = text;
      output.value = '';
      clearError(errorBoxEl);
      bar.hide();
      showToast('SQL file loaded — press Format or Minify.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function run(mode) {
    if (!input.value.trim()) {
      output.value = '';
      bar.hide();
      showError(errorBoxEl, 'Paste or import some SQL first.');
      return;
    }
    clearError(errorBoxEl);
    output.value = mode === 'format' ? formatSql(input.value) : minifySql(input.value);
    output.rows = Math.min(24, Math.max(8, output.value.split('\n').length + 1));
    bar.show(mode === 'format' ? 'query.sql' : 'query.min.sql');
  }

  input.addEventListener('input', () => {
    clearError(errorBoxEl);
    bar.hide();
  });

  bindActions(section, {
    back: goBack,
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      clearFields([input, output]);
      clearError(errorBoxEl);
      bar.reset();
    },
    format: () => run('format'),
    minify: () => run('minify'),
    useSample: () => {
      input.value = SAMPLE;
      clearError(errorBoxEl);
      run('format');
    },
    copy: () => copyToClipboard(output.value, 'SQL copied'),
    download: () => {
      if (!output.value) {
        showError(errorBoxEl, 'Format or minify some SQL first, then download it.');
        return;
      }
      downloadText(output.value, bar.name, 'application/sql;charset=utf-8');
    },
    clear: () => {
      clearFields([input, output]);
      clearError(errorBoxEl);
      bar.reset();
      importer.reset();
    },
  });
}
