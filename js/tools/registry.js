/** The list of tools shown on the home screen. */

import { mountJsonTool } from './json.js';
import { mountBase64Tool } from './base64.js';
import { mountUrlTool } from './url.js';
import { mountUuidTool } from './uuid.js';
import { mountCounterTool } from './counter.js';
import { mountColorTool } from './color.js';
import { mountHashTool } from './hash.js';
import { mountTimestampTool } from './timestamp.js';
import { mountDiffTool } from './diff.js';
import { mountJwtTool } from './jwt.js';
import { mountRegexTool } from './regex.js';
import { mountSqlTool } from './sql.js';
import { mountJsonCsvTool } from './json2csv.js';
import { mountMarkdownTool } from './markdown.js';
import { mountHttpStatusTool } from './httpstatus.js';
import { mountCronTool } from './cron.js';
import { mountHtmlEntityTool } from './htmlentity.js';
import { mountBaseTool } from './base.js';
import { mountQrTool } from './qr.js';
import { mountMinifierTool } from './minifier.js';

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
  {
    id: 'color',
    name: 'Colour Converter',
    description: 'Convert HEX, RGB and HSL colour values with a live preview.',
    keywords: ['color', 'colour', 'hex', 'rgb', 'hsl', 'convert', 'preview', 'swatch', 'design'],
    badge: 'RGB',
    mount: mountColorTool,
  },
  {
    id: 'hash',
    name: 'SHA-256 Hash',
    description: 'Generate a SHA-256 hex digest from any text with Web Crypto.',
    keywords: ['sha', 'sha256', 'sha-256', 'hash', 'digest', 'checksum', 'webcrypto', 'fingerprint'],
    badge: 'SHA',
    mount: mountHashTool,
  },
  {
    id: 'timestamp',
    name: 'Unix Timestamp',
    description: 'Convert epoch timestamps to readable dates and back.',
    keywords: ['unix', 'epoch', 'timestamp', 'seconds', 'milliseconds', 'date', 'utc', 'time'],
    badge: 'UTC',
    mount: mountTimestampTool,
  },
  {
    id: 'diff',
    name: 'Diff Checker',
    description: 'Compare two texts or code files and highlight every added, removed and unchanged line.',
    keywords: ['diff', 'compare', 'changes', 'patch', 'merge', 'lines', 'git', 'original', 'modified'],
    badge: '±',
    mount: mountDiffTool,
  },
  {
    id: 'jwt',
    name: 'JWT Decoder',
    description: 'Read a JWT header, payload and claims locally — decoding only, never verification.',
    keywords: ['jwt', 'jws', 'token', 'decode', 'claims', 'bearer', 'auth', 'payload', 'header'],
    badge: 'JWT',
    mount: mountJwtTool,
  },
  {
    id: 'regex',
    name: 'Regex Tester',
    description: 'Test a regular expression with highlighted matches, positions and capture groups.',
    keywords: ['regex', 'regexp', 'pattern', 'match', 'groups', 'test', 'flags', 'capture'],
    badge: '.*',
    mount: mountRegexTool,
  },
  {
    id: 'sql',
    name: 'SQL Formatter',
    description: 'Indent, line-break or minify SQL text. Never executed and never uploaded.',
    keywords: ['sql', 'query', 'format', 'beautify', 'minify', 'select', 'database', 'indent'],
    badge: 'SQL',
    mount: mountSqlTool,
  },
  {
    id: 'json2csv',
    name: 'JSON → CSV',
    description: 'Convert a JSON array of objects into properly escaped CSV.',
    keywords: ['json', 'csv', 'convert', 'export', 'spreadsheet', 'table', 'rows', 'columns'],
    badge: 'CSV',
    mount: mountJsonCsvTool,
  },
  {
    id: 'markdown',
    name: 'Markdown Previewer',
    description: 'Write Markdown and see a live, sanitized HTML preview as you type.',
    keywords: ['markdown', 'md', 'preview', 'html', 'readme', 'editor', 'render', 'tables'],
    badge: 'MD',
    mount: mountMarkdownTool,
  },
  {
    id: 'httpstatus',
    name: 'HTTP Status Lookup',
    description: 'Search HTTP status codes 1xx–5xx with plain-English explanations, fully offline.',
    keywords: ['http', 'status', 'code', '404', '500', 'response', 'api', 'rest', 'error'],
    badge: '404',
    mount: mountHttpStatusTool,
  },
  {
    id: 'cron',
    name: 'Cron Helper',
    description: 'Explain a cron expression field by field in plain English.',
    keywords: ['cron', 'crontab', 'schedule', 'expression', 'job', 'timer', 'interval'],
    badge: 'CRON',
    mount: mountCronTool,
  },
  {
    id: 'htmlentity',
    name: 'HTML Entity Converter',
    description: 'Encode text into HTML entities or decode them back, including Unicode.',
    keywords: ['html', 'entity', 'entities', 'encode', 'decode', 'escape', 'amp', 'unicode'],
    badge: '&amp;',
    mount: mountHtmlEntityTool,
  },
  {
    id: 'base',
    name: 'Number Base Converter',
    description: 'Convert between binary, octal, decimal and hex with exact BigInt maths.',
    keywords: ['binary', 'octal', 'decimal', 'hex', 'hexadecimal', 'base', 'convert', 'radix', 'bit'],
    badge: '0x',
    mount: mountBaseTool,
  },
  {
    id: 'qr',
    name: 'QR Code Generator',
    description: 'Create scannable QR codes from URLs, text, emails or phone numbers — all on your device.',
    keywords: ['qr', 'qrcode', 'barcode', 'scan', 'url', 'link', 'contact', 'email', 'phone', 'share', 'png', 'svg'],
    badge: 'QR',
    mount: mountQrTool,
  },
  {
    id: 'minifier',
    name: 'HTML / CSS / JS Minifier',
    description: 'Minify HTML, CSS or JavaScript and see exactly how many bytes you saved.',
    keywords: ['minify', 'minifier', 'compress', 'html', 'css', 'javascript', 'js', 'whitespace', 'comments', 'size'],
    badge: 'MIN',
    mount: mountMinifierTool,
  },
];
