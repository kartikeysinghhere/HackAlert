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
  fetchHackathons();
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
    const daysLeft = Math.ceil((new Date(hack.start) - new Date()) / (1000*60*60*24));
    if (daysLeft <= 5) card.classList.add('urgent');
    else if (daysLeft <= 20) card.classList.add('soon');
    card.innerHTML = `
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
      <button onclick="saveHackathon(this, this.dataset.name)" data-name="${hack.name}" style="margin-left:8px;background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🔖 Save</button>
    `;
    grid.appendChild(card);
  });
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
    const daysLeft = Math.ceil((new Date(hack.start) - new Date()) / (1000*60*60*24));
    if (daysLeft <= 5) card.classList.add('urgent');
    else if (daysLeft <= 20) card.classList.add('soon');
    if (dimmed) card.style.opacity = "0.35";

    card.innerHTML = `
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
      <button onclick="saveHackathon(this, this.dataset.name)" data-name="${hack.name}" style="margin-left:8px;background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🔖 Save</button>
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
  const protectedPages = ['dashboard', 'bot'];
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';

  if (protectedPages.includes(pageId) && !isLoggedIn) {
    goTo('login');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  if (pageId === 'dashboard' && allHackathons.length === 0) fetchHackathons();
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
    const reply = data.reply || data.message || data.response || data.answer || data.text || JSON.stringify(data);
    appendMessage('bot', reply);
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
  if (!name || !email || !pass) return alert('Fill all fields');

  try {
    const res  = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pass })
    });
    const data = await res.json();
    if (res.ok) goTo('dashboard');
    else alert(data.error);
  } catch { alert('Server not running'); }
}

// ── Toggle interest chip ──
function toggleChip(el) {
  el.classList.toggle('selected');
}

// ── Logout ──
function logout() {
  document.getElementById('nav-auth').style.display = '';
  document.getElementById('nav-app').style.display  = 'none';
  localStorage.removeItem('loggedIn');
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
function saveHackathon(btn, name) {
  let saved = JSON.parse(localStorage.getItem('saved') || '[]');
  if (!saved.includes(name)) {
    saved.push(name);
    localStorage.setItem('saved', JSON.stringify(saved));
    btn.textContent = '✅ Saved';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
  } else {
    btn.textContent = '✅ Saved';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
  }
}