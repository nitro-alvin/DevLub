/**
 * Shared "Choose file" control used by the text-based tools.
 * The picked file is read locally with FileReader — its contents are never
 * uploaded, never stored, and never executed.
 */

import { icons } from './icons.js';
import { showToast } from './toast.js';
import { MAX_FILE_BYTES, formatFileSize, validateFile, acceptAttribute, safeFileName } from './lib/files.js';

/**
 * Markup for an import control. `id` must be unique across the page.
 * `extensions` drives the picker's accept filter and validation.
 */
export function fileImportMarkup({ id, extensions, hint = '' }) {
  const note = (hint ? hint + ' ' : '') +
    'Files up to ' + formatFileSize(MAX_FILE_BYTES) + ' are read on your device.';
  return (
    '<div class="file-import">' +
    '<input class="visually-hidden" type="file" id="' + id + '" ' +
    'accept="' + acceptAttribute(extensions) + '" tabindex="-1" data-file-input>' +
    '<div class="actions file-actions">' +
    '<button type="button" class="btn" data-action="chooseFile">' + icons.file + '<span>Choose file</span></button>' +
    '<button type="button" class="btn" data-action="removeFile" hidden>' +
    icons.trash + '<span>Remove file</span></button>' +
    '</div>' +
    '<p class="file-info" data-file-info hidden></p>' +
    '<p class="field-hint">' + note + '</p>' +
    '</div>'
  );
}

/** Read a File as UTF-8 text. */
export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result == null ? '' : reader.result));
    reader.onerror = () => reject(new Error('That file could not be read. Try another file.'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Wire an import control inside `section`.
 * `onText(text, file)` runs with the decoded contents once a valid file loads.
 * `onError(message)` receives a friendly message for empty/invalid files.
 * Returns a small controller so the tool can reset or remove the file.
 */
export function createFileImport(section, { id, extensions, onText, onError, maxBytes = MAX_FILE_BYTES }) {
  const input = section.querySelector('#' + id);
  const info = section.querySelector('[data-file-info]');
  const removeBtn = section.querySelector('[data-action="removeFile"]');
  let current = null;

  function render() {
    if (!current) {
      if (info) {
        info.hidden = true;
        info.textContent = '';
      }
      if (removeBtn) removeBtn.hidden = true;
      return;
    }
    if (info) {
      // textContent, never innerHTML: a filename is untrusted input.
      info.textContent = 'Loaded ' + safeFileName(current.name) + ' · ' + formatFileSize(current.size);
      info.hidden = false;
    }
    if (removeBtn) removeBtn.hidden = false;
  }

  async function handle(file) {
    const check = validateFile(file, { accept: extensions, maxBytes });
    if (!check.ok) {
      current = null;
      input.value = '';
      render();
      onError(check.error);
      return;
    }
    try {
      const text = await readFileText(file);
      current = file;
      render();
      onText(text, file);
    } catch (error) {
      current = null;
      input.value = '';
      render();
      onError(error instanceof Error ? error.message : 'That file could not be read.');
    }
  }

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (file) handle(file);
  });

  return {
    choose() {
      input.click();
    },
    /** Forget the file and clear the picker (the tool clears its own field). */
    remove() {
      const label = current ? safeFileName(current.name) : '';
      current = null;
      input.value = '';
      render();
      if (label) showToast('Removed ' + label);
    },
    get file() {
      return current;
    },
    get fileName() {
      return current ? current.name : '';
    },
    reset() {
      current = null;
      input.value = '';
      render();
    },
  };
}
