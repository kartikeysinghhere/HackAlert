// ── Hack Club Live API ──
const HACKATHON_API_URL = "/api/hackathons";
let allHackathons = [];

function getCountdown(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days}d ${hours}h left`;
}

// ── Auto-load on page ready ──
window.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
  if (isLoggedIn) {
    fetchHackathons();
    document.getElementById('nav-auth').style.display = 'none';
    document.getElementById('nav-app').style.display = 'flex';
    const btn = document.getElementById('get-started-btn');
    if (btn) btn.style.display = 'none';
  }
  showWelcomeMessage();
});

// ── Fetch hackathons from live API ──
async function fetchHackathons() {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:#aaa;padding:40px 0;'>Loading live hackathons...</p>";

  try {
    const response = await fetch(HACKATHON_API_URL);
    allHackathons = await response.json();
    if (!allHackathons || allHackathons.length === 0) {
      allHackathons = getFallbackHackathons();
    }
    allHackathons.sort((a, b) => new Date(a.start) - new Date(b.start));
    renderHackathons(allHackathons);
  } catch (error) {
    console.error("API Error:", error);
    allHackathons = getFallbackHackathons();
    allHackathons.sort((a, b) => new Date(a.start) - new Date(b.start));
    renderHackathons(allHackathons);
  }
}

// ── Render hackathon cards ──
function renderHackathons(hackathons) {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "";

  if (hackathons.length === 0) {
    const query = document.getElementById('search-input')?.value || '';
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#aaa;font-size:16px;">🚫 No hackathons found${query ? ` for "<strong>${query}</strong>"` : ''}</div>`;
    return;
  }

  hackathons.forEach(hack => {
    let mode = "📍 In-Person";
    if (hack.virtual) mode = "🌐 Online";
    if (hack.hybrid) mode = "🔀 Hybrid";

    const startDate = new Date(hack.start).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    const location = hack.city ? `${hack.city}, ${hack.country}` : "TBA";

    const card = document.createElement("div");
    card.className = "feature-card";
    card.style.cursor = "pointer";
    card.onclick = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
    openModal(hack);
  };
    const daysLeft = Math.ceil((new Date(hack.start) - new Date()) / (1000*60*60*24));
    if (daysLeft <= 5) card.classList.add('urgent');
    else if (daysLeft <= 20) card.classList.add('soon');
    card.innerHTML = `
      ${hack.banner ? `<img src="${hack.banner}" style="width:100%;height:120px;object-fit:cover;border-radius:12px;margin-bottom:12px;">` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${hack.logo
          ? `<img src="${hack.logo}" style="width:40px;height:40px;border-radius:8px;">`
          : `<div class="feature-icon">💻</div>`}
        <h3>${hack.name}</h3>
      </div>
      <p><strong>📅 Date:</strong> ${startDate}</p>
      <p><strong>⏳ Deadline:</strong> ${getCountdown(hack.start)}</p>
      <p><strong>🌎 Location:</strong> ${hack.virtual ? "Anywhere" : location}</p>
      <p><strong>💻 Mode:</strong> ${mode}</p>
      ${hack.state ? `<p><strong>📍 State:</strong> ${hack.state}</p>` : ''}
      ${hack.mlhAssociated ? `<p><strong>🎓 MLH:</strong> Associated</p>` : ''}
      ${hack.hack_club_event ? `<p><strong>🏠 Hack Club:</strong> Official Event ✅</p>` : ''}
      ${hack.apac ? `<p><strong>🌏 Region:</strong> Asia Pacific</p>` : ''}
      <a href="${hack.website}" target="_blank">Visit Website →</a>
      <a href="https://wa.me/?text=Check out ${hack.name}: ${hack.website}" target="_blank" style="margin-left:8px;">📲 WhatsApp</a>
      <button onclick="copyLink(this, '${hack.website}')" style="margin-left:8px;background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🔗 Copy</button>
      <button onclick="toggleSave(this, this.dataset.name)" data-name="${hack.name}" style="margin-left:8px;background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🔖 Save</button>
    `;
    grid.appendChild(card);
  });
  updateStats();      
  buildCountryList(); 
}

