# Graph Report - hackito_old  (2026-05-10)

## Corpus Check
- 5 files · ~13,052 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 93 nodes · 188 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90222c7c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_General UI Interaction|General UI Interaction]]
- [[_COMMUNITY_Rendering Helpers|Rendering Helpers]]
- [[_COMMUNITY_Data Fetching & Rendering|Data Fetching & Rendering]]
- [[_COMMUNITY_User Profile Management|User Profile Management]]
- [[_COMMUNITY_Team Creation|Team Creation]]
- [[_COMMUNITY_Auth & Navigation|Auth & Navigation]]
- [[_COMMUNITY_Team Management|Team Management]]
- [[_COMMUNITY_Team Chat Interaction|Team Chat Interaction]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 22 edges
2. `authHeaders()` - 17 edges
3. `goTo()` - 12 edges
4. `escapeHTML()` - 9 edges
5. `renderHackathons()` - 8 edges
6. `sendChat()` - 7 edges
7. `loadTeams()` - 6 edges
8. `loadProfile()` - 5 edges
9. `createTeam()` - 5 edges
10. `leaveTeam()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `renderHackathons()` --calls--> `escapeHTML()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 2 → community 3_
- `appendMessage()` --calls--> `escapeHTML()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 2 → community 5_
- `submitProject()` --calls--> `authHeaders()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 0 → community 7_
- `generateIdeas()` --calls--> `authHeaders()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 0 → community 2_
- `fetchHackathons()` --calls--> `renderHackathons()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 13 → community 3_

## Communities (15 total, 4 thin omitted)

### Community 0 - "General UI Interaction"
Cohesion: 0.18
Nodes (20): authHeaders(), closeTeamChat(), copyInviteLink(), createTeam(), deleteReview(), deleteTeam(), hideCreateTeam(), joinTeam() (+12 more)

### Community 2 - "Rendering Helpers"
Cohesion: 0.25
Nodes (9): analyzeHackathon(), appendTeamMessage(), createHackathonCard(), escapeHTML(), generateIdeas(), getCountdown(), openModal(), renderHackathonsSorted() (+1 more)

### Community 3 - "Data Fetching & Rendering"
Cohesion: 0.25
Nodes (8): buildCountryList(), filterByCountry(), loadProfile(), renderHackathons(), selectCountry(), toggleSave(), unsaveHackathon(), updateStats()

### Community 4 - "User Profile Management"
Cohesion: 0.29
Nodes (7): confirmLogout(), goTo(), goToCalendar(), loginUser(), logout(), showUserSearch(), signupUser()

### Community 5 - "Team Creation"
Cohesion: 0.33
Nodes (7): appendMessage(), censorMessage(), filterCards(), quickSend(), removeTyping(), sendChat(), showTyping()

### Community 6 - "Auth & Navigation"
Cohesion: 0.67
Nodes (5): askQuestion(), displayMessage(), init(), toggleInputs(), updateSuggestionButtons()

### Community 7 - "Team Management"
Cohesion: 0.5
Nodes (4): deleteProject(), hideSubmitProject(), loadShowcase(), submitProject()

### Community 8 - "Team Chat Interaction"
Cohesion: 0.67
Nodes (3): nextMonth(), prevMonth(), renderCalendar()

## Knowledge Gaps
- **1 isolated node(s):** `graphify`
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `General UI Interaction` to `Chat Messaging`, `Rendering Helpers`, `Data Fetching & Rendering`, `User Profile Management`, `Team Management`, `Community 11`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `authHeaders()` connect `General UI Interaction` to `Chat Messaging`, `Rendering Helpers`, `Team Management`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `goTo()` connect `User Profile Management` to `General UI Interaction`, `Chat Messaging`, `Data Fetching & Rendering`, `Team Management`, `Team Chat Interaction`, `Community 13`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `graphify` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chat Messaging` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._