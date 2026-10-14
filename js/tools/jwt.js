/** JWT Decoder: read a token's header and payload locally (never verifies). */

import { decodeJwt } from '../lib/jwt.js';
import { escapeHtml } from '../lib/escape.js';
import { TOKEN_EXTENSIONS } from '../lib/files.js';
import { copyToClipboard } from '../clipboard.js';
import { showToast } from '../toast.js';
import { qs, showError, clearError, clearFields, bindActions } from '../dom.js';
import { toolHead, errorBox } from '../tool-scaffold.js';
import { fileImportMarkup, createFileImport } from '../file-import.js';
import { downloadMarkup, createDownloadBar, downloadText } from '../file-download.js';

function timeRows(time, label) {
  if (!time) return '<p class="field-hint">No ' + label + ' claim in this token.</p>';
  const rows = [
    ['Seconds', String(time.value)],
    ['ISO (UTC)', time.iso],
    ['Local time', time.local],
    ['Relative', time.relative],
  ];
  return '<dl class="claims">' + rows.map(([name, value]) =>
    '<div class="claim"><dt class="claim-name">' + name + '</dt><dd class="claim-value">' + escapeHtml(value) + '</dd></div>',
  ).join('') + '</dl>';
}

export function mountJwtTool(section, { goBack }) {
  section.innerHTML =
    toolHead({
      title: 'JWT Decoder',
      description: 'Read the header, payload and claims inside a JSON Web Token. This only decodes — it never verifies the signature.',
    }) +
    fileImportMarkup({
      id: 'jwt-file',
      extensions: TOKEN_EXTENSIONS,
      hint: 'Import a .txt file that contains a token.',
    }) +
    '<div>' +
    '<label class="field-label" for="jwt-input">JWT</label>' +
    '<textarea class="code-input" id="jwt-input" rows="6" spellcheck="false" ' +
    'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
    'placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signature"></textarea>' +
    '</div>' +
    '<p class="field-hint warn-hint">Never paste production tokens into a website you do not trust. Decoding proves nothing about ' +
    'trust — anyone can craft a token that decodes successfully, and this tool cannot tell you whether a signature is valid.</p>' +
    '<div class="actions">' +
    '<button type="button" class="btn btn-primary" data-action="decode">Decode</button>' +
    '<button type="button" class="btn" data-action="clear">Clear</button>' +
    '</div>' +
    errorBox() +
    '<div id="jwt-result" hidden>' +
    '<p class="status-pill" id="jwt-status"></p>' +
    '<section class="result-card"><h3 class="result-title">Header</h3><pre class="code-block" id="jwt-header"></pre></section>' +
    '<section class="result-card"><h3 class="result-title">Payload</h3><pre class="code-block" id="jwt-payload"></pre></section>' +
    '<section class="result-card"><h3 class="result-title">Claims</h3><div id="jwt-claims"></div></section>' +
    '<section class="result-card"><h3 class="result-title">Expiration</h3><div id="jwt-exp"></div></section>' +
    '<section class="result-card"><h3 class="result-title">Issued at</h3><div id="jwt-iat"></div></section>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="copyHeader">Copy header</button>' +
    '<button type="button" class="btn" data-action="copyPayload">Copy payload</button>' +
    '<button type="button" class="btn" data-action="copyClaims">Copy claims</button>' +
    '</div>' +
    '</div>' +
    downloadMarkup({ id: 'jwt-name', hint: 'Download the decoded token as a .txt report.' });

  const input = qs(section, '#jwt-input');
  const errorBoxEl = qs(section, '.error-box');
  const result = qs(section, '#jwt-result');
  const bar = createDownloadBar(section, { id: 'jwt-name', defaultName: 'jwt-decoded.txt' });
  let decoded = null;
  let report = '';

  const importer = createFileImport(section, {
    id: 'jwt-file',
    extensions: TOKEN_EXTENSIONS,
    onText: (text) => {
      input.value = text.trim();
      clearError(errorBoxEl);
      hideResult();
      showToast('Token file loaded — press Decode.');
    },
    onError: (message) => showError(errorBoxEl, message),
  });

  function hideResult() {
    result.hidden = true;
    decoded = null;
    report = '';
    bar.hide();
  }

  function claimsText(value) {
    return value.claims.map((claim) => claim.name + ': ' + claim.display).join('\n');
  }

  function decode() {
    const outcome = decodeJwt(input.value);
    if (!outcome.ok) {
      hideResult();
      if (outcome.empty) showError(errorBoxEl, 'Paste a JWT to decode.');
      else showError(errorBoxEl, outcome.error);
      return;
    }
    clearError(errorBoxEl);
    decoded = outcome;

    const status = qs(section, '#jwt-status');
    if (outcome.exp === null) {
      status.textContent = 'No expiry claim (exp) — the token never expires on its own.';
      status.className = 'status-pill';
    } else if (outcome.exp.expired) {
      status.textContent = 'Expired ' + outcome.exp.relative;
      status.className = 'status-pill status-bad';
    } else {
      status.textContent = 'Valid until ' + outcome.exp.local + ' (' + outcome.exp.relative + ')';
      status.className = 'status-pill status-good';
    }

    qs(section, '#jwt-header').textContent = outcome.headerJson;
    qs(section, '#jwt-payload').textContent = outcome.payloadJson;
    qs(section, '#jwt-claims').innerHTML = '<dl class="claims">' + outcome.claims.map((claim) =>
      '<div class="claim"><dt class="claim-name">' + escapeHtml(claim.name) + '</dt>' +
      '<dd class="claim-value">' + escapeHtml(claim.display) +
      '<span class="claim-desc">' + escapeHtml(claim.description) + '</span></dd></div>',
    ).join('') + '</dl>';
    qs(section, '#jwt-exp').innerHTML = timeRows(outcome.exp, 'expiration');
    qs(section, '#jwt-iat').innerHTML = timeRows(outcome.iat, 'issued-at');

    report = [
      'JWT decoded (signature NOT verified)',
      '====================================',
      'Algorithm: ' + (outcome.algorithm || 'none'),
      'Type: ' + (outcome.type || 'JWT'),
      outcome.kid ? 'Key ID (kid): ' + outcome.kid : null,
      '',
      'Header',
      '------',
      outcome.headerJson,
      '',
      'Payload',
      '-------',
      outcome.payloadJson,
      '',
      'Claims',
      '------',
      claimsText(outcome),
      '',
      'Status: ' + status.textContent,
      '',
      'Note: decoding is not verification. This tool never checks the signature.',
    ].filter((line) => line !== null).join('\n');

    result.hidden = false;
    bar.show('jwt-decoded.txt');
  }

  input.addEventListener('input', () => {
    clearError(errorBoxEl);
    hideResult();
  });

  bindActions(section, {
    back: goBack,
    chooseFile: () => importer.choose(),
    removeFile: () => {
      importer.remove();
      clearFields([input]);
      clearError(errorBoxEl);
      hideResult();
    },
    decode,
    copyHeader: () => copyToClipboard(decoded ? decoded.headerJson : '', 'Header copied'),
    copyPayload: () => copyToClipboard(decoded ? decoded.payloadJson : '', 'Payload copied'),
    copyClaims: () => copyToClipboard(decoded ? claimsText(decoded) : '', 'Claims copied'),
    download: () => {
      if (!report) {
        showError(errorBoxEl, 'Decode a token first, then download the result.');
        return;
      }
      downloadText(report, bar.name);
    },
    clear: () => {
      clearFields([input]);
      clearError(errorBoxEl);
      hideResult();
      importer.reset();
    },
  });
}