// ── Search: matched cards sort to top, rest dimmed below ──
function searchHackathons(query) {
  const q = query.toLowerCase().trim();

  if (!q) {
    renderHackathons(allHackathons);
    return;
  }

  const matched = [];
  const rest = [];

  allHackathons.forEach(h => {
    const inName    = h.name.toLowerCase().includes(q);
    const inCity    = h.city && h.city.toLowerCase().includes(q);
    const inCountry = h.country && h.country.toLowerCase().includes(q);
    if (inName || inCity || inCountry) matched.push(h);
    else rest.push(h);
  });

  renderHackathonsSorted(matched, rest);
}

// ── Render sorted with matches on top ──
function renderHackathonsSorted(matched, rest) {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "";

  const render = (hack, dimmed) => {
    let mode = "📍 In-Person";
    if (hack.virtual) mode = "🌐 Online";
    if (hack.hybrid) mode = "🔀 Hybrid";

    const startDate = new Date(hack.start).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const location = hack.city ? `${hack.city}, ${hack.country}` : "TBA";

    const card = document.createElement("div");
    card.className = "feature-card";
    card.className = "feature-card";
    card.style.cursor = "pointer";
    card.onclick = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
    openModal(hack);
  };
    const daysLeft = Math.ceil((new Date(hack.start) - new Date()) / (1000*60*60*24));
    if (daysLeft <= 5) card.classList.add('urgent');
    else if (daysLeft <= 20) card.classList.add('soon');
    if (dimmed) card.style.opacity = "0.35";

    card.innerHTML = `
      ${hack.banner ? `<img src="${hack.banner}" style="width:100%;height:120px;object-fit:cover;border-radius:12px;margin-bottom:12px;">` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${hack.logo
          ? `<img src="${hack.logo}" style="width:40px;height:40px;border-radius:8px;">`
          : `<div class="feature-icon">💻</div>`}
        <h3>${hack.name}</h3>
      </div>
      <p><strong>📅 Date:</strong> ${startDate}</p>
      <p><strong>⏳ Deadline:</strong> ${getCountdown(hack.start)}</p>
      <p><strong>🌎 Location:</strong> ${hack.virtual ? "Anywhere" : location}</p>
      <p><strong>💻 Mode:</strong> ${mode}</p>
      ${hack.state ? `<p><strong>📍 State:</strong> ${hack.state}</p>` : ''}
      ${hack.mlhAssociated ? `<p><strong>🎓 MLH:</strong> Associated</p>` : ''}
      ${hack.hack_club_event ? `<p><strong>🏠 Hack Club:</strong> Official Event ✅</p>` : ''}
      ${hack.apac ? `<p><strong>🌏 Region:</strong> Asia Pacific</p>` : ''}
      <a href="${hack.website}" target="_blank">Visit Website →</a>
      <a href="https://wa.me/?text=Check out ${hack.name}: ${hack.website}" target="_blank" style="margin-left:8px;">📲 WhatsApp</a>
      <button onclick="copyLink(this, '${hack.website}')" style="margin-left:8px;background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🔗 Copy</button>
      <button onclick="toggleSave(this, this.dataset.name)" data-name="${hack.name}" style="margin-left:8px;background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🔖 Save</button>
    `;
    grid.appendChild(card);
  };

  matched.forEach(h => render(h, false));
  rest.forEach(h => render(h, true));
}

// ── Filter hackathon cards ──
function filterCards(btn, type) {
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  if (type === 'online')       renderHackathons(allHackathons.filter(h => h.virtual));
  else if (type === 'hybrid')  renderHackathons(allHackathons.filter(h => h.hybrid));
  else if (type === 'offline') renderHackathons(allHackathons.filter(h => !h.virtual && !h.hybrid));
  else                         renderHackathons(allHackathons);
}

