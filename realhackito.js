// ── Hack Club Live API ──
const HACKATHON_API_URL = "/api/hackathons";
let allHackathons = [];

// ── Auto-load on page ready ──
window.addEventListener('DOMContentLoaded', () => {
  fetchHackathons();
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
    renderHackathons(allHackathons);
  } catch (error) {
    console.error("API Error:", error);
    allHackathons = getFallbackHackathons();
    renderHackathons(allHackathons);
  }
}
 
// ── Render hackathon cards ──
function renderHackathons(hackathons) {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "";
 
  if (hackathons.length === 0) {
    const query = document.getElementById('search-input')?.value || '';
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#aaa;font-size:16px;">
        🚫 No hackathons found${query ? ` for "<strong>${query}</strong>"` : ''}
      </div>`;
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
 
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${hack.logo
          ? `<img src="${hack.logo}" style="width:40px;height:40px;border-radius:8px;">`
          : `<div class="feature-icon">💻</div>`}
        <h3>${hack.name}</h3>
      </div>
      <p><strong>📅 Date:</strong> ${startDate}</p>
      <p><strong>🌎 Location:</strong> ${hack.virtual ? "Anywhere" : location}</p>
      <p><strong>💻 Mode:</strong> ${mode}</p>
      <a href="${hack.website}" target="_blank">Visit Website →</a>
    `;
 
    grid.appendChild(card);
  });
}
 
// ── Search: matched cards sort to top, rest below ──
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
 
    if (inName || inCity || inCountry) {
      matched.push(h);
    } else {
      rest.push(h);
    }
  });
 
  // matches on top, rest below (slightly dimmed via class)
  renderHackathonsSorted(matched, rest);
}
 
// ── Render with matches on top, rest dimmed below ──
function renderHackathonsSorted(matched, rest) {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "";
 
  if (matched.length === 0 && rest.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#aaa;">🚫 No hackathons found</div>`;
    return;
  }
 
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
    if (dimmed) card.style.opacity = "0.35";
 
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${hack.logo
          ? `<img src="${hack.logo}" style="width:40px;height:40px;border-radius:8px;">`
          : `<div class="feature-icon">💻</div>`}
        <h3>${hack.name}</h3>
      </div>
      <p><strong>📅 Date:</strong> ${startDate}</p>
      <p><strong>🌎 Location:</strong> ${hack.virtual ? "Anywhere" : location}</p>
      <p><strong>💻 Mode:</strong> ${mode}</p>
      <a href="${hack.website}" target="_blank">Visit Website →</a>
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
 
  // clear search when filtering
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
 
  if (type === 'online')       renderHackathons(allHackathons.filter(h => h.virtual));
  else if (type === 'hybrid')  renderHackathons(allHackathons.filter(h => h.hybrid));
  else if (type === 'offline') renderHackathons(allHackathons.filter(h => !h.virtual && !h.hybrid));
  else                         renderHackathons(allHackathons);
}
 
// ── Page navigation ──
function goTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
 
  if (pageId === 'dashboard' && allHackathons.length === 0) {
    fetchHackathons();
  }
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
 
// ── Chat ──
async function sendChat() {
  const input   = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
 
  try {
    const res  = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    console.log(data);
  } catch { console.log("Chat error"); }
}
 
// ── Quick send (bot page chips) ──
function quickSend(btn) {
  const input = document.getElementById('chat-input');
  input.value = btn.textContent;
  sendChat();
}
 
// ── Toggle interest chip ──
function toggleChip(el) {
  el.classList.toggle('selected');
}
 
// ── Logout ──
function logout() {
  document.getElementById('nav-auth').style.display = '';
  document.getElementById('nav-app').style.display  = 'none';
  goTo('landing');
}
 
// ── Fallback Data ──
function getFallbackHackathons() {
  return [
    { name:"Global AI Hack 2026", start:"2026-05-15", city:"San Francisco", country:"USA", virtual:false, hybrid:true,  website:"#" },
    { name:"Web3 Weekend",        start:"2026-05-20", city:"",              country:"",    virtual:true,  hybrid:false, website:"#" },
    { name:"India HackFest",      start:"2026-06-01", city:"Bangalore",     country:"India",virtual:false,hybrid:false, website:"#" },
    { name:"ML Marathon",         start:"2026-06-10", city:"New York",      country:"USA", virtual:true,  hybrid:false, website:"#" }
  ];
}
 