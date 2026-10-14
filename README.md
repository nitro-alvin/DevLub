# Pocket DevTools

A fast, mobile-first collection of developer utilities that runs **entirely in your browser**.
No backend, no database, no login, no API keys, no analytics — your input never leaves your device,
and every tool keeps working offline once the page has loaded.

## Tools

| Tool | What it does |
| --- | --- |
| **JSON Formatter** | Pretty-print, minify and validate JSON. Invalid JSON shows a friendly message with the error location. |
| **Base64 Encoder / Decoder** | Unicode-safe (Malayalam, emoji, any text) encode and decode. |
| **URL Encoder / Decoder** | Percent-encode text and query strings, or decode them back — built on the browser's own `encodeURIComponent` / `decodeURIComponent`. |
| **UUID Generator** | Secure UUID v4 values via `crypto.randomUUID()` (with a `crypto.getRandomValues` fallback). Generate 1–100 at a time. |
| **Text Counter** | Live characters, characters without spaces, words, lines, sentences and UTF-8 byte counts. |
| **Colour Converter** | HEX ⇄ RGB ⇄ HSL in any direction, with a live swatch preview. Type into one field and the others stay in sync. |
| **SHA-256 Hash** | One-way SHA-256 hex digests via the Web Crypto API — same input, same hash, nothing sent anywhere. |
| **Unix Timestamp** | Epoch ⇄ readable dates in seconds or milliseconds (auto-detected), shown in both local time and UTC. |
| **Diff Checker** | Compare two texts or code files line by line, with added/removed/unchanged highlighting, optional whitespace/case ignoring, and a downloadable unified diff. |
| **JWT Decoder** | Read a token's header, payload, claims and expiry locally. Decodes only — it never verifies signatures and never contacts a server. |
| **Regex Tester** | Test a pattern with `g i m s u y` flags, highlighted matches, match positions, capture groups and ready-made examples. |
| **SQL Formatter** | Indent and line-break SQL into a readable layout, or collapse it back onto one line. Never executed, never uploaded. |
| **JSON → CSV** | Turn a JSON array of objects into CSV with proper escaping of commas, quotes and newlines, plus missing/null handling. |
| **Markdown Previewer** | Write Markdown and see a live, sanitized HTML preview — headings, lists, tables, code blocks, tasks and more. Scripts can never run. |
| **HTTP Status Lookup** | Search HTTP status codes 1xx–5xx with plain-English explanations, category filters and copy buttons — fully offline. |
| **Cron Helper** | Explain a 5-field cron expression or `@shortcut` field by field, with common examples and inline validation. |
| **HTML Entity Converter** | Encode text (or Unicode) into HTML entities and decode named, decimal and hex entities back to plain text. |
| **Number Base Converter** | Convert between binary, octal, decimal and hex with exact `BigInt` maths — large integers are never rounded. |

## Files

Most tools can read a local text file and save their result back to one — all through
built-in browser APIs (`FileReader`, `Blob`, object URLs), with nothing uploaded:

- **Choose file** loads `.txt`, `.md`, `.csv`, `.json`, `.sql` or `.log` (depending on the tool)
  into the normal input field, shows the file name and size, and lets you keep editing before processing.
- **Remove file** detaches the imported file and clears its contents.
- **Download** saves the result you produced (with a name you can edit first) as a fresh copy.
  The original file on disk is never modified or overwritten.
- Files are capped at **5 MB**; empty, oversized and unsupported files get a friendly message.

Import is offered where it makes sense: JSON, Base64, URL, Text Counter, SHA-256, Diff Checker,
JWT Decoder, Regex Tester, SQL Formatter, JSON → CSV, Markdown Previewer and the HTML Entity
Converter. Colour, UUID, Timestamp, HTTP Status, Cron Helper and Number Base Converter work
straight from the keyboard (though most still offer a download).

The Diff Checker imports **two** files (original and modified) and can download the unified diff;
the Markdown Previewer saves edited Markdown back out as `.md`; JSON → CSV saves `.csv`; the SQL
Formatter saves `.sql`; and the JWT, Regex, Cron, Entity and Number Base tools save `.txt` reports.

> SHA-256 hashes the **text content** shown in the field, encoded as UTF-8. That matches a
> plain text file's contents, but it is not a byte-for-byte checksum of an arbitrary binary file.

## Design

- **Mobile-first** — comfortable from 320 px phones up to desktop, with 44 px+ touch targets and 16 px inputs (no Android keyboard zoom).
- **Dark mode by default** with a persisted light/dark toggle.
- **No page reloads** — a tiny hash router (`#/`, `#/json`, …) with real history, so the Android hardware Back button returns to the home screen.
- **Accessible** — labelled controls, visible focus styles, an ARIA live region for toasts, and headings that receive focus on navigation.

## Running it

It is a plain static site — open `index.html` through any web server:

```bash
python3 -m http.server 3000
# then visit http://localhost:3000
```

## Project layout

```
index.html            App shell (header, home view, toast element)
css/styles.css        Design tokens + all styles (dark/light themes)
js/
  main.js             Entry point
  navigation.js       Hash router with history support
  home.js             Tool cards + instant search filtering
  theme.js            Theme switching (persisted)
  toast.js            Toast notifications
  clipboard.js        Copy-to-clipboard with fallback
  dom.js              Shared DOM helpers + guarded action binding
  icons.js            Inline SVG icons
  tool-scaffold.js    Shared markup for tool views
  file-import.js      Shared "Choose file" control (reads locally, never uploads)
  file-download.js    Shared "Download result" control (Blob + object URLs, revoked after use)
  lib/                Pure, testable logic (JSON, Base64, URL, UUID, text stats,
                        colour conversion, SHA-256, timestamps, diffing, JWT, regex,
                        SQL, CSV, Markdown, HTTP status, cron, HTML entities, number
                        bases, and file name/type/size helpers)
  tools/              One module per tool view + the registry
tests/                Unit tests (Node's built-in test runner, zero dependencies)
```

## Tool count

The home screen shows **18 tools**, and the search box filters all of them by name,
description and keywords.

## Tests

Zero-dependency tests for the pure logic and the page structure:

```bash
node --test tests/*.test.js
```

## Privacy

"Your data stays in your browser. Pocket DevTools does not upload your input."
A unit test enforces this by failing if any source file ever introduces `fetch()`,
`XMLHttpRequest`, `sendBeacon` or an external URL.
