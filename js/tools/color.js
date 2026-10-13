/** Colour Converter: HEX ⇄ RGB ⇄ HSL with a live preview. */

import { convertColor } from '../lib/color.js';
import { copyToClipboard } from '../clipboard.js';
import { icons } from '../icons.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

function fieldGroup({ id, label, placeholder }) {
  return (
    '<div class="field-group">' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<div class="field-input-group">' +
    '<input class="code-input" id="' + id + '" type="text" autocomplete="off" spellcheck="false" ' +
    'autocapitalize="off" placeholder="' + placeholder + '">' +
    '<button type="button" class="btn" data-action="copy' + label + '">' +
    icons.copy + '<span>Copy</span></button>' +
    '</div>' +
    '</div>'
  );
}

export function mountColorTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'Colour Converter',
      description: 'Type into any field — HEX, RGB and HSL stay in sync with a live preview of the colour.',
    }) +
    '<div class="color-preview" id="color-preview" role="img" aria-label="Colour preview, no colour selected">' +
    '<span class="color-preview-swatch" id="color-preview-swatch" aria-hidden="true"></span>' +
    '<span class="color-preview-label" id="color-preview-label">Pick a colour above</span>' +
    '</div>' +
    fieldGroup({ id: 'color-hex', label: 'HEX', placeholder: '#4c8dff' }) +
    fieldGroup({ id: 'color-rgb', label: 'RGB', placeholder: '76, 141, 255' }) +
    fieldGroup({ id: 'color-hsl', label: 'HSL', placeholder: '217, 100%, 65%' }) +
    errorBox() +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    downloadMarkup({ id: 'color-name', hint: 'Download the HEX, RGB and HSL values as a .txt file.' });

  const hexInput = qs(section, '#color-hex');
  const rgbInput = qs(section, '#color-rgb');
  const hslInput = qs(section, '#color-hsl');
  const errorBoxEl = qs(section, '.error-box');
  const preview = qs(section, '#color-preview');
  const swatch = qs(section, '#color-preview-swatch');
  const previewLabel = qs(section, '#color-preview-label');
  const fields = { hex: hexInput, rgb: rgbInput, hsl: hslInput };
  const bar = createDownloadBar(section, { id: 'color-name', defaultName: 'color.txt' });

  function resetPreview() {
    swatch.style.backgroundColor = '';
    previewLabel.textContent = 'Pick a colour above';
    preview.setAttribute('aria-label', 'Colour preview, no colour selected');
  }

  function updateFrom(format) {
    const source = fields[format];
    const others = Object.entries(fields).filter(([key]) => key !== format);
    if (!source.value.trim()) {
      for (const [, field] of others) field.value = '';
      resetPreview();
      clearError(errorBoxEl);
      bar.hide();
      return;
    }
    try {
      const result = convertColor(source.value, format);
      for (const [key, field] of others) field.value = result[key];
      swatch.style.backgroundColor = result.hex;
      previewLabel.textContent = result.hex;
      preview.setAttribute('aria-label', 'Colour preview ' + result.hex);
      clearError(errorBoxEl);
      bar.show('color.txt');
    } catch (error) {
      showError(errorBoxEl, error instanceof Error ? error.message : 'That colour could not be converted.');
      bar.hide();
    }
  }

  hexInput.addEventListener('input', () => updateFrom('hex'));
  rgbInput.addEventListener('input', () => updateFrom('rgb'));
  hslInput.addEventListener('input', () => updateFrom('hsl'));

  bindActions(section, {
    back: goBack,
    copyHEX: () => copyToClipboard(hexInput.value, 'HEX copied'),
    copyRGB: () => copyToClipboard(rgbInput.value, 'RGB copied'),
    copyHSL: () => copyToClipboard(hslInput.value, 'HSL copied'),
    download: () => {
      if (!hexInput.value) {
        showError(errorBoxEl, 'Enter a colour first, then download its values.');
        return;
      }
      const lines = [
        'Colour values',
        'HEX: ' + hexInput.value,
        'RGB: ' + rgbInput.value,
        'HSL: ' + hslInput.value,
      ];
      downloadText(lines.join('\n'), bar.name);
    },
    clear: () => {
      clearFields([hexInput, rgbInput, hslInput]);
      clearError(errorBoxEl);
      resetPreview();
      bar.reset();
    },
  });
}
