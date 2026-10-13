/** Copy-to-clipboard with a fallback for browsers without the async API. */

import { showToast } from './toast.js';

function fallbackCopy(text) {
  const scratch = document.createElement('textarea');
  scratch.value = text;
  scratch.setAttribute('readonly', '');
  scratch.style.position = 'fixed';
  scratch.style.top = '-1000px';
  document.body.appendChild(scratch);
  scratch.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  scratch.remove();
  return ok;
}

/**
 * Copy `text` to the clipboard and confirm with a toast.
 * Returns true when the copy succeeded.
 */
export async function copyToClipboard(text, successMessage = 'Copied to clipboard') {
  if (!text) {
    showToast('Nothing to copy yet', { type: 'error' });
    return false;
  }
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    ok = false; // permission denied or insecure context: try the fallback
  }
  if (!ok) ok = fallbackCopy(text);
  showToast(ok ? successMessage : 'Copy failed — select the text and copy manually', {
    type: ok ? 'success' : 'error',
  });
  return ok;
}
