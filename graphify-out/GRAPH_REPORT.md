# Graph Report - hackito_old  (2026-05-21)

## Corpus Check
- 76 files · ~44,948 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 297 nodes · 377 edges · 70 communities (62 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2b74927d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_General UI Interaction|General UI Interaction]]
- [[_COMMUNITY_Chat Messaging|Chat Messaging]]
- [[_COMMUNITY_Rendering Helpers|Rendering Helpers]]
- [[_COMMUNITY_Data Fetching & Rendering|Data Fetching & Rendering]]
- [[_COMMUNITY_User Profile Management|User Profile Management]]
- [[_COMMUNITY_Auth & Navigation|Auth & Navigation]]
- [[_COMMUNITY_Team Chat Interaction|Team Chat Interaction]]
- [[_COMMUNITY_Server Messaging|Server Messaging]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 30 edges
2. `authHeaders()` - 23 edges
3. `goTo()` - 16 edges
4. `escapeHTML()` - 12 edges
5. `Enterprise Production Audit: HackAlert Codebase` - 11 edges
6. `sendChat()` - 10 edges
7. `renderHackathons()` - 8 edges
8. `loadTeams()` - 6 edges
9. `loadProfile()` - 5 edges
10. `createTeam()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `startHeartbeat()` --calls--> `ping()`  [INFERRED]
  realhackito.js → services/users.service.js
- `middleware()` --calls--> `updateSession()`  [INFERRED]
  web/src/middleware.ts → web/src/utils/supabase/middleware.ts

## Communities (70 total, 8 thin omitted)

### Community 0 - "General UI Interaction"
Cohesion: 0.05
Nodes (54): analyzeHackathon(), appendDMMessage(), appendMessage(), appendTeamMessage(), buildCountryList(), censorMessage(), confirmLogout(), copyLink() (+46 more)

### Community 1 - "Chat Messaging"
Cohesion: 0.11
Nodes (30): authHeaders(), closeTeamChat(), copyInviteLink(), createTeam(), deleteReview(), deleteTeam(), hideCreateTeam(), initSpeechRecognition() (+22 more)

### Community 2 - "Rendering Helpers"
Cohesion: 0.08
Nodes (24): 1. Architectural Flaws, 2. Security Vulnerabilities, 3. Performance Bottlenecks, 4. Production Deployment Risks, 5. Code Quality Issues, 6. Frontend UX Engineering Quality, 7. Backend Robustness, 8. AI/Automation Integration Quality (+16 more)

### Community 3 - "Data Fetching & Rendering"
Cohesion: 0.22
Nodes (3): compactText(), normalizeHackathon(), rankHackathonsForQuestion()

### Community 4 - "User Profile Management"
Cohesion: 0.33
Nodes (7): generateTokens(), login(), refresh(), register(), resolveStoredPasswordHash(), sendWelcomeEmail(), storeRefreshToken()

### Community 6 - "Auth & Navigation"
Cohesion: 0.22
Nodes (3): fetchOnlineUsers(), startHeartbeat(), ping()

### Community 8 - "Team Chat Interaction"
Cohesion: 0.67
Nodes (5): askQuestion(), displayMessage(), init(), toggleInputs(), updateSuggestionButtons()

### Community 9 - "Server Messaging"
Cohesion: 0.33
Nodes (5): 1. Vulnerability Mitigation, 2. Token Strategy, 3. Backend Implementation Details, 4. Frontend Compatibility, Security Architecture Upgrade: Secure Session Management

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (4): 1. Attacks Now Prevented, 2. Remaining Risks, 3. Production Readiness, API Security Refactor Report: Hack/Alert

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **31 isolated node(s):** `graphify`, `graphify`, `Monolithic Frontend Structure`, `Backend Vendor Lock-in & Missing Abstraction`, `[CRITICAL] Client-Side Secret Leakage (JWT in LocalStorage)` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startHeartbeat()` connect `Auth & Navigation` to `General UI Interaction`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `graphify`, `graphify`, `Monolithic Frontend Structure` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `General UI Interaction` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Chat Messaging` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Rendering Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._