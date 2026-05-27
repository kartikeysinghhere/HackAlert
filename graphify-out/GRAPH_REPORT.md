# Graph Report - hackito_old  (2026-05-27)

## Corpus Check
- 78 files · ~52,512 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 317 nodes · 456 edges · 73 communities (65 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `35dc6f10`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_General UI Interaction|General UI Interaction]]
- [[_COMMUNITY_Chat Messaging|Chat Messaging]]
- [[_COMMUNITY_Rendering Helpers|Rendering Helpers]]
- [[_COMMUNITY_Data Fetching & Rendering|Data Fetching & Rendering]]
- [[_COMMUNITY_User Profile Management|User Profile Management]]
- [[_COMMUNITY_Team Creation|Team Creation]]
- [[_COMMUNITY_Team Management|Team Management]]
- [[_COMMUNITY_Server Messaging|Server Messaging]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 33 edges
2. `safeHTML()` - 25 edges
3. `authHeaders()` - 25 edges
4. `goTo()` - 19 edges
5. `escapeHTML()` - 15 edges
6. `openModal()` - 13 edges
7. `closeModal()` - 11 edges
8. `Enterprise Production Audit: HackAlert Codebase` - 11 edges
9. `sendChat()` - 10 edges
10. `renderHackathons()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `requestPasswordReset()` --calls--> `isValidEmail()`  [INFERRED]
  realhackito.js → server.js
- `startHeartbeat()` --calls--> `ping()`  [INFERRED]
  realhackito.js → services/users.service.js
- `middleware()` --calls--> `updateSession()`  [INFERRED]
  web/src/middleware.ts → web/src/utils/supabase/middleware.ts

## Communities (73 total, 8 thin omitted)

### Community 0 - "General UI Interaction"
Cohesion: 0.06
Nodes (47): closeModal(), confirmLogout(), copyLink(), deleteTeammateListing(), fallbackCopy(), fetchHackathons(), fetchTeammates(), getFallbackHackathons() (+39 more)

### Community 1 - "Chat Messaging"
Cohesion: 0.12
Nodes (29): authHeaders(), closeTeamChat(), copyInviteLink(), createTeam(), deleteProject(), deleteReview(), deleteTeam(), hideCreateTeam() (+21 more)

### Community 2 - "Rendering Helpers"
Cohesion: 0.12
Nodes (28): analyzeHackathon(), appendDMMessage(), appendMessage(), appendTeamMessage(), buildCountryList(), censorMessage(), createHackathonCard(), escapeHTML() (+20 more)

### Community 3 - "Data Fetching & Rendering"
Cohesion: 0.08
Nodes (24): 1. Architectural Flaws, 2. Security Vulnerabilities, 3. Performance Bottlenecks, 4. Production Deployment Risks, 5. Code Quality Issues, 6. Frontend UX Engineering Quality, 7. Backend Robustness, 8. AI/Automation Integration Quality (+16 more)

### Community 4 - "User Profile Management"
Cohesion: 0.15
Nodes (5): requestPasswordReset(), compactText(), isValidEmail(), normalizeHackathon(), rankHackathonsForQuestion()

### Community 5 - "Team Creation"
Cohesion: 0.33
Nodes (7): generateTokens(), login(), refresh(), register(), resolveStoredPasswordHash(), sendWelcomeEmail(), storeRefreshToken()

### Community 7 - "Team Management"
Cohesion: 0.22
Nodes (3): fetchOnlineUsers(), startHeartbeat(), ping()

### Community 9 - "Server Messaging"
Cohesion: 0.67
Nodes (5): askQuestion(), displayMessage(), init(), toggleInputs(), updateSuggestionButtons()

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (5): 1. Vulnerability Mitigation, 2. Token Strategy, 3. Backend Implementation Details, 4. Frontend Compatibility, Security Architecture Upgrade: Secure Session Management

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (4): 1. Attacks Now Prevented, 2. Remaining Risks, 3. Production Readiness, API Security Refactor Report: Hack/Alert

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **31 isolated node(s):** `graphify`, `graphify`, `Monolithic Frontend Structure`, `Backend Vendor Lock-in & Missing Abstraction`, `[CRITICAL] Client-Side Secret Leakage (JWT in LocalStorage)` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requestPasswordReset()` connect `User Profile Management` to `General UI Interaction`, `Chat Messaging`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `startHeartbeat()` connect `Team Management` to `General UI Interaction`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `graphify`, `graphify`, `Monolithic Frontend Structure` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `General UI Interaction` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Chat Messaging` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Rendering Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Data Fetching & Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._