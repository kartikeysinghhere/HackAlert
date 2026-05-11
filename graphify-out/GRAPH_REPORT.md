# Graph Report - hackito_old  (2026-05-11)

## Corpus Check
- 47 files · ~16,258 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 204 nodes · 280 edges · 49 communities (46 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `01df5e44`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_General UI Interaction|General UI Interaction]]
- [[_COMMUNITY_Chat Messaging|Chat Messaging]]
- [[_COMMUNITY_Rendering Helpers|Rendering Helpers]]
- [[_COMMUNITY_User Profile Management|User Profile Management]]
- [[_COMMUNITY_Team Management|Team Management]]
- [[_COMMUNITY_Team Chat Interaction|Team Chat Interaction]]
- [[_COMMUNITY_Server Messaging|Server Messaging]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 23 edges
2. `authHeaders()` - 21 edges
3. `goTo()` - 13 edges
4. `escapeHTML()` - 11 edges
5. `renderHackathons()` - 8 edges
6. `sendChat()` - 7 edges
7. `loadTeams()` - 6 edges
8. `loadProfile()` - 5 edges
9. `createTeam()` - 5 edges
10. `leaveTeam()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `renderHackathons()` --calls--> `escapeHTML()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 2 → community 0_
- `openDMChat()` --calls--> `escapeHTML()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 2 → community 9_
- `fetchOnlineUsers()` --calls--> `authHeaders()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 1 → community 0_
- `generateIdeas()` --calls--> `authHeaders()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 1 → community 2_
- `loadConversations()` --calls--> `authHeaders()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 1 → community 9_

## Communities (49 total, 3 thin omitted)

### Community 0 - "General UI Interaction"
Cohesion: 0.07
Nodes (33): appendMessage(), buildCountryList(), censorMessage(), confirmLogout(), copyLink(), fallbackCopy(), fetchHackathons(), fetchOnlineUsers() (+25 more)

### Community 1 - "Chat Messaging"
Cohesion: 0.15
Nodes (25): authHeaders(), closeTeamChat(), copyInviteLink(), createTeam(), deleteProject(), deleteReview(), deleteTeam(), hideCreateTeam() (+17 more)

### Community 2 - "Rendering Helpers"
Cohesion: 0.18
Nodes (12): analyzeHackathon(), appendDMMessage(), appendTeamMessage(), createHackathonCard(), escapeHTML(), eyeSeen(), eyeUnseen(), generateIdeas() (+4 more)

### Community 4 - "User Profile Management"
Cohesion: 0.57
Nodes (5): generateTokens(), login(), refresh(), register(), storeRefreshToken()

### Community 7 - "Team Management"
Cohesion: 0.67
Nodes (5): askQuestion(), displayMessage(), init(), toggleInputs(), updateSuggestionButtons()

### Community 8 - "Team Chat Interaction"
Cohesion: 0.33
Nodes (5): 1. Vulnerability Mitigation, 2. Token Strategy, 3. Backend Implementation Details, 4. Frontend Compatibility, Security Architecture Upgrade: Secure Session Management

### Community 9 - "Server Messaging"
Cohesion: 0.4
Nodes (5): isOnline(), loadConversations(), loadDMMessages(), onlineDot(), openDMChat()

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (4): 1. Attacks Now Prevented, 2. Remaining Risks, 3. Production Readiness, API Security Refactor Report: Hack/Alert

## Knowledge Gaps
- **8 isolated node(s):** `graphify`, `1. Vulnerability Mitigation`, `2. Token Strategy`, `3. Backend Implementation Details`, `4. Frontend Compatibility` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Chat Messaging` to `General UI Interaction`, `Rendering Helpers`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `authHeaders()` connect `Chat Messaging` to `General UI Interaction`, `Server Messaging`, `Rendering Helpers`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `goTo()` connect `General UI Interaction` to `Chat Messaging`, `Server Messaging`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `graphify`, `1. Vulnerability Mitigation`, `2. Token Strategy` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `General UI Interaction` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._