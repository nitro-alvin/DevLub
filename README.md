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
  lib/                Pure, testable logic (JSON, Base64, URL, UUID, text stats,
                        colour conversion, SHA-256, timestamps)
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
