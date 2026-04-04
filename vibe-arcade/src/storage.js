const STORAGE_KEY = 'vibe-arcade';

const defaultState = {
  coins: 0,
  level: 1,
  cards: [],
  machines: Array(6).fill(null),
  totalGamesPlayed: 0,
  machineRatings: Array(6).fill(null),
  totalNpcCoinsEarned: 0,
};

export function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return { ...defaultState, ...JSON.parse(data) };
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
  return { ...defaultState };
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}
