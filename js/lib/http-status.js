/** Built-in HTTP status code reference — no network involved. */

export const STATUS_GROUPS = [
  { id: '1', label: '1xx — Informational' },
  { id: '2', label: '2xx — Success' },
  { id: '3', label: '3xx — Redirection' },
  { id: '4', label: '4xx — Client error' },
  { id: '5', label: '5xx — Server error' },
];

const G = (code) => Math.floor(code / 100);

export const STATUS_CODES = [
  { code: 100, name: 'Continue', description: 'The server received the request headers and the client should send the body.' },
  { code: 101, name: 'Switching Protocols', description: 'The server is switching protocols as the client requested (for example, to WebSocket).' },
  { code: 102, name: 'Processing', description: 'The server accepted the request but has not finished processing it (WebDAV).' },
  { code: 103, name: 'Early Hints', description: 'The server sends preliminary headers before the final response so the client can preload assets.' },

  { code: 200, name: 'OK', description: 'The request succeeded and the response contains the requested data.' },
  { code: 201, name: 'Created', description: 'The request succeeded and a new resource was created, usually with a Location header.' },
  { code: 202, name: 'Accepted', description: 'The request was accepted for processing but the work is not finished yet.' },
  { code: 203, name: 'Non-Authoritative Information', description: 'The response came from a transforming proxy, not the origin server.' },
  { code: 204, name: 'No Content', description: 'The request succeeded but there is no body to return.' },
  { code: 205, name: 'Reset Content', description: 'The client should reset the document view that sent the request.' },
  { code: 206, name: 'Partial Content', description: 'The server returned only part of the resource, as requested by a Range header.' },
  { code: 207, name: 'Multi-Status', description: 'The response contains multiple independent status codes (WebDAV).' },
  { code: 208, name: 'Already Reported', description: 'Members of a WebDAV binding were already reported in a previous response.' },
  { code: 226, name: 'IM Used', description: 'The server fulfilled the request using instance manipulations (delta encoding).' },

  { code: 300, name: 'Multiple Choices', description: 'The request has several possible responses; the client should choose one.' },
  { code: 301, name: 'Moved Permanently', description: 'The resource has moved permanently; clients and search engines should update their links.' },
  { code: 302, name: 'Found', description: 'The resource is temporarily available at a different URL.' },
  { code: 303, name: 'See Other', description: 'The client should fetch another URL with a GET request, often after a POST.' },
  { code: 304, name: 'Not Modified', description: 'The cached copy is still valid, so no body is sent.' },
  { code: 305, name: 'Use Proxy', description: 'The resource must be accessed through the given proxy (deprecated).' },
  { code: 307, name: 'Temporary Redirect', description: 'Like 302, but the method and body must not be changed on the redirect.' },
  { code: 308, name: 'Permanent Redirect', description: 'Like 301, but the method and body must not be changed on the redirect.' },

  { code: 400, name: 'Bad Request', description: 'The server cannot process the request because the syntax is invalid.' },
  { code: 401, name: 'Unauthorized', description: 'Authentication is required, or the supplied credentials are invalid.' },
  { code: 402, name: 'Payment Required', description: 'Reserved for future use; some APIs use it for quota or billing problems.' },
  { code: 403, name: 'Forbidden', description: 'The server understood the request but refuses to authorize it.' },
  { code: 404, name: 'Not Found', description: 'The server cannot find the requested resource.' },
  { code: 405, name: 'Method Not Allowed', description: 'The resource exists but does not support the HTTP method used.' },
  { code: 406, name: 'Not Acceptable', description: 'No representation matches the Accept headers sent by the client.' },
  { code: 407, name: 'Proxy Authentication Required', description: 'The client must authenticate with the proxy first.' },
  { code: 408, name: 'Request Timeout', description: 'The server timed out waiting for the request.' },
  { code: 409, name: 'Conflict', description: 'The request conflicts with the current state of the resource.' },
  { code: 410, name: 'Gone', description: 'The resource used to exist but has been permanently removed.' },
  { code: 411, name: 'Length Required', description: 'The request must include a Content-Length header.' },
  { code: 412, name: 'Precondition Failed', description: 'A conditional header such as If-Match did not evaluate to true.' },
  { code: 413, name: 'Payload Too Large', description: 'The request body exceeds the size the server is willing to accept.' },
  { code: 414, name: 'URI Too Long', description: 'The requested URL is longer than the server will process.' },
  { code: 415, name: 'Unsupported Media Type', description: 'The request body format is not supported by the server.' },
  { code: 416, name: 'Range Not Satisfiable', description: 'The Range header asks for a range outside the resource.' },
  { code: 417, name: 'Expectation Failed', description: 'The server cannot meet the Expect header of the request.' },
  { code: 418, name: "I'm a teapot", description: 'An April Fools code: the server is a teapot and cannot brew coffee.' },
  { code: 421, name: 'Misdirected Request', description: 'The request reached a server that cannot produce a response for that authority.' },
  { code: 422, name: 'Unprocessable Entity', description: 'The request is well formed but fails validation (WebDAV).' },
  { code: 423, name: 'Locked', description: 'The resource is locked by another request (WebDAV).' },
  { code: 424, name: 'Failed Dependency', description: 'The request failed because a dependent request failed (WebDAV).' },
  { code: 425, name: 'Too Early', description: 'The server is unwilling to risk processing a replay-prone early request.' },
  { code: 426, name: 'Upgrade Required', description: 'The client must switch to a different protocol, such as TLS or HTTP/2.' },
  { code: 428, name: 'Precondition Required', description: 'The origin server requires a conditional request to avoid lost updates.' },
  { code: 429, name: 'Too Many Requests', description: 'The client sent too many requests in a given time (rate limiting).' },
  { code: 431, name: 'Request Header Fields Too Large', description: 'A header or the header block is too large for the server to process.' },
  { code: 451, name: 'Unavailable For Legal Reasons', description: 'The resource is blocked for legal reasons such as a government order.' },

  { code: 500, name: 'Internal Server Error', description: 'The server hit an unexpected condition and could not complete the request.' },
  { code: 501, name: 'Not Implemented', description: 'The server does not support the functionality the request requires.' },
  { code: 502, name: 'Bad Gateway', description: 'A gateway or proxy received an invalid response from an upstream server.' },
  { code: 503, name: 'Service Unavailable', description: 'The server is overloaded or under maintenance; try again later.' },
  { code: 504, name: 'Gateway Timeout', description: 'A gateway or proxy did not get a timely response from an upstream server.' },
  { code: 505, name: 'HTTP Version Not Supported', description: 'The server does not support the HTTP version used in the request.' },
  { code: 506, name: 'Variant Also Negotiates', description: 'Content negotiation for the resource is configured incorrectly.' },
  { code: 507, name: 'Insufficient Storage', description: 'The server cannot store the representation needed to complete the request.' },
  { code: 508, name: 'Loop Detected', description: 'The server detected an infinite loop while processing the request (WebDAV).' },
  { code: 510, name: 'Not Extended', description: 'Further extensions to the request are required for the server to fulfil it.' },
  { code: 511, name: 'Network Authentication Required', description: 'The client must authenticate to gain network access (for example, a Wi-Fi portal).' },
].map((entry) => ({ ...entry, group: G(entry.code) }));

/** The display label for a status code's 1xx–5xx group. */
export function groupLabel(group) {
  const found = STATUS_GROUPS.find((item) => item.id === String(group));
  return found ? found.label : 'Other';
}

/** Filter the reference by a free-text query and an optional 1–5 group. */
export function filterStatusCodes(query, group = 'all') {
  const needle = String(query == null ? '' : query).trim().toLowerCase();
  return STATUS_CODES.filter((entry) => {
    if (group !== 'all' && String(entry.group) !== String(group)) return false;
    if (!needle) return true;
    return String(entry.code).includes(needle)
      || entry.name.toLowerCase().includes(needle)
      || entry.description.toLowerCase().includes(needle);
  });
}