// ── Page navigation ──
function goTo(pageId) {
  if (pageId === 'teams') loadTeams();
  const protectedPages = ['dashboard', 'bot', 'profile', 'teams'];
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';

  if (protectedPages.includes(pageId) && !isLoggedIn) {
    goTo('login');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  if (pageId === 'dashboard' && allHackathons.length === 0) fetchHackathons();
  if (pageId === 'profile') loadProfile();
}

// ── Append message bubble to chat ──
function appendMessage(role, text) {
  const area = document.getElementById('chat-area');
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;
  msg.innerHTML = `
    <div class="msg-avatar">${role === 'bot' ? '🤖' : '👤'}</div>
    <div class="msg-bubble">${text}</div>
  `;
  area.appendChild(msg);
  area.scrollTop = area.scrollHeight;
}

// ── Show typing indicator ──
function showTyping() {
  const area = document.getElementById('chat-area');
  const typing = document.createElement('div');
  typing.className = 'msg bot';
  typing.id = 'typing-indicator';
  typing.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  area.appendChild(typing);
  area.scrollTop = area.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

// ── Welcome message on load ──
function showWelcomeMessage() {
  setTimeout(() => {
    appendMessage('bot', "Hey! 👋 I'm <strong>HackBot</strong>. Ask me anything about hackathons — upcoming events, online ones, prizes, or anything else!");
  }, 600);
}

// ── Send chat message ──
async function sendChat() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendMessage('user', message);
  showTyping();

  // local smart reply
if (message.toLowerCase().includes('nearest') || message.toLowerCase().includes('closest')) {
  const next = allHackathons[0];
  if (next) {
    removeTyping();
    appendMessage('bot', `🏆 Nearest hackathon is <strong>${next.name}</strong> on 📅 ${new Date(next.start).toLocaleDateString()} — ${next.virtual ? '🌐 Online' : `📍 ${next.city}, ${next.country}`}. <a href="${next.website}" target="_blank">Visit →</a>`);
    return;
  }
}

  try {
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    removeTyping();

    // handle whatever key your backend returns
    const reply = data.answer || data.reply || data.message || data.response || data.text || JSON.stringify(data);
    appendMessage('bot', reply);
    if (data.action === 'filter' && data.filterType) {
    const pill = document.querySelector(`.filter-pill[onclick*="${data.filterType}"]`);
    if (pill) filterCards(pill, data.filterType);
  }
  } catch (err) {
    removeTyping();
    appendMessage('bot', "⚠️ Couldn't reach the server. Make sure the backend is running.");
  }
}

// ── Quick send chips ──
function quickSend(btn) {
  const input = document.getElementById('chat-input');
  input.value = btn.textContent;
  sendChat();
}

// ── Login ──
async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value.trim();
  if (!email || !pass) return alert('Fill all fields');

  try {
    const res  = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('nav-auth').style.display = 'none';
      document.getElementById('nav-app').style.display  = 'flex';
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', data.user?.name || '');
      goTo('dashboard');
    } else {
      alert(data.error);
    }
  } catch { alert('Server not running'); }
}

// ── Signup ──
async function signupUser() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value.trim();
  const mobile = document.getElementById('signup-mobile').value.trim();
  const college = document.getElementById('signup-college').value.trim();
  if (!name || !email || !pass || !mobile || !college) return alert('Fill all fields');

  try {
    const res  = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pass, mobile, college })
    });
    const data = await res.json();
    if (res.ok) {
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userMobile', mobile);
    localStorage.setItem('userCollege', college);
    goTo('dashboard');
}
    else alert(data.error);
  } catch { alert('Server not running'); }
}

// ── Toggle interest chip ──
function toggleChip(el) {
  el.classList.toggle('selected');
}

