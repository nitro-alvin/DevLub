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

## Files

Most tools can read a local text file and save their result back to one — all through
built-in browser APIs (`FileReader`, `Blob`, object URLs), with nothing uploaded:

- **Choose file** loads `.txt`, `.md`, `.csv`, `.json`, `.sql` or `.log` (depending on the tool)
  into the normal input field, shows the file name and size, and lets you keep editing before processing.
- **Remove file** detaches the imported file and clears its contents.
- **Download** saves the result you produced (with a name you can edit first) as a fresh copy.
  The original file on disk is never modified or overwritten.
- Files are capped at **5 MB**; empty, oversized and unsupported files get a friendly message.

JSON, Base64, URL, Text Counter and SHA-256 accept imports. Colour, UUID and Timestamp
produce downloads only — they do not need a file to work.

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
                        colour conversion, SHA-256, timestamps, file name/type/size helpers)
  tools/              One module per tool view + the registry
tests/                Unit tests (Node's built-in test runner, zero dependencies)
```

## Tests

Zero-dependency tests for the pure logic and the page structure:

```bash
node --test tests/*.test.js
```

## Privacy

"Your data stays in your browser. Pocket DevTools does not upload your input."
A unit test enforces this by failing if any source file ever introduces `fetch()`,
`XMLHttpRequest`, `sendBeacon` or an external URL.
