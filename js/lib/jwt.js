/**
 * Decode a JSON Web Token's header and payload. Decoding only — this never
 * checks or verifies the signature, so a decoded token is not proof of trust.
 */

import { decodeBase64 } from './base64.js';

export const REGISTERED_CLAIMS = {
  iss: 'Issuer — who created and signed the token',
  sub: 'Subject — who the token is about',
  aud: 'Audience — who the token is intended for',
  exp: 'Expiration time (seconds since the Unix epoch)',
  nbf: 'Not before — the token is not valid before this time',
  iat: 'Issued at (seconds since the Unix epoch)',
  jti: 'JWT ID — a unique identifier for this token',
  scope: 'Scope — the permissions the token grants',
  azp: 'Authorized party — the client the token was issued to',
};

function decodeSegment(segment, label) {
  // JWTs use Base64URL: "-" and "_" replace "+" and "/".
  const normalized = String(segment).replace(/-/g, '+').replace(/_/g, '/');
  let json;
  try {
    json = decodeBase64(normalized);
  } catch {
    throw new Error('The ' + label + ' is not valid Base64URL data.');
  }
  try {
    const value = JSON.parse(json);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('not an object');
    }
    return value;
  } catch {
    throw new Error('The ' + label + ' does not contain a valid JSON object.');
  }
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function describeTime(seconds, now) {
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return {
    value: seconds,
    iso: date.toISOString(),
    local: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' }).format(date),
    relative: describeRelative(date, now),
  };
}

function describeRelative(date, now) {
  const diffMs = date.getTime() - now;
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const units = [
    ['day', 86400000], ['hour', 3600000], ['minute', 60000], ['second', 1000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') {
      const count = Math.max(1, Math.round(abs / ms));
      return count + ' ' + unit + (count === 1 ? '' : 's') + (past ? ' ago' : ' from now');
    }
  }
  return 'now';
}

/** Make any claim value safe and readable in the UI. */
export function formatClaimValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Decode `token`.
 * Returns { ok: false, empty } for blank input, { ok: false, error } for an
 * invalid token, or { ok: true, ...decoded pieces } on success.
 */
export function decodeJwt(token, now = Date.now()) {
  const text = String(token == null ? '' : token).trim();
  if (!text) return { ok: false, empty: true };

  const parts = text.split('.');
  if (parts.length !== 3) {
    return { ok: false, error: 'A JWT has three parts separated by dots (header.payload.signature) — this has ' + parts.length + '.' };
  }
  if (!parts[0] || !parts[1]) {
    return { ok: false, error: 'The JWT header or payload segment is empty.' };
  }

  let header;
  let payload;
  try {
    header = decodeSegment(parts[0], 'header');
  } catch (error) {
    return { ok: false, error: error.message };
  }
  try {
    payload = decodeSegment(parts[1], 'payload');
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const claims = Object.keys(payload).map((name) => ({
    name,
    value: payload[name],
    display: formatClaimValue(payload[name]),
    description: REGISTERED_CLAIMS[name] || 'Custom claim',
    standard: Boolean(REGISTERED_CLAIMS[name]),
  }));

  const expSeconds = numberOrNull(payload.exp);
  const exp = expSeconds === null ? null : describeTime(expSeconds, now);
  const expired = exp ? exp.value * 1000 <= now : null;

  return {
    ok: true,
    header,
    payload,
    headerJson: JSON.stringify(header, null, 2),
    payloadJson: JSON.stringify(payload, null, 2),
    algorithm: typeof header.alg === 'string' ? header.alg : null,
    type: typeof header.typ === 'string' ? header.typ : null,
    kid: typeof header.kid === 'string' ? header.kid : null,
    claims,
    exp: exp ? { ...exp, expired } : null,
    nbf: numberOrNull(payload.nbf) === null ? null : describeTime(payload.nbf, now),
    iat: numberOrNull(payload.iat) === null ? null : describeTime(payload.iat, now),
  };
}