function loadProfile() {
  const name    = localStorage.getItem('userName') || '—';
  const email   = localStorage.getItem('userEmail') || '—';
  const mobile  = localStorage.getItem('userMobile') || '—';
  const college = localStorage.getItem('userCollege') || '—';

  document.getElementById('profile-name').textContent    = name;
  document.getElementById('profile-email').textContent   = email;
  document.getElementById('profile-mobile').textContent  = mobile;
  document.getElementById('profile-college').textContent = college;

  const saved = JSON.parse(localStorage.getItem('saved') || '[]');
  const list  = document.getElementById('saved-list');

  if (saved.length === 0) {
    list.innerHTML = '<p style="color:var(--muted)">No hackathons saved yet.</p>';
  } else {
    list.innerHTML = saved.map(name => `
      <div style="padding:8px 12px;margin-bottom:8px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <span>🔖 ${name}</span>
        <button onclick="unsaveHackathon('${name}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px;">✕ Remove</button>
      </div>
    `).join('');
  }
}

// ── Logout ──
function logout() {
  if (!confirm('Are you sure you want to log out?')) return;
  document.getElementById('nav-auth').style.display = '';
  document.getElementById('nav-app').style.display  = 'none';
  localStorage.removeItem('loggedIn');
  const btn = document.getElementById('get-started-btn');
  if (btn) btn.style.display = '';
  goTo('landing');
}

// ── Fallback Data ──
function getFallbackHackathons() {
  return [
    { name:"Global AI Hack 2026", start:"2026-05-15", city:"San Francisco", country:"USA",   virtual:false, hybrid:true,  website:"#" },
    { name:"Web3 Weekend",        start:"2026-05-20", city:"",              country:"",       virtual:true,  hybrid:false, website:"#" },
    { name:"India HackFest",      start:"2026-06-01", city:"Bangalore",     country:"India",  virtual:false, hybrid:false, website:"#" },
    { name:"ML Marathon",         start:"2026-06-10", city:"New York",      country:"USA",    virtual:true,  hybrid:false, website:"#" }
  ];
}

function toggleSave(btn, name) {
  let saved = JSON.parse(localStorage.getItem('saved') || '[]');
  if (saved.includes(name)) {
    saved = saved.filter(s => s !== name);
    localStorage.setItem('saved', JSON.stringify(saved));
    btn.textContent = '🔖 Save';
    btn.style.borderColor = 'var(--border-light)';
    btn.style.color = 'var(--muted)';
  } else {
    saved.push(name);
    localStorage.setItem('saved', JSON.stringify(saved));
    btn.textContent = '✅ Saved';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
  }
  updateStats();
  buildCountryList();
}

function copyLink(btn, url) {
  navigator.clipboard.writeText(url);
  btn.textContent = '✅ Copied!';
  btn.style.borderColor = 'var(--accent)';
  btn.style.color = 'var(--accent)';
  setTimeout(() => {
    btn.textContent = '🔗 Copy';
    btn.style.borderColor = 'var(--border-light)';
    btn.style.color = 'var(--muted)';
  }, 2000);
} 

function unsaveHackathon(name) {
  let saved = JSON.parse(localStorage.getItem('saved') || '[]');
  saved = saved.filter(s => s !== name);
  localStorage.setItem('saved', JSON.stringify(saved));
  loadProfile();
}

function updateStats() {
  const now = new Date();
  document.getElementById('stat-total').textContent = allHackathons.length;
  document.getElementById('stat-upcoming').textContent = allHackathons.filter(h => new Date(h.start) > now).length;
  document.getElementById('stat-ended').textContent = allHackathons.filter(h => new Date(h.start) <= now).length;
  document.getElementById('stat-saved').textContent = JSON.parse(localStorage.getItem('saved') || '[]').length;
}

function filterByCountry(country) {
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  document.querySelector('.filter-pill').classList.add('active');
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  if (country === 'all') {
    renderHackathons(allHackathons);
  } else {
    renderHackathons(allHackathons.filter(h => h.country === country));
  }
}

