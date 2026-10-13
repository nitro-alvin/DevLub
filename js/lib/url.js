/** URL (percent) encoding helpers built on the browser's own functions. */

export function encodeUrl(text) {
  return encodeURIComponent(text);
}

export function decodeUrl(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    throw new Error('Invalid URL encoding: the % sequences are incomplete or malformed.');
  }
}
