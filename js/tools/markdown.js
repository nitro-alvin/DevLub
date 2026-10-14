/** Markdown Previewer: edit Markdown and see sanitized HTML live. */

import { renderMarkdown } from '../lib/markdown.js';
import { MARKDOWN_EXTENSIONS } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

const SAMPLE = [
  '# Markdown Previewer',
  '',
  'Type on the left and the preview updates as you go.',
  '',
  '## Formatting',
  '',
  '- **bold**, _italic_ and `inline code`',
  '- [links](/docs/getting-started) and lists',
  '- [x] task lists',
  '',
  '> Blockquotes work too.',
  '',
  '```js',
  'const greet = (name) => `Hello, ${name}!`;',
  '```',
  '',
  '| Language | Extension |',
  '| --- | --- |',
  '| JavaScript | .js |',
  '| Markdown | .md |',
  '',
  '---',
  '',
  'Raw HTML such as <script>alert(1)</script> is shown as text, never run.',
].join('\n');

export function mountMarkdownTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'Markdown Previewer',
      description: 'Write Markdown and preview the rendered HTML instantly. Everything is sanitized, so no script can run.',
    }) +
    fileImportMarkup({
      id: 'md-file',
      extensions: MARKDOWN_EXTENSIONS,
      hint: 'Import a .md file to edit and preview it.',
    }) +
    '<div class="markdown-split">' +
    '<div class="markdown-pane">' +
    '<label class="field-label" for="md-input">Markdown</label>' +
    '<textarea class="code-input" id="md-input" rows="14" spellcheck="false" ' +
    'autocapitalize="sentences" placeholder="# Heading&#10;&#10;Write Markdown here…"></textarea>' +
    '</div>' +
    '<div class="markdown-pane">' +
    '<p class="field-label" id="md-preview-label">Preview</p>' +
    '<div class="markdown-preview" id="md-preview" aria-labelledby="md-preview-label"></div>' +
    '</div>' +
    '</div>' +
    errorBox() +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="copy">' + 'Copy Markdown</button>' +
    '<button type="button" class="btn" data-action="clear">Clear</button>' +
    '</div>' +
    downloadMarkup({ id: 'md-name', hint: 'Download your Markdown as a .md file.' });

  const input = qs(section, '#md-input');
  const preview = qs(section, '#md-preview');
  const errorBoxEl = qs(section, '.error-box');
  const bar = createDownloadBar(section, { id: 'md-name', defaultName: 'document.md' });

  const importer = createFileImport(section, {
    id: 'md-file',
    extensions: MARKDOWN_EXTENSIONS,
    onText: (text) => {
      input.value = text;
      clearError(errorBoxEl);
      render();
      showToast('Markdown file loaded.');
    },
    onError: (message) => {
      preview.innerHTML = '<p class="md-empty">Nothing to preview yet.</p>';
      errorBoxEl.textContent = message;
      errorBoxEl.hidden = false;
    },
  });

  function render() {
    const source = input.value;
    if (!source.trim()) {
      preview.innerHTML = '<p class="md-empty">Start typing Markdown on the left to see the preview.</p>';
      bar.hide();
      return;
    }
    preview.innerHTML = renderMarkdown(source);
    bar.show(importer.fileName && /\.(md|markdown)$/i.test(importer.fileName) ? importer.fileName : 'document.md');
  }

  input.addEventListener('input', () => {
    clearError(errorBoxEl);
    render();
  });

  input.value = SAMPLE;
  render();

  bindActions(section, {
    back: goBack,
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      clearFields([input]);
      bar.reset();
      render();
    },
    copy: () => copyToClipboard(input.value, 'Markdown copied'),
    download: () => {
      if (!input.value.trim()) {
        errorBoxEl.textContent = 'Write or import some Markdown first.';
        errorBoxEl.hidden = false;
        return;
      }
      downloadText(input.value, bar.name, 'text/markdown;charset=utf-8');
    },
    clear: () => {
      clearFields([input]);
      clearError(errorBoxEl);
      bar.reset();
      importer.reset();
      render();
    },
  });
}
