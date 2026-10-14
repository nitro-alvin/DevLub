/** HTTP Status Code Lookup: an offline, searchable reference. */

import { STATUS_CODES, STATUS_GROUPS, filterStatusCodes, groupLabel } from '../lib/http-status.js';
import { escapeHtml } from '../lib/escape.js';
import { copyToClipboard } from '../clipboard.js';
import { qs, bindActions } from '../dom.js';
import { toolHead } from '../tool-scaffold.js';

function itemMarkup(entry) {
  const codeLabel = entry.code + ' ' + entry.name;
  return (
    '<li class="status-item" data-group="' + entry.group + '">' +
    '<div class="status-head">' +
    '<span class="status-code">' + entry.code + '</span>' +
    '<span class="status-name">' + escapeHtml(entry.name) + '</span>' +
    '<span class="status-cat">' + entry.group + 'xx</span>' +
    '</div>' +
    '<p class="status-desc">' + escapeHtml(entry.description) + '</p>' +
    '<div class="status-actions">' +
    '<button type="button" class="btn btn-mini" data-action="copyCode" data-value="' + escapeHtml(codeLabel) + '">Copy code</button>' +
    '<button type="button" class="btn btn-mini" data-action="copyExplanation" data-value="' + escapeHtml(entry.description) + '">Copy explanation</button>' +
    '</div>' +
    '</li>'
  );
}

export function mountHttpStatusTool(section, { goBack }) {
  const chips = [{ id: 'all', label: 'All codes' }]
    .concat(STATUS_GROUPS.map((group) => ({ id: group.id, label: group.label })))
    .map((chip) =>
      '<button type="button" class="btn btn-chip" data-action="filterCategory" data-group="' + chip.id + '">' +
      escapeHtml(chip.label) + '</button>').join('');

  section.innerHTML =
    toolHead({
      title: 'HTTP Status Lookup',
      description: 'Search the HTTP status codes every API developer needs, with a plain-English explanation for each.',
    }) +
    '<div>' +
    '<label class="field-label" for="status-search">Search codes</label>' +
    '<input class="code-input" id="status-search" type="search" autocomplete="off" ' +
    'enterkeyhint="search" placeholder="Try 404, gateway, auth, rate limit…">' +
    '</div>' +
    '<p class="field-hint">Filter by category:</p>' +
    '<div class="chip-row" id="status-chips">' + chips + '</div>' +
    '<p class="match-count" id="status-count"></p>' +
    '<ul class="status-list" id="status-list"></ul>' +
    '<p class="empty-state" id="status-empty" hidden>No status codes match that search.</p>' +
    '<div class="actions">' +
    '<button type="button" class="btn" data-action="clearFilters">Clear filters</button>' +
    '</div>';

  const searchInput = qs(section, '#status-search');
  const chipsRow = qs(section, '#status-chips');
  const list = qs(section, '#status-list');
  const countEl = qs(section, '#status-count');
  const emptyEl = qs(section, '#status-empty');
  let group = 'all';

  function paint() {
    const results = filterStatusCodes(searchInput.value, group);
    list.innerHTML = results.map(itemMarkup).join('');
    countEl.textContent = results.length + ' of ' + STATUS_CODES.length + ' codes';
    emptyEl.hidden = results.length !== 0;
    for (const chip of chipsRow.querySelectorAll('[data-group]')) {
      chip.classList.toggle('is-active', chip.dataset.group === group);
    }
  }

  searchInput.addEventListener('input', paint);
  paint();

  bindActions(section, {
    back: goBack,
    filterCategory: (target) => {
      group = target.dataset.group || 'all';
      paint();
    },
    clearFilters: () => {
      group = 'all';
      searchInput.value = '';
      paint();
      searchInput.focus();
    },
    copyCode: (target) => copyToClipboard(target.dataset.value || '', 'Status code copied'),
    copyExplanation: (target) => copyToClipboard(target.dataset.value || '', 'Explanation copied'),
  });
}
