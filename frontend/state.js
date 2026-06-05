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
