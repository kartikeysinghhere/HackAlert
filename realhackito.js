// ── Hack Club Live API ──
const HACKATHON_API_URL = "/api/hackathons";
let allHackathons = [];
 
// ── Fetch hackathons from live API ──
async function fetchHackathons() {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; color: #aaa;'>Loading live hackathons...</p>";
 
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
    grid.innerHTML = "<p style='grid-column: 1 / -1; text-align: center; color: #aaa;'>No hackathons found for this filter.</p>";
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
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        ${hack.logo
          ? `<img src="${hack.logo}" alt="logo" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">`
          : `<div class="feature-icon">💻</div>`
        }
        <h3 style="margin:0; font-size:1.1rem;">${hack.name}</h3>
      </div>
      <p style="margin:6px 0; font-size:14px;"><strong>📅 Date:</strong> ${startDate}</p>
      <p style="margin:6px 0; font-size:14px;"><strong>🌎 Location:</strong> ${hack.virtual ? "Anywhere" : location}</p>
      <p style="margin:6px 0; font-size:14px;"><strong>💻 Mode:</strong> ${mode}</p>
      <a href="${hack.website}" target="_blank"
        style="display:inline-block;margin-top:12px;color:#00ff66;text-decoration:none;font-weight:bold;">
        Visit Website →
      </a>
    `;
    grid.appendChild(card);
  });
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
  const pass = document.getElementById('login-pass').value.trim();
  if (!email || !pass) return alert('Please fill in all fields.');
 
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('nav-auth').style.display = 'none';
      document.getElementById('nav-app').style.display = 'flex';
      goTo('dashboard');
    } else {
      alert(data.error || 'Login failed');
    }
  } catch (err) {
    alert('Cannot connect to server. Is node server.js running?');
  }
}
 
// ── Signup ──
async function signupUser() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value.trim();
  if (!name || !email || !pass) return alert('Please fill in all fields.');
 
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pass })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('nav-auth').style.display = 'none';
      document.getElementById('nav-app').style.display = 'flex';
      goTo('dashboard');
    } else {
      alert(data.error || 'Signup failed');
    }
  } catch (err) {
    alert('Cannot connect to server. Is node server.js running?');
  }
}
 
// ── Logout ──
function logout() {
  document.getElementById('nav-auth').style.display = 'flex';
  document.getElementById('nav-app').style.display = 'none';
  goTo('landing');
}
 
// ── Filter hackathon cards ──
function filterCards(btn, type) {
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
 
  if (type === 'online')       renderHackathons(allHackathons.filter(h => h.virtual));
  else if (type === 'hybrid')  renderHackathons(allHackathons.filter(h => h.hybrid));
  else if (type === 'offline') renderHackathons(allHackathons.filter(h => !h.virtual && !h.hybrid));
  else                         renderHackathons(allHackathons);
}
 
// ── Interest chips on signup ──
function toggleChip(chip) { chip.classList.toggle('selected'); }
 
// ── Quick prompt buttons in chat ──
function quickSend(btn) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = btn.innerText;
    sendChat();
  }
}
 
// ── Send chat message to HackBot ──
async function sendChat() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;
 
  const chatArea = document.getElementById('chat-area');
 
  // Show user message
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-bubble">${message}</div>
  `;
  chatArea.appendChild(userMsg);
  input.value = '';
  chatArea.scrollTop = chatArea.scrollHeight;
 
  // Show typing indicator
  const typingMsg = document.createElement('div');
  typingMsg.className = 'msg bot';
  typingMsg.id = 'typing-indicator';
  typingMsg.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  chatArea.appendChild(typingMsg);
  chatArea.scrollTop = chatArea.scrollHeight;
 
  // Call backend — ONE fetch, no duplicates
  try {
    const response = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
 
    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();
 
    typingMsg.remove();
 
    const botMsg = document.createElement('div');
    botMsg.className = 'msg bot';
    botMsg.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">${data.answer}</div>
    `;
    chatArea.appendChild(botMsg);
    chatArea.scrollTop = chatArea.scrollHeight;
 
    // If bot triggers a filter action
    if (data.action === 'filter' && data.filterType) {
      const pills = Array.from(document.querySelectorAll('.filter-pill'));
      const btn = pills.find(p => p.innerText.toLowerCase().includes(data.filterType));
      if (btn) filterCards(btn, data.filterType);
      setTimeout(() => goTo('dashboard'), 2000);
    }
 
  } catch (error) {
    typingMsg.remove();
    console.error("Chat error:", error);
 
    const errorMsg = document.createElement('div');
    errorMsg.className = 'msg bot';
    errorMsg.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble" style="color:#ff5555;border:1px solid #ff5555;background:rgba(255,85,85,0.1);">
        <strong>Connection Error:</strong> Backend not reachable. 
        Make sure <code>node server.js</code> is running and you're on 
        <code>http://localhost:3000</code>.
      </div>
    `;
    chatArea.appendChild(errorMsg);
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}
 
// ── Fallback hackathon data (when API is empty or blocked) ──
function getFallbackHackathons() {
  return [
    {
      name: "Global AI Hack 2026",
      start: "2026-05-15T09:00:00.000Z",
      city: "San Francisco", country: "United States",
      virtual: false, hybrid: true,
      website: "https://example.com"
    },
    {
      name: "Web3 Builders Weekend",
      start: "2026-05-20T10:00:00.000Z",
      city: "", country: "",
      virtual: true, hybrid: false,
      website: "https://example.com"
    },
    {
      name: "Hackito Offline Summit",
      start: "2026-06-10T09:00:00.000Z",
      city: "Bangalore", country: "India",
      virtual: false, hybrid: false,
      website: "https://example.com"
    }
  ];
}