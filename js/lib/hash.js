/** SHA-256 hashing through the Web Crypto API. Runs entirely on-device. */

export const UNSUPPORTED_MESSAGE =
  'SHA-256 is not available here. Web Crypto only works in a secure context (HTTPS or localhost).';

export function isSha256Supported() {
  return Boolean(globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.subtle.digest);
}

/** Hash `text` and return the digest as lowercase hex. */
export async function sha256Hex(text) {
  if (!isSha256Supported()) throw new Error(UNSUPPORTED_MESSAGE);
  let digest;
  try {
    digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  } catch (error) {
    throw new Error('The browser could not compute the hash: ' + (error && error.message ? error.message : 'unknown error'));
  }
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
