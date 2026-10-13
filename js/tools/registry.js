/** The list of tools shown on the home screen. */

import { mountJsonTool } from './json.js';
import { mountBase64Tool } from './base64.js';
import { mountUrlTool } from './url.js';
import { mountUuidTool } from './uuid.js';
import { mountCounterTool } from './counter.js';

export const tools = [
  {
    id: 'json',
    name: 'JSON Formatter',
    description: 'Pretty-print, minify and validate JSON with clear error messages.',
    keywords: ['format', 'pretty', 'minify', 'validate', 'parse', 'prettier'],
    badge: '{ }',
    mount: mountJsonTool,
  },
  {
    id: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode text to Base64 and back — Unicode and emoji safe.',
    keywords: ['base64', 'b64', 'encode', 'decode', 'binary'],
    badge: '64',
    mount: mountBase64Tool,
  },
  {
    id: 'url',
    name: 'URL Encoder / Decoder',
    description: 'Percent-encode URL text and query strings, or decode them.',
    keywords: ['url', 'uri', 'percent', 'encode', 'decode', 'query', 'escape'],
    badge: '%20',
    mount: mountUrlTool,
  },
  {
    id: 'uuid',
    name: 'UUID Generator',
    description: 'Create secure random UUID v4 values, one or a whole batch.',
    keywords: ['uuid', 'guid', 'random', 'id', 'generate', 'v4'],
    badge: 'UID',
    mount: mountUuidTool,
  },
  {
    id: 'counter',
    name: 'Text Counter',
    description: 'Characters, words, lines, sentences and UTF-8 bytes.',
    keywords: ['count', 'words', 'characters', 'length', 'bytes', 'statistics', 'wc'],
    badge: 'Aa',
    mount: mountCounterTool,
  },
];
