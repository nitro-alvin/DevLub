/** Small DOM helpers shared by the shell and every tool view. */

import { showToast } from './toast.js';

export function qs(root, selector) {
  const node = root.querySelector(selector);
  if (!node) throw new Error('Missing expected element: ' + selector);
  return node;
}

export function showError(box, message) {
  box.textContent = message;
  box.hidden = false;
}

export function clearError(box) {
  box.hidden = true;
  box.textContent = '';
}

/** Reset one or more fields, then (optionally) focus the first one. */
export function clearFields(fields, { focusFirst = true } = {}) {
  for (const field of fields) field.value = '';
  if (focusFirst && fields[0]) fields[0].focus();
}

/**
 * Wire every `[data-action="name"]` button inside `root` to a handler.
 * Unexpected failures surface as a toast instead of breaking the page.
 */
export function bindActions(root, handlers) {
  root.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || !root.contains(target)) return;
    const handler = handlers[target.dataset.action];
    if (!handler) return;
    event.preventDefault();
    try {
      handler(target, event);
    } catch (error) {
      console.error(error);
      showToast('Something went wrong. Please try again.', { type: 'error' });
    }
  });
}