function buildCountryList() {
  const countries = ['All Countries','Afghanistan','Albania','Algeria','Argentina',
    'Australia','Austria','Azerbaijan','Bangladesh','Belarus','Belgium','Bolivia',
    'Brazil','Cambodia','Canada','Chile','China','Colombia','Croatia','Czech Republic',
    'Denmark','Ecuador','Egypt','Estonia','Ethiopia','Finland','France','Georgia',
    'Germany','Ghana','Greece','Hungary','India','Indonesia','Iran','Iraq','Ireland',
    'Israel','Italy','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon',
    'Lithuania','Malaysia','Mexico','Morocco','Myanmar','Nepal','Netherlands',
    'New Zealand','Nigeria','Norway','Pakistan','Peru','Philippines','Poland',
    'Portugal','Romania','Russia','Saudi Arabia','Serbia','Singapore','Slovakia',
    'Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland',
    'Taiwan','Thailand','Turkey','Uganda','Ukraine','United Arab Emirates',
    'United Kingdom','United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Zimbabwe'];

  const list = document.getElementById('country-list');
  if (!list) return;
  list.innerHTML = countries.map(c => `
    <div onmousedown="selectCountry('${c}')"
      style="padding:8px 12px;cursor:pointer;font-family:var(--mono);font-size:12px;color:var(--muted);"
      onmouseover="this.style.color='var(--accent)'"
      onmouseout="this.style.color='var(--muted)'">${c}</div>
  `).join('');
}

function filterCountryList(q) {
  const list = document.getElementById('country-list');
  list.style.display = 'block';
  list.querySelectorAll('div').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none';
  });
}

function selectCountry(country) {
  const input = document.getElementById('country-search');
  if (input) input.value = country === 'All Countries' ? '' : country;
  const list = document.getElementById('country-list');
  if (list) list.style.display = 'none';
  if (country === 'All Countries') renderHackathons(allHackathons);
  else renderHackathons(allHackathons.filter(h => h.country === country));
}

function openModal(hack) {
  const startDate = new Date(hack.start).toLocaleDateString(undefined, {month:'long',day:'numeric',year:'numeric'});
  let mode = "📍 In-Person";
  if (hack.virtual) mode = "🌐 Online";
  if (hack.hybrid) mode = "🔀 Hybrid";

  document.getElementById('modal-content').innerHTML = `
    ${hack.banner ? `<img src="${hack.banner}" style="width:100%;height:160px;object-fit:cover;border-radius:12px;margin-bottom:20px;">` : ''}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      ${hack.logo ? `<img src="${hack.logo}" style="width:48px;height:48px;border-radius:10px;">` : '<div style="font-size:32px;">💻</div>'}
      <div>
        <h2 style="color:#fff;margin:0;">${hack.name}</h2>
        <p style="color:var(--accent);font-family:var(--mono);font-size:12px;margin:4px 0;">${mode}</p>
      </div>
    </div>
    <div style="display:grid;gap:12px;font-size:14px;color:var(--muted);">
      <p>📅 <strong style="color:var(--text);">Date:</strong> ${startDate}</p>
      <p>⏳ <strong style="color:var(--text);">Deadline:</strong> ${getCountdown(hack.start)}</p>
      <p>🌎 <strong style="color:var(--text);">Location:</strong> ${hack.virtual ? "Anywhere" : (hack.city ? `${hack.city}, ${hack.country}` : "TBA")}</p>
      ${hack.state ? `<p>📍 <strong style="color:var(--text);">State:</strong> ${hack.state}</p>` : ''}
      ${hack.mlhAssociated ? `<p>🎓 <strong style="color:var(--text);">MLH:</strong> Associated</p>` : ''}
      ${hack.hack_club_event ? `<p>🏠 <strong style="color:var(--text);">Hack Club:</strong> Official Event ✅</p>` : ''}
      ${hack.apac ? `<p>🌏 <strong style="color:var(--text);">Region:</strong> Asia Pacific</p>` : ''}
    </div>
    <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;">
      <a href="${hack.website}" target="_blank" style="background:var(--accent);color:#050508;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;font-family:var(--mono);">Register Now →</a>
      <a href="https://wa.me/?text=Check out ${hack.name}: ${hack.website}" target="_blank" style="background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-family:var(--mono);">📲 WhatsApp</a>
    </div>
  `;
  document.getElementById('hack-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('hack-modal').style.display = 'none';
}

// ── TEAMS ──
let currentTeamId = null;
let chatInterval = null;

async function loadTeams() {
  const grid = document.getElementById('teams-grid');
  grid.innerHTML = '<p style="color:#aaa;padding:20px;">Loading teams...</p>';
  const res = await fetch('/api/teams');
  const teams = await res.json();
  if (!teams.length) { grid.innerHTML = '<p style="color:#aaa;padding:20px;">No teams yet. Create one!</p>'; return; }
  grid.innerHTML = teams.map(t => `
    <div class="feature-card">
      <h3>${t.name}</h3>
      <p style="color:var(--muted);font-size:13px;">🏆 ${t.hackathon || 'Open'}</p>
      <p style="font-size:13px;margin-top:8px;">🛠 ${t.skills || 'Any'}</p>
      <p style="font-size:13px;">👥 ${t.slots_left} slots left / ${t.size}</p>
      <p style="font-size:12px;color:var(--muted);">Leader: ${t.leader_email}</p>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button onclick="joinTeam(${t.id})" style="background:var(--accent);color:#050508;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Join</button>
        <button onclick="openTeamChat(${t.id},'${t.name}')" style="background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;">💬 Chat</button>
      </div>
    </div>
  `).join('');
}

function showCreateTeam() {
  document.getElementById('create-team-modal').style.display = 'flex';
}
function hideCreateTeam() {
  document.getElementById('create-team-modal').style.display = 'none';
}

async function createTeam() {
  const name = document.getElementById('team-name').value.trim();
  const hackathon = document.getElementById('team-hackathon').value.trim();
  const skills = document.getElementById('team-skills').value.trim();
  const size = parseInt(document.getElementById('team-size').value);
  const leader_email = localStorage.getItem('userEmail');
  if (!name || !leader_email) return alert('Fill team name and make sure you are logged in');
  const res = await fetch('/api/teams/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, hackathon, skills, size, leader_email })
  });
  if (res.ok) { hideCreateTeam(); loadTeams(); }
  else { const d = await res.json(); alert(d.error); }
}

