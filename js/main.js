/** App entry point: wires the shell together. */

import { initTheme } from './theme.js';
import { initToast } from './toast.js';
import { initNavigation, navigate } from './navigation.js';
import { initHome, focusSearch } from './home.js';

initTheme();
initToast();
initHome();
initNavigation();

// Header search button: jump home (if needed) and focus the search field.
document.getElementById('search-btn').addEventListener('click', () => {
  navigate('');
  focusSearch();
});
