/**
 * Tiny hash router with real history support, so the Android
 * hardware Back button returns from a tool to the home screen.
 * Routes: '#/' (home) and '#/<tool-id>'.
 */

import { tools } from './tools/registry.js';

const HOME_ROUTE = '';

let homeView = null;
let viewsContainer = null;
let currentRoute = null;
let canGoBack = false;
const mounted = new Map();

function parseRoute() {
  const match = location.hash.match(/^#\/?(.*)$/);
  return match ? match[1] : HOME_ROUTE;
}

function getToolView(tool) {
  if (!mounted.has(tool.id)) {
    const section = document.createElement('section');
    section.className = 'view tool-view';
    section.id = 'view-' + tool.id;
    section.hidden = true;
    tool.mount(section, { goBack });
    viewsContainer.appendChild(section);
    mounted.set(tool.id, section);
  }
  return mounted.get(tool.id);
}

function render(route, { focus = true } = {}) {
  if (route === currentRoute) return;
  currentRoute = route;
  const tool = tools.find((candidate) => candidate.id === route);
  const target = tool ? getToolView(tool) : homeView;
  for (const view of document.querySelectorAll('.view')) {
    view.hidden = view !== target;
  }
  if (focus) {
    window.scrollTo(0, 0);
    const heading = target.querySelector('[data-view-heading]');
    if (heading) heading.focus({ preventScroll: true });
  }
}

export function navigate(route) {
  if (route === currentRoute) return;
  const url = route ? '#/' + route : '#/';
  history.pushState({ route }, '', url);
  canGoBack = true;
  render(route);
}

/** Back button inside tool views. Uses history so hardware Back behaves too. */
export function goBack() {
  if (canGoBack) {
    history.back();
    return;
  }
  // Deep link straight into a tool: replace instead of leaving the app.
  history.replaceState({ route: HOME_ROUTE }, '', '#/');
  render(HOME_ROUTE);
}

export function initNavigation({ homeSelector = '#view-home', containerSelector = '#tool-views' } = {}) {
  homeView = document.querySelector(homeSelector);
  viewsContainer = document.querySelector(containerSelector);
  if (!homeView || !viewsContainer) throw new Error('Navigation containers missing from the page');

  const route = parseRoute();
  history.replaceState({ route }, '', location.href);
  render(route, { focus: false });

  // Back/forward and manual hash edits re-render the matching view.
  window.addEventListener('popstate', () => render(parseRoute()));
  window.addEventListener('hashchange', () => render(parseRoute()));
}
