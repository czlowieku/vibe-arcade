const STORAGE_KEY = 'vibe-arcade';
const API_KEY_KEY = 'vibe-arcade-api-key';
const GEMINI_KEY_KEY = 'vibe-arcade-gemini-key';
const PROVIDER_KEY = 'vibe-arcade-provider';

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

export function getGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_KEY) || '';
}

export function setGeminiKey(key) {
  if (key) {
    localStorage.setItem(GEMINI_KEY_KEY, key);
  } else {
    localStorage.removeItem(GEMINI_KEY_KEY);
  }
}

export function getProvider() {
  return localStorage.getItem(PROVIDER_KEY) || 'anthropic';
}

export function setProvider(provider) {
  localStorage.setItem(PROVIDER_KEY, provider);
}

export function getActiveKey() {
  return getProvider() === 'gemini' ? getGeminiKey() : getApiKey();
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
