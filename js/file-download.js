/**
 * Shared "Download result" control: an editable file name plus a button.
 * The file is built in memory with Blob + object URLs and handed straight to
 * the browser — nothing is uploaded, and the original file is never touched.
 */

import { icons } from './icons.js';
import { showToast } from './toast.js';
import { safeFileName } from './lib/files.js';

/**
 * Markup for a download control. `id` must be unique across the page.
 * The block starts hidden and is revealed once a tool has a result.
 */
export function downloadMarkup({ id, label = 'File name', hint = '' }) {
  return (
    '<div class="download-bar" data-download-bar hidden>' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<div class="field-input-group">' +
    '<input class="code-input" id="' + id + '" type="text" autocomplete="off" spellcheck="false" ' +
    'autocapitalize="off" enterkeyhint="done">' +
    '<button type="button" class="btn" data-action="download">' +
    icons.download + '<span>Download</span></button>' +
    '</div>' +
    (hint ? '<p class="field-hint">' + hint + '</p>' : '') +
    '</div>'
  );
}

/** Trigger a text download with the given filename. Returns true when sent. */
export function downloadText(text, fileName) {
  if (text == null || text === '') {
    showToast('There is nothing to download yet', { type: 'error' });
    return false;
  }
  const name = safeFileName(fileName) || 'download.txt';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Release the object URL once the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Downloaded ' + name);
  return true;
}

/**
 * Wire a download control. `defaultName` seeds the field; a tool calls
 * `show(suggested)` with an operation-specific name once it has a result.
 * A name the user has edited is never overwritten by a new suggestion.
 */
export function createDownloadBar(section, { id, defaultName }) {
  const bar = section.querySelector('[data-download-bar]');
  const nameInput = section.querySelector('#' + id);
  let suggestion = defaultName;
  let edited = false;

  nameInput.value = defaultName;
  nameInput.addEventListener('input', () => {
    edited = nameInput.value.trim() !== suggestion;
  });

  return {
    show(suggestedName) {
      if (suggestedName) {
        suggestion = suggestedName;
        if (!edited) nameInput.value = suggestedName;
      }
      if (bar) bar.hidden = false;
    },
    hide() {
      if (bar) bar.hidden = true;
    },
    get name() {
      return nameInput.value.trim() || defaultName;
    },
    reset(suggestedName = defaultName) {
      edited = false;
      suggestion = suggestedName;
      nameInput.value = suggestedName;
      if (bar) bar.hidden = true;
    },
  };
}
