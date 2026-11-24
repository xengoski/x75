export const APPLE_ACCENTS = [
  { id: 'monochrome', name: 'Monochrome', color: '#FFFFFF', isMonochrome: true },
  { id: 'blue', name: 'Blue', color: '#007AFF' },
  { id: 'purple', name: 'Purple', color: '#AF52DE' },
  { id: 'pink', name: 'Pink', color: '#FF2D55' },
  { id: 'orange', name: 'Orange', color: '#FF9500' },
  { id: 'green', name: 'Green', color: '#30D158' },
  { id: 'indigo', name: 'Indigo', color: '#5856D6' }
];

let transitionTimer = null;

export const applyThemeToDocument = (accentColor, isDark) => {
  const root = document.documentElement;

  // Nothing OS Monochrome Mode Support
  const isMono = accentColor === '#FFFFFF' || accentColor === '#000000' || accentColor === 'monochrome';
  const resolvedAccent = isMono ? (isDark ? '#FFFFFF' : '#000000') : (accentColor || '#007AFF');

  root.style.setProperty('--color-primary', resolvedAccent);

  // Enable smooth theme color morphing
  root.classList.add('theme-transitioning');
  if (transitionTimer) clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, 450);

  if (isDark) {
    root.classList.remove('light');
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
};
