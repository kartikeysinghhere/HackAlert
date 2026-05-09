# Graph Report - d:/hackito_old  (2026-05-06)

## Corpus Check
- Corpus is ~5,974 words - fits in a single context window. You may not need a graph.

## Summary
- 51 nodes · 97 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 9 edges
2. `renderHackathons()` - 8 edges
3. `escapeHTML()` - 7 edges
4. `goTo()` - 7 edges
5. `sendChat()` - 7 edges
6. `loadTeams()` - 6 edges
7. `fetchHackathons()` - 4 edges
8. `createHackathonCard()` - 4 edges
9. `appendMessage()` - 4 edges
10. `loadProfile()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `renderHackathons()` --calls--> `escapeHTML()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 2 → community 3_
- `appendMessage()` --calls--> `escapeHTML()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 2 → community 1_
- `goTo()` --calls--> `fetchHackathons()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 3 → community 6_
- `renderHackathons()` --calls--> `updateStats()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 3 → community 4_
- `filterCards()` --calls--> `renderHackathons()`  [EXTRACTED]
  realhackito.js → realhackito.js  _Bridges community 3 → community 1_

## Communities (10 total, 1 thin omitted)

### Community 0 - "General UI Interaction"
Cohesion: 0.2
Nodes (4): copyLink(), fallbackCopy(), loadTeamMessages(), openTeamChat()

### Community 1 - "Chat Messaging"
Cohesion: 0.33
Nodes (7): appendMessage(), censorMessage(), filterCards(), quickSend(), removeTyping(), sendChat(), showTyping()

### Community 2 - "Rendering Helpers"
Cohesion: 0.33
Nodes (7): appendTeamMessage(), createHackathonCard(), escapeHTML(), getCountdown(), openModal(), renderHackathonsSorted(), safeJSString()

### Community 3 - "Data Fetching & Rendering"
Cohesion: 0.33
Nodes (6): buildCountryList(), fetchHackathons(), filterByCountry(), getFallbackHackathons(), renderHackathons(), selectCountry()

### Community 4 - "User Profile Management"
Cohesion: 0.5
Nodes (4): loadProfile(), toggleSave(), unsaveHackathon(), updateStats()

### Community 5 - "Team Creation"
Cohesion: 0.5
Nodes (4): copyInviteLink(), createTeam(), hideCreateTeam(), showToast()

### Community 6 - "Auth & Navigation"
Cohesion: 0.5
Nodes (4): goTo(), loginUser(), logout(), signupUser()

### Community 7 - "Team Management"
Cohesion: 0.67
Nodes (3): deleteTeam(), joinTeam(), loadTeams()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Team Creation` to `General UI Interaction`, `User Profile Management`, `Auth & Navigation`, `Team Management`, `Team Chat Interaction`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `renderHackathons()` connect `Data Fetching & Rendering` to `General UI Interaction`, `Chat Messaging`, `Rendering Helpers`, `User Profile Management`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `escapeHTML()` connect `Rendering Helpers` to `General UI Interaction`, `Chat Messaging`, `Data Fetching & Rendering`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._