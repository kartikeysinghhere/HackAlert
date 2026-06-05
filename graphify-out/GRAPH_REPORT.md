# Graph Report - hackito_old  (2026-06-05)

## Corpus Check
- 92 files · ~67,589 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 475 nodes · 873 edges · 82 communities (74 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `452fe2cf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_General UI Interaction|General UI Interaction]]
- [[_COMMUNITY_Chat Messaging|Chat Messaging]]
- [[_COMMUNITY_Rendering Helpers|Rendering Helpers]]
- [[_COMMUNITY_Data Fetching & Rendering|Data Fetching & Rendering]]
- [[_COMMUNITY_User Profile Management|User Profile Management]]
- [[_COMMUNITY_Team Creation|Team Creation]]
- [[_COMMUNITY_Auth & Navigation|Auth & Navigation]]
- [[_COMMUNITY_Team Management|Team Management]]
- [[_COMMUNITY_Team Chat Interaction|Team Chat Interaction]]
- [[_COMMUNITY_Server Messaging|Server Messaging]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 33 edges
2. `authHeaders()` - 26 edges
3. `safeHTML()` - 25 edges
4. `goTo()` - 20 edges
5. `escapeHTML()` - 15 edges
6. `openModal()` - 13 edges
7. `closeModal()` - 11 edges
8. `Enterprise Production Audit: HackAlert Codebase` - 11 edges
9. `renderHackathons()` - 10 edges
10. `handleRoute()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `requestPasswordReset()` --calls--> `isValidEmail()`  [INFERRED]
  realhackito.js → server.js
- `startHeartbeat()` --calls--> `ping()`  [INFERRED]
  realhackito.js → services/users.service.js
- `startHeartbeat()` --calls--> `ping()`  [INFERRED]
  frontend/profile.js → services/users.service.js
- `restorePersistedFilters()` --calls--> `loadPersistedState()`  [INFERRED]
  frontend/hackathons.js → frontend/state.js
- `fetchHackathons()` --calls--> `renderErrorRecovery()`  [INFERRED]
  frontend/hackathons.js → frontend/ui.js

## Communities (82 total, 8 thin omitted)

### Community 0 - "General UI Interaction"
Cohesion: 0.05
Nodes (91): authHeaders(), censorMessage(), escapeHTML(), safeHTML(), safeJSString(), confirmLogout(), handlePasswordReset(), hideLogoutModal() (+83 more)

### Community 1 - "Chat Messaging"
Cohesion: 0.09
Nodes (36): applyAdvancedFilters(), buildCountryList(), clearAllFilters(), copyLink(), createHackathonCard(), deleteReview(), fallbackCopy(), fetchHackathons() (+28 more)

### Community 2 - "Rendering Helpers"
Cohesion: 0.08
Nodes (24): closeModal(), confirmLogout(), copyLink(), deleteTeammateListing(), fallbackCopy(), fetchTeammates(), hideBugReport(), hideCreateTeammateModal() (+16 more)

### Community 3 - "Data Fetching & Rendering"
Cohesion: 0.13
Nodes (26): authHeaders(), closeTeamChat(), copyInviteLink(), createTeam(), deleteReview(), deleteTeam(), hideCreateTeam(), initSpeechRecognition() (+18 more)

### Community 4 - "User Profile Management"
Cohesion: 0.08
Nodes (24): 1. Architectural Flaws, 2. Security Vulnerabilities, 3. Performance Bottlenecks, 4. Production Deployment Risks, 5. Code Quality Issues, 6. Frontend UX Engineering Quality, 7. Backend Robustness, 8. AI/Automation Integration Quality (+16 more)

### Community 5 - "Team Creation"
Cohesion: 0.12
Nodes (21): deleteProject(), fetchHackathons(), getFallbackHackathons(), goTo(), goToCalendar(), handlePasswordReset(), handleRoute(), loadFindFriends() (+13 more)

### Community 6 - "Auth & Navigation"
Cohesion: 0.13
Nodes (5): requestPasswordReset(), compactText(), isValidEmail(), normalizeHackathon(), rankHackathonsForQuestion()

### Community 7 - "Team Management"
Cohesion: 0.22
Nodes (16): analyzeHackathon(), appendDMMessage(), appendTeamMessage(), createHackathonCard(), escapeHTML(), eyeSeen(), eyeUnseen(), generateIdeas() (+8 more)

### Community 8 - "Team Chat Interaction"
Cohesion: 0.33
Nodes (7): generateTokens(), login(), refresh(), register(), resolveStoredPasswordHash(), sendWelcomeEmail(), storeRefreshToken()

### Community 9 - "Server Messaging"
Cohesion: 0.2
Nodes (4): startHeartbeat(), fetchOnlineUsers(), startHeartbeat(), ping()

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (9): applyAdvancedFilters(), buildCountryList(), clearAllFilters(), filterByCountry(), filterCards(), renderHackathons(), selectCountry(), toggleBeginnerFilter() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (8): appendMessage(), censorMessage(), quickSend(), removeTyping(), sendChat(), showTyping(), speakText(), stopSpeech()

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (5): askQuestion(), displayMessage(), init(), toggleInputs(), updateSuggestionButtons()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (6): loadProfile(), loginUser(), requestNotificationPermission(), toggleSave(), unsaveHackathon(), updateStats()

### Community 16 - "Community 16"
Cohesion: 0.53
Nodes (4): makeRequest(), testRateLimiting(), testRequestSizeLimit(), testSuspiciousHeaders()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): 1. Vulnerability Mitigation, 2. Token Strategy, 3. Backend Implementation Details, 4. Frontend Compatibility, Security Architecture Upgrade: Secure Session Management

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (4): 1. Attacks Now Prevented, 2. Remaining Risks, 3. Production Readiness, API Security Refactor Report: Hack/Alert

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **31 isolated node(s):** `graphify`, `graphify`, `Monolithic Frontend Structure`, `Backend Vendor Lock-in & Missing Abstraction`, `[CRITICAL] Client-Side Secret Leakage (JWT in LocalStorage)` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startHeartbeat()` connect `Server Messaging` to `Rendering Helpers`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `startHeartbeat()` connect `Server Messaging` to `General UI Interaction`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **What connects `graphify`, `graphify`, `Monolithic Frontend Structure` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `General UI Interaction` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Chat Messaging` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Rendering Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Data Fetching & Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._