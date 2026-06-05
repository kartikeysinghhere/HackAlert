export const state = {
  allHackathons: [],
  chatHistory: [],
  bannedWords: ['fuck', 'shit', 'ass', 'bastard', 'bitch', 'damn', 'crap', 'chutiye', 'madarchod', 'bhadwe', 'randi', 'rand', 'bhosdi', 'bsdk', 'gandu', 'behenchod', 'behencho', 'bc', 'tmkc', 'jhatu', 'mc', 'bhenchod', 'pussy'],
  currentFilters: {
    mode: 'all',
    date: 'all',
    beginner: false,
    domain: 'all',
    hasPrize: false
  },
  searchTimeout: null,
  currentRating: 0,
  pendingSignupData: null,
  currentTeamId: null,
  chatEventSource: null,
  speechActive: false,
  recognitionActive: false,
  recognition: null,
  dmClients: {},
  activeDMStream: null,
  selectedStarRating: 0
};

export function savePersistedState(key, data) {
  try {
    const payload = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(`persisted_${key}`, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function loadPersistedState(key) {
  try {
    const raw = localStorage.getItem(`persisted_${key}`);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || !payload.timestamp) return null;
    
    const age = Date.now() - payload.timestamp;
    if (age > 86400000) { // 24 hours in ms
      localStorage.removeItem(`persisted_${key}`);
      return null;
    }
    return payload.data;
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
    return null;
  }
}

