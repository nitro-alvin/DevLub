/** Toast notifications (confirmation + friendly errors). */

import { icons } from './icons.js';

const VISIBLE_MS = 2200;
let toastNode = null;
let hideTimer = null;

function node() {
  if (!toastNode) toastNode = document.getElementById('toast');
  return toastNode;
}

/** Eagerly resolve the toast element during app startup. */
export function initToast() {
  node();
}

export function showToast(message, { type = 'success' } = {}) {
  const el = node();
  if (!el) return;
  const glyph = type === 'error' ? icons.alert : icons.check;
  el.innerHTML = '<span class="toast-icon">' + glyph + '</span><span class="toast-text"></span>';
  el.querySelector('.toast-text').textContent = message;
  el.setAttribute('data-type', type);
  el.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove('show'), VISIBLE_MS);
}
