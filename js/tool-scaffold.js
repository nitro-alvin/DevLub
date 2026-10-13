/** Shared markup builders so every tool view looks and behaves the same. */

import { icons } from './icons.js';

export function toolHead({ title, description }) {
  return (
    '<header class="view-head">' +
    '<button type="button" class="btn btn-back" data-action="back">' +
    icons.back + '<span>Back</span>' +
    '</button>' +
    '<div>' +
    '<h2 class="view-title" tabindex="-1" data-view-heading>' + title + '</h2>' +
    '<p class="view-desc">' + description + '</p>' +
    '</div>' +
    '</header>'
  );
}

export function errorBox() {
  return '<div class="error-box" role="alert" hidden></div>';
}

/** Standard output area + Copy / Clear action row used by several tools. */
export function outputSection({ id, label, placeholder, extraButtons = '' }) {
  return (
    '<section class="output-section">' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<textarea class="code-input" id="' + id + '" rows="8" readonly spellcheck="false" ' +
    'placeholder="' + placeholder + '"></textarea>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="copy">' + icons.copy + '<span>Copy</span></button>' +
    extraButtons +
    '<button type="button" class="btn" data-action="clear">' + icons.trash + '<span>Clear</span></button>' +
    '</div>' +
    '</section>'
  );
}
