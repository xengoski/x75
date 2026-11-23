const STORAGE_KEY = 'X75_STATE';
const LEGACY_KEY = 'PROJECT_75_APPLE_STATE';

// Local-time safe date string generator (YYYY-MM-DD) avoiding UTC midnight timezone bugs
export const getLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const INITIAL_STATE = {
  records: {}, // Clean slate for real students - no forced mock records
  settings: {
    minThreshold: 75,
    accentColor: '#007AFF',
    isDarkMode: true,
    soundEnabled: true,
    feedbackMode: 'sound' // 'sound' | 'vibrate' | 'off'
  }
};

export const loadStoredState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_STATE,
      ...parsed,
      records: parsed.records || {},
      settings: {
        ...INITIAL_STATE.settings,
        ...(parsed.settings || {})
      }
    };
  } catch {
    return INITIAL_STATE;
  }
};

export const saveStoredState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
};

export const clearStoredState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch (e) {
    console.error('Failed to clear state', e);
  }
};

export const exportDataAsJSON = (state) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", `x75_attendance_${getLocalDateStr()}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
};
