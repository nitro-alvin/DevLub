/**
 * Pure helpers for the shared file import / download features.
 * No DOM and no I/O here, so everything stays easy to unit-test.
 */

/** Import ceiling — generous for text, small enough to stay smooth on a phone. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Text formats a document-style tool (Text Counter) accepts. */
export const DOCUMENT_EXTENSIONS = ['txt', 'md', 'csv'];

/** Text-ish data formats the code-style tools accept. */
export const DATA_EXTENSIONS = ['txt', 'json', 'csv', 'md', 'sql', 'log'];

/** Human-readable size, e.g. 1536 -> "1.5 KB". */
export function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size < 1024) return size + ' B';
  const units = ['KB', 'MB', 'GB'];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return rounded + ' ' + units[unit];
}

/** Lowercase extension without the dot: "Report.JSON" -> "json". */
export function extensionOf(name) {
  const match = String(name == null ? '' : name).match(/\.([A-Za-z0-9]+)\s*$/);
  return match ? match[1].toLowerCase() : '';
}

/** ".txt, .md or .csv" — for friendly error messages. */
export function describeExtensions(extensions = []) {
  const parts = extensions.map((ext) => '.' + String(ext).replace(/^\./, '').toLowerCase());
  if (parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + ' or ' + parts[parts.length - 1];
}

/** Build the file picker's `accept` attribute from a list of extensions. */
export function acceptAttribute(extensions = []) {
  const list = extensions.map((ext) => '.' + String(ext).replace(/^\./, '').toLowerCase());
  if (list.includes('.json')) list.push('application/json');
  return list.join(',');
}

/**
 * Check a picked File against the tool's allow-list and the size limit.
 * Returns { ok: true } or { ok: false, error } with a message ready to show.
 */
export function validateFile(file, { accept = [], maxBytes = MAX_FILE_BYTES } = {}) {
  if (!file || typeof file !== 'object') return { ok: false, error: 'No file was selected.' };
  const name = typeof file.name === 'string' ? file.name : '';
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: 'That file is empty — there is nothing to import.' };
  }
  if (size > maxBytes) {
    return {
      ok: false,
      error: 'That file is ' + formatFileSize(size) + '. Choose a file under ' + formatFileSize(maxBytes) + '.',
    };
  }
  if (accept.length) {
    const ext = extensionOf(name);
    const mime = String(file.type == null ? '' : file.type).toLowerCase();
    const textish = mime === 'application/json' || mime.startsWith('text/');
    // Accept a known extension, or a text-ish MIME type when there is no extension.
    if (!accept.includes(ext) && !(ext === '' && textish)) {
      return { ok: false, error: 'Unsupported file type. Choose a ' + describeExtensions(accept) + ' file.' };
    }
  }
  return { ok: true };
}

/**
 * Make an untrusted filename safe to display and to write to disk.
 * Strips path separators (traversal), control characters and characters that
 * break common filesystems, and caps the length.
 */
export function safeFileName(name) {
  return String(name == null ? '' : name)
    .replace(/[\\/]+/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim()
    .slice(0, 120);
}

/** "data.json" -> "data" (falls back to "download"). */
export function baseName(name) {
  return safeFileName(name).replace(/\.[A-Za-z0-9]+$/, '') || 'download';
}

/**
 * Build a suggested download name from the source file and the operation:
 * ("data.json", { suffix: 'formatted', ext: 'json' }) -> "data-formatted.json".
 * Without a source name it uses `fallbackBase`.
 */
export function suggestFileName(sourceName, { suffix = '', ext = 'txt', fallbackBase = 'download' } = {}) {
  const base = sourceName ? baseName(sourceName) : fallbackBase;
  const middle = suffix ? '-' + String(suffix).replace(/^[-\s]+/, '') : '';
  const stem = safeFileName(base + middle) || fallbackBase;
  const cleanExt = String(ext).replace(/^\./, '').replace(/[^A-Za-z0-9]/g, '').toLowerCase() || 'txt';
  return stem + '.' + cleanExt;
}
