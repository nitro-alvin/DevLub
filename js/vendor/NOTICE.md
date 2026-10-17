# Vendored libraries

These files are bundled locally so every Pocket DevTools feature keeps working
offline. None of them is fetched from a CDN at runtime, and none of them sends
user input anywhere.

| File | Library | Version | Licence |
| --- | --- | --- | --- |
| `qrcode.js` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase | 1.4.4 | MIT |
| `terser.js` | [Terser](https://github.com/terser/terser) | 5.36.0 | BSD-2-Clause |
| `csso.esm.js` | [CSso](https://github.com/css/csso) | 5.0.5 | MIT |

Local changes:

- `qrcode.js`: appended `export default qrcode;` so it can be imported as an
  ES module.
- `terser.js`: replaced the UMD wrapper's CommonJS/AMD branches with a direct
  browser-global factory and appended `export default globalThis.Terser;`.
- `csso.esm.js`: unmodified ESM distribution.

The original copyright notices remain at the top of each file.