async function joinTeam(teamId) {
  const user_email = localStorage.getItem('userEmail');
  const user_name = localStorage.getItem('userName');
  if (!user_email) return alert('Please login first');
  const res = await fetch('/api/teams/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_id: teamId, user_email, user_name })
  });
  const d = await res.json();
  alert(res.ok ? '✅ Joined successfully!' : d.error);
  if (res.ok) loadTeams();
}

async function openTeamChat(teamId, teamName) {
  currentTeamId = teamId;
  document.getElementById('chat-team-name').textContent = teamName;
  document.getElementById('team-chat-modal').style.display = 'flex';
  await loadTeamMessages();
  chatInterval = setInterval(loadTeamMessages, 5000);
}

function closeTeamChat() {
  document.getElementById('team-chat-modal').style.display = 'none';
  clearInterval(chatInterval);
  currentTeamId = null;
}

async function loadTeamMessages() {
  const area = document.getElementById('team-chat-area');
  const res = await fetch(`/api/teams/${currentTeamId}/messages`);
  const msgs = await res.json();
  area.innerHTML = msgs.map(m => `
    <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;">
      <strong style="color:var(--accent);font-size:12px;">${m.sender_name || m.sender_email}</strong>
      <p style="font-size:14px;margin-top:4px;color:var(--text);">${m.message}</p>
      <p style="font-size:11px;color:var(--muted);margin-top:4px;">${new Date(m.sent_at).toLocaleTimeString()}</p>
    </div>
  `).join('');
  area.scrollTop = area.scrollHeight;
}

async function sendTeamMessage() {
  const input = document.getElementById('team-msg-input');
  const message = input.value.trim();
  if (!message) return;
  const sender_email = localStorage.getItem('userEmail');
  const sender_name = localStorage.getItem('userName');
  input.value = '';
  await fetch(`/api/teams/${currentTeamId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_email, sender_name, message })
  });
  loadTeamMessages();
}
