const STORAGE_KEY = 'vibe-arcade';
const API_KEY_KEY = 'vibe-arcade-api-key';

export function getApiKey() {
  return localStorage.getItem(API_KEY_KEY) || '';
}

export function setApiKey(key) {
  if (key) {
    localStorage.setItem(API_KEY_KEY, key);
  } else {
    localStorage.removeItem(API_KEY_KEY);
  }
}

const defaultState = {
  coins: 0,
  level: 1,
  cards: [],
  machines: Array(8).fill(null),
  totalGamesPlayed: 0,
  machineRatings: Array(8).fill(null),
  totalNpcCoinsEarned: 0,
  npcHistory: [],
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
