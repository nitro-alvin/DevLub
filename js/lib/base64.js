/** Unicode-safe Base64 encode/decode (handles Malayalam, emoji, etc.). */

const CHUNK_SIZE = 0x8000; // avoid blowing the argument limit of fromCharCode

export function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

export function decodeBase64(value) {
  const compact = String(value).replace(/\s+/g, '');
  if (!compact) return '';
  const core = compact.replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(core)) {
    throw new Error('Invalid Base64: it contains characters outside the Base64 alphabet.');
  }
  if (core.length % 4 === 1) {
    throw new Error('Invalid Base64: the length of the text is not valid.');
  }
  const padded = core + '='.repeat((4 - (core.length % 4)) % 4);
  let binary;
  try {
    binary = atob(padded);
  } catch {
    throw new Error('Invalid Base64: the text could not be decoded.');
  }
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('The decoded bytes are not valid UTF-8 text.');
  }
}
