/** Light/dark theme switching, persisted in localStorage. */

import { icons } from './icons.js';

const STORAGE_KEY = 'pocket-devtools-theme';
const THEME_COLORS = { dark: '#0d1117', light: '#ffffff' };

let toggleButton = null;

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const target = theme === 'dark' ? 'light' : 'dark';
  const label = 'Switch to ' + target + ' theme';
  if (toggleButton) {
    toggleButton.innerHTML = theme === 'dark' ? icons.sun : icons.moon;
    toggleButton.setAttribute('aria-label', label);
    toggleButton.setAttribute('title', label);
    toggleButton.setAttribute('aria-pressed', String(theme === 'light'));
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage blocked: theme still applies for this session */
  }
}

export function initTheme() {
  toggleButton = document.getElementById('theme-toggle');
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  applyTheme(stored === 'light' || stored === 'dark' ? stored : 'dark'); // dark by default
  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }
}
