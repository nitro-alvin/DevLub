/** Tool 19 — QR Code Generator (fully client-side). */

import { createQr, createQrSvg, drawQrToCanvas, QR_LEVELS, QR_LEVEL_INFO, QR_SIZES } from '../lib/qr.js';
import { formatBytes, baseName } from '../lib/files.js';
import { downloadBlob, downloadText } from '../file-download.js';
import { showToast } from '../toast.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';

const DEFAULTS = { size: '512', level: 'M', margin: 4 };

function sizeOptions() {
  return QR_SIZES.map(
    (size) =>
      '<option value="' + size + '"' + (String(size) === DEFAULTS.size ? ' selected' : '') + '>' +
      size + ' × ' + size + ' px</option>',
  ).join('');
}

function levelOptions() {
  return QR_LEVELS.map(
    (level) =>
      '<option value="' + level + '"' + (level === DEFAULTS.level ? ' selected' : '') + '>' +
      QR_LEVEL_INFO[level].label + '</option>',
  ).join('');
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The QR image could not be prepared for download.'));
    }, 'image/png');
  });
}

export function mountQrTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'QR Code Generator',
      description:
        'Turn a URL, plain text, email address, phone number or GitHub link into a scannable QR code. Everything is generated on this device.',
    }) +
    fileImportMarkup({
      id: 'qr-file',
      extensions: ['txt'],
      hint: 'Import a .txt file to place its contents in the text box — you can edit it before generating.',
    }) +
    '<div>' +
    '<label class="field-label" for="qr-input">Text, URL or contact details</label>' +
    '<textarea class="code-input" id="qr-input" rows="6" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="Paste a URL here\nhello@example.com\n+1 555 0100\nAny plain text works too."></textarea>' +
    '<p class="field-hint">URLs, emails, phone numbers and Unicode text are encoded as UTF-8.</p>' +
    '</div>' +
    '<div class="options-grid">' +
    '<div>' +
    '<label class="field-label" for="qr-size">QR size</label>' +
    '<select class="select-input qr-select" id="qr-size">' + sizeOptions() + '</select>' +
    '<p class="field-hint">Dense codes may be enlarged slightly so every module stays square and scannable.</p>' +
    '</div>' +
    '<div>' +
    '<label class="field-label" for="qr-level">Error correction</label>' +
    '<select class="select-input qr-select" id="qr-level">' + levelOptions() + '</select>' +
    '</div>' +
    '<div class="option-wide">' +
    '<label class="field-label" for="qr-margin">Quiet zone (margin): ' +
    '<span class="range-value" id="qr-margin-value">' + DEFAULTS.margin + '</span> modules</label>' +
    '<input class="range-input" id="qr-margin" type="range" min="0" max="8" step="1" value="' +
    DEFAULTS.margin + '">' +
    '<p class="field-hint">Four modules is the standard quiet zone and scans most reliably.</p>' +
    '</div>' +
    '</div>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="generate">' +
    icons.check + '<span>Generate QR Code</span></button>' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    errorBox() +
    '<section class="qr-result" id="qr-result" aria-live="polite" hidden>' +
    '<div class="qr-preview"><canvas id="qr-canvas" width="512" height="512" aria-label="Generated QR code"></canvas></div>' +
    '<p class="qr-meta" id="qr-meta"></p>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="downloadPng">' +
    icons.download + '<span>Download PNG</span></button>' +
    '<button type="button" class="btn" data-action="downloadSvg">' +
    icons.download + '<span>Download SVG</span></button>' +
    '<button type="button" class="btn" data-action="copyImage">' +
    icons.copy + '<span>Copy image</span></button>' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    '</section>';

  const input = qs(section, '#qr-input');
  const sizeSelect = qs(section, '#qr-size');
  const levelSelect = qs(section, '#qr-level');
  const marginInput = qs(section, '#qr-margin');
  const marginValue = qs(section, '#qr-margin-value');
  const errorBoxEl = qs(section, '.error-box');
  const resultBox = qs(section, '#qr-result');
  const canvas = qs(section, '#qr-canvas');
  const meta = qs(section, '#qr-meta');

  let lastQr = null;
  let lastRender = null;

  const importer = createFileImport(section, {
    id: 'qr-file',
    extensions: ['txt'],
    onText: (text) => {
      input.value = text;
      hideResult();
      clearError(errorBoxEl);
      input.focus();
      showToast('Text file loaded — edit it, then generate.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function hideResult() {
    lastQr = null;
    lastRender = null;
    resultBox.hidden = true;
  }

  function fileBase() {
    return (importer.fileName ? baseName(importer.fileName) : '') || 'qr-code';
  }

  function generate() {
    const text = input.value;
    const level = levelSelect.value;
    const size = Number(sizeSelect.value);
    const margin = Number(marginInput.value);
    const qr = createQr(text, { errorCorrectionLevel: level });

    if (!qr.ok) {
      hideResult();
      showError(errorBoxEl, qr.error);
      return;
    }

    try {
      const outputSize = drawQrToCanvas(canvas, qr, { size, margin });
      clearError(errorBoxEl);
      lastQr = qr;
      lastRender = { size, margin, level };
      meta.textContent =
        'Version ' + qr.version + ' · ' + qr.moduleCount + ' × ' + qr.moduleCount +
        ' modules · ' + outputSize + ' px · level ' + qr.errorCorrectionLevel +
        ' · ' + formatBytes(qr.byteLength) + ' of text';
      resultBox.hidden = false;
      showToast('QR code generated');
    } catch (error) {
      hideResult();
      showError(errorBoxEl, error instanceof Error ? error.message : 'The QR code could not be drawn.');
    }
  }

  async function downloadPng() {
    if (!lastQr) {
      showError(errorBoxEl, 'Generate a QR code first, then download it.');
      return;
    }
    try {
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, fileBase() + '.png');
    } catch (error) {
      showError(errorBoxEl, error instanceof Error ? error.message : 'The PNG could not be created.');
    }
  }

  function downloadSvg() {
    if (!lastQr || !lastRender) {
      showError(errorBoxEl, 'Generate a QR code first, then download it.');
      return;
    }
    const svg = createQrSvg(lastQr, lastRender);
    downloadText(svg, fileBase() + '.svg', 'image/svg+xml;charset=utf-8');
  }

  async function copyImage() {
    if (!lastQr) {
      showError(errorBoxEl, 'Generate a QR code first, then copy it.');
      return;
    }
    if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' ||
      typeof window.ClipboardItem !== 'function') {
      showToast('This browser cannot copy images — download the PNG instead.', { type: 'error' });
      return;
    }
    try {
      // Build the item synchronously so the user gesture is still active.
      const item = new ClipboardItem({ 'image/png': canvasToBlob(canvas) });
      await navigator.clipboard.write([item]);
      showToast('QR image copied');
    } catch {
      showToast('Copying the image was blocked — download the PNG instead.', { type: 'error' });
    }
  }

  function clearAll() {
    input.value = '';
    sizeSelect.value = DEFAULTS.size;
    levelSelect.value = DEFAULTS.level;
    marginInput.value = String(DEFAULTS.margin);
    marginValue.textContent = String(DEFAULTS.margin);
    importer.reset();
    hideResult();
    clearError(errorBoxEl);
    input.focus();
  }

  input.addEventListener('input', () => {
    clearError(errorBoxEl);
    hideResult();
  });

  marginInput.addEventListener('input', () => {
    marginValue.textContent = marginInput.value;
    if (!resultBox.hidden && input.value.trim()) generate();
  });

  for (const select of [sizeSelect, levelSelect]) {
    select.addEventListener('change', () => {
      if (!resultBox.hidden && input.value.trim()) generate();
    });
  }

  bindActions(section, {
    back: goBack,
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      input.value = '';
      hideResult();
      clearError(errorBoxEl);
    },
    generate,
    downloadPng: () => { downloadPng(); },
    downloadSvg,
    copyImage: () => { copyImage(); },
    clear: clearAll,
  });
}
