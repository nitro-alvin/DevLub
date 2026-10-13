/** Home screen: renders the tool cards and filters them as you type. */

import { icons } from './icons.js';
import { navigate } from './navigation.js';
import { tools } from './tools/registry.js';

let searchInput = null;
let emptyState = null;
let statusEl = null;
const items = [];

function buildCard(tool) {
  return (
    '<li>' +
    '<button type="button" class="card" data-route="' + tool.id + '">' +
    '<span class="card-icon" aria-hidden="true">' + tool.badge + '</span>' +
    '<span class="card-text">' +
    '<span class="card-name">' + tool.name + '</span>' +
    '<span class="card-desc">' + tool.description + '</span>' +
    '</span>' +
    '<span class="card-chevron" aria-hidden="true">' + icons.chevron + '</span>' +
    '</button>' +
    '</li>'
  );
}

function applyFilter(rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  let visible = 0;
  for (const item of items) {
    const matches = !query || item.haystack.includes(query);
    item.listItem.hidden = !matches;
    if (matches) visible += 1;
  }
  if (emptyState) emptyState.hidden = visible !== 0;
  if (statusEl) {
    statusEl.textContent = visible === items.length
      ? ''
      : visible + ' of ' + items.length + ' tools match "' + rawQuery.trim() + '"';
  }
}

export function initHome() {
  searchInput = document.getElementById('tool-search');
  emptyState = document.getElementById('no-results');
  statusEl = document.getElementById('search-status');
  const grid = document.getElementById('tool-grid');
  if (!searchInput || !grid) throw new Error('Home screen elements missing from the page');

  const fragment = document.createDocumentFragment();
  for (const tool of tools) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildCard(tool);
    const listItem = wrapper.firstElementChild;
    fragment.appendChild(listItem);
    items.push({
      listItem,
      haystack: [tool.name, tool.description, tool.id, ...tool.keywords].join(' ').toLowerCase(),
    });
  }
  grid.appendChild(fragment);

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.card');
    if (card) navigate(card.dataset.route);
  });
  searchInput.addEventListener('input', () => applyFilter(searchInput.value));
  applyFilter('');
}

/** Focus the search field (used by the header search button). */
export function focusSearch() {
  if (!searchInput) return;
  searchInput.focus();
  searchInput.select();
}
