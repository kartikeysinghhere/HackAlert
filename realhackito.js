// ── Hack Club Live API ──
const HACKATHON_API_URL = "/api/hackathons";
let allHackathons = [];

// Add chatHistory array for the bot
let chatHistory = [];

// Banned words list and censor function
const bannedWords = ['fuck', 'shit', 'ass', 'bastard', 'bitch', 'damn', 'crap', 'chutiye', 'madarchod', 'bhadwe', 'randi', 'rand', 'bhosdi', 'bsdk', 'gandu', 'behenchod', 'behencho', 'bc', 'tmkc', 'jhatu', 'mc', 'bhenchod', 'pussy']; // Extend as needed
function censorMessage(text) {
  let censoredText = text;
  bannedWords.forEach(word => { const regex = new RegExp(`\\b${word}\\b`, 'gi'); censoredText = censoredText.replace(regex, '*'.repeat(word.length)); });
  return censoredText;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function safeJSString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function getCountdown(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (isNaN(diff)) return "TBA";
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
    startHeartbeat();
    setInterval(fetchOnlineUsers, 15000);
    fetchOnlineUsers();
    startCountdowns();
  }
  showWelcomeMessage();

  // ADDED: handle invite link
  const params = new URLSearchParams(window.location.search);
  const joinTeamId = params.get('join_team');
  if (joinTeamId) {
    if (!isLoggedIn) {
      // Store intent, redirect to login
      sessionStorage.setItem('pendingJoinTeam', joinTeamId);
      goTo('login');
    } else {
      goTo('teams');
      // Wait for teams to load then auto-open chat
      setTimeout(() => openTeamChat(parseInt(joinTeamId), 'Team'), 800);
    }
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }
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

// ── Create single hackathon card element ──
function createHackathonCard(hack, isDimmed = false) {
  const savedList = JSON.parse(localStorage.getItem('saved') || '[]');
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
  const daysLeft = Math.ceil((new Date(hack.start) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 5) card.classList.add('urgent');
  else if (daysLeft <= 20) card.classList.add('soon');
  if (isDimmed) card.style.opacity = "0.35";

  const isSaved = savedList.some(s => s.name === hack.name);
  card.innerHTML = `
    ${hack.banner ? `<img src="${escapeHTML(hack.banner)}" style="width:100%;height:120px;object-fit:cover;border-radius:12px;margin-bottom:12px;">` : ''}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      ${hack.logo
      ? `<img src="${escapeHTML(hack.logo)}" style="width:40px;height:40px;border-radius:8px;">`
      : `<div class="feature-icon">💻</div>`}
      <h3>${escapeHTML(hack.name)}</h3>
    </div>
    <p><strong>📅 Date:</strong> ${startDate}</p>
    <p><strong>⏳ Deadline:</strong> <span data-countdown="${hack.start}">${getCountdown(hack.start)}</span></p>
    <p><strong>🌎 Location:</strong> ${hack.virtual ? "Anywhere" : escapeHTML(location)}</p>
    <p><strong>💻 Mode:</strong> ${mode}</p>
    ${hack.state ? `<p><strong>📍 State:</strong> ${escapeHTML(hack.state)}</p>` : ''}
    ${hack.mlhAssociated ? `<p><strong>🎓 MLH:</strong> Associated</p>` : ''}
    ${hack.hack_club_event ? `<p><strong>🏠 Hack Club:</strong> Official Event ✅</p>` : ''}
    ${hack.apac ? `<p><strong>🌏 Region:</strong> Asia Pacific</p>` : ''}
    <a href="${escapeHTML(hack.website)}" target="_blank">Visit Website →</a>
    <a href="https://wa.me/?text=Check out ${encodeURIComponent(hack.name)}: ${encodeURIComponent(hack.website)}" target="_blank" style="margin-left:8px;">📲 WhatsApp</a>
    <button onclick="copyLink(this, '${safeJSString(hack.website)}')" style="margin-left:8px;background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">🔗 Copy</button>
    <button onclick="toggleSave(this)" data-name="${escapeHTML(hack.name)}" data-start="${hack.start}" style="margin-left:8px;background:transparent;border:1px solid ${isSaved ? 'var(--accent)' : 'var(--border-light)'};color:${isSaved ? 'var(--accent)' : 'var(--muted)'};padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">${isSaved ? '✅ Saved' : '🔖 Save'}</button>
  `;
  return card;
}

// ── Render hackathon cards ──
function renderHackathons(hackathons) {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "";

  if (hackathons.length === 0) {
    const query = escapeHTML(document.getElementById('search-input')?.value || '');
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#aaa;font-size:16px;">🚫 No hackathons found${query ? ` for "<strong>${query}</strong>"` : ''}</div>`;
    return;
  }

  hackathons.forEach(hack => {
    grid.appendChild(createHackathonCard(hack));
  });
  updateStats();
  buildCountryList();
}

// ── Search: matched cards sort to top, rest dimmed below ──
let searchTimeout = null;
function searchHackathons(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const q = query.toLowerCase().trim();

    if (!q) {
      renderHackathons(allHackathons);
      return;
    }

    const matched = [];
    const rest = [];

    allHackathons.forEach(h => {
      const inName = h.name.toLowerCase().includes(q);
      const inCity = h.city && h.city.toLowerCase().includes(q);
      const inCountry = h.country && h.country.toLowerCase().includes(q);
      if (inName || inCity || inCountry) matched.push(h);
      else rest.push(h);
    });

    renderHackathonsSorted(matched, rest);
  }, 300);
}

// ── Render sorted with matches on top ──
function renderHackathonsSorted(matched, rest) {
  const grid = document.getElementById("hackathon-grid");
  grid.innerHTML = "";

  if (matched.length === 0 && rest.length === 0) {
    const query = escapeHTML(document.getElementById('search-input')?.value || '');
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#aaa;font-size:16px;">🚫 No hackathons found for "<strong>${query}</strong>"</div>`;
    return;
  }

  matched.forEach(h => grid.appendChild(createHackathonCard(h, false)));
  rest.forEach(h => grid.appendChild(createHackathonCard(h, true)));
}

// ── Filter hackathon cards ──
function filterCards(btn, type) {
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  if (type === 'online') renderHackathons(allHackathons.filter(h => h.virtual));
  else if (type === 'hybrid') renderHackathons(allHackathons.filter(h => h.hybrid));
  else if (type === 'offline') renderHackathons(allHackathons.filter(h => !h.virtual && !h.hybrid));
  else renderHackathons(allHackathons);
}

// ── Page navigation ──
function goTo(pageId) {
  const protectedPages = ['dashboard', 'bot', 'profile', 'teams', 'calendar', 'showcase', 'messages', 'ai-tools', 'public-profile'];
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';

  if (protectedPages.includes(pageId) && !isLoggedIn) {
    goTo('login');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  if (pageId === 'dashboard' && allHackathons.length === 0) fetchHackathons();
  if (pageId === 'profile') loadProfile();
  if (pageId === 'teams') loadTeams();
  if (pageId === 'calendar') renderCalendar();
  if (pageId === 'showcase') loadShowcase();
  if (pageId === 'messages') loadConversations();
  if (pageId === 'ai-tools') { }
  if (pageId === 'public-profile') { }
}

// ── Append message bubble to chat ──
function appendMessage(role, text, isHTML = false) {
  const area = document.getElementById('chat-area');
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;
  let displayText;
  if (isHTML) {
    displayText = text;
  } else if (role === 'bot') {
    displayText = (window.marked && window.DOMPurify) 
      ? DOMPurify.sanitize(marked.parse(censorMessage(text)))
      : escapeHTML(censorMessage(text));
  } else {
    displayText = escapeHTML(censorMessage(text));
  }
  msg.innerHTML = `
    <div class="msg-avatar">${role === 'bot' ? '🤖' : '👤'}</div>
    <div class="msg-bubble">${displayText}</div>
  `;
  area.appendChild(msg);
  area.scrollTop = area.scrollHeight;

  // Store the (potentially censored) message in chatHistory
  if (role === 'bot' && chatHistory.some(m => m.content === text)) return; // Avoid duplicate welcome
  chatHistory.push({ role: role === 'user' ? 'user' : 'assistant', content: censorMessage(text) });
  // Cap chatHistory to prevent memory leak
  if (chatHistory.length > 30) chatHistory = chatHistory.slice(-30);
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
    const welcomeMsg = "Hey! 👋 I'm <strong>HackBot</strong>. Ask me anything about hackathons — upcoming events, online ones, prizes, or anything else!";
    appendMessage('bot', welcomeMsg, true);
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

  // local smart reply using censored message
  const censoredMessageForLocalReply = censorMessage(message).toLowerCase();
  if (censoredMessageForLocalReply.includes('nearest') || censoredMessageForLocalReply.includes('closest')) {
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
      body: JSON.stringify({
        messages: chatHistory,
        user_profile: {
          name: localStorage.getItem('userName'),
          skills: localStorage.getItem('userSkills'),
          college: localStorage.getItem('userCollege'),
          bio: localStorage.getItem('userBio')
        }
      })
    });

    const data = await res.json();
    removeTyping();

    const reply = data.answer || data.reply || data.message || data.response || data.text || JSON.stringify(data);
    appendMessage('bot', reply);
    speakText(reply);
    if (data.action === 'filter' && data.filterType) {
      const pill = document.querySelector(`.filter-pill[onclick*="${data.filterType}"]`);
      if (pill) filterCards(pill, data.filterType);
    }
  } catch (err) {
    removeTyping();
    appendMessage('bot', "😅 Oops! I took a quick nap — please try again in a moment!");
  }
}
async function speakText(text) {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);

    const audio = new Audio(audioUrl);
    audio.playbackRate = 1.15;
    audio.play();

  } catch (err) {
    console.error('Voice error:', err);
  }
}

// ── Quick send chips ──
function quickSend(btn) {
  const input = document.getElementById('chat-input');
  input.value = btn.textContent;
  sendChat();
}

async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  if (!email || !pass) return alert('Fill all fields');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('authToken', data.token); // YE LINE MISSING THI
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', data.user?.name || '');
      localStorage.setItem('userUsername', data.user?.username || '');
      localStorage.setItem('userGender', data.user?.gender || '');
      localStorage.setItem('userBio', data.user?.bio || '');
      localStorage.setItem('userSkills', data.user?.skills || '');
      localStorage.setItem('userMobile', data.user?.mobile || '');
      localStorage.setItem('userCollege', data.user?.college || '');
      document.getElementById('nav-auth').style.display = 'none';
      document.getElementById('nav-app').style.display = 'flex';
      const pendingJoin = sessionStorage.getItem('pendingJoinTeam');
      if (pendingJoin) {
        sessionStorage.removeItem('pendingJoinTeam');
        goTo('teams');
        setTimeout(() => openTeamChat(parseInt(pendingJoin), 'Team'), 800);
      } else {
        goTo('dashboard');
      }
      showToast('🎉', 'Login Successful!', `Welcome back, ${data.user?.name || 'user'}!`);
    } else {
      showToast('❌', 'Login Failed', data.error || 'Something went wrong during login.');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('❌', 'Server Error', 'Could not connect to the server. Please try again.');
  }
}

let pendingSignupData = null;

async function signupUser() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const pass = document.getElementById('signup-pass').value.trim();
  const mobile = document.getElementById('signup-mobile').value.trim() || null;
  const college = document.getElementById('signup-college').value.trim() || null;
  const username = document.getElementById('signup-username').value.trim().replace('@', '');
  const gender = document.querySelector('input[name="gender"]:checked')?.value || null;
  const bio = document.getElementById('signup-bio').value.trim() || null;
  const skills = document.getElementById('signup-skills').value.trim() || null;

  if (!name || !email || !pass || !username) return alert('Name, Email, Password and Username are required.');

  pendingSignupData = { name, email, pass, mobile, college, username, gender, bio, skills };

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('Error', 'OTP Failed', data.error || 'Could not send OTP.');
      return;
    }

    document.getElementById('otp-email-display').textContent = `We sent a code to ${email}`;
    document.getElementById('otp-modal').style.display = 'flex';
    document.getElementById('otp-input').value = '';
    document.getElementById('otp-input').focus();
  } catch (err) {
    console.error('Signup OTP error:', err);
    showToast('Error', 'Server Error', 'Could not send OTP. Please try again.');
  }
}

async function verifyOTP() {
  const otp = document.getElementById('otp-input').value.trim();
  if (!/^\d{6}$/.test(otp)) {
    showToast('Invalid', 'Invalid', 'Enter the 6-digit code.');
    return;
  }

  const email = pendingSignupData?.email;
  if (!email) return;

  try {
    const verifyRes = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      showToast('Error', 'Wrong Code', verifyData.error || 'Invalid OTP');
      return;
    }

    document.getElementById('otp-modal').style.display = 'none';

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingSignupData)
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('loggedIn', 'true');
      localStorage.setItem('userName', pendingSignupData.name);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userUsername', pendingSignupData.username);
      localStorage.setItem('userGender', pendingSignupData.gender || '');
      localStorage.setItem('userBio', pendingSignupData.bio || '');
      localStorage.setItem('userSkills', pendingSignupData.skills || '');
      localStorage.setItem('userMobile', pendingSignupData.mobile || '');
      localStorage.setItem('userCollege', pendingSignupData.college || '');

      const signedUpName = pendingSignupData.name;
      pendingSignupData = null;
      document.getElementById('nav-auth').style.display = 'none';
      document.getElementById('nav-app').style.display = 'flex';
      goTo('dashboard');
      showToast('Success', 'Signup Successful!', `Welcome to Hack/Alert, ${signedUpName}!`);
    } else {
      showToast('Error', 'Signup Failed', data.error || 'Something went wrong during signup.');
    }
  } catch (err) {
    console.error('OTP verification error:', err);
    showToast('Error', 'Error', 'Something went wrong.');
  }
}

async function resendOTP() {
  const email = pendingSignupData?.email;
  if (!email) return;

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) showToast('Email', 'Sent!', 'New OTP sent to your email.');
    else showToast('Error', 'Error', data.error || 'Could not resend.');
  } catch (err) {
    showToast('Error', 'Error', 'Could not resend.');
  }
}

function toggleChip(el) {
  el.classList.toggle('selected');
}
function loadProfile() {
  const name = localStorage.getItem('userName') || '—';
  const email = localStorage.getItem('userEmail') || '—';
  const mobile = localStorage.getItem('userMobile') || '—';
  const college = localStorage.getItem('userCollege') || '—';
  const username = localStorage.getItem('userUsername') || '—';
  const gender = localStorage.getItem('userGender') || '';
  const bio = localStorage.getItem('userBio') || '';
  const skills = localStorage.getItem('userSkills') || '';

  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-email').textContent = email;
  document.getElementById('profile-mobile').textContent = mobile;
  document.getElementById('profile-college').textContent = college;
  document.getElementById('profile-username').textContent = '@' + username;
  document.getElementById('profile-skills').textContent = skills || '—';

  const bioEl = document.getElementById('profile-bio-display');
  if (bioEl) bioEl.textContent = bio || 'No bio yet.';

  const genderBadge = document.getElementById('profile-gender-badge');
  if (genderBadge) {
    if (gender === 'male') {
      genderBadge.textContent = '♂';
      genderBadge.style.color = '#60a5fa';
    } else if (gender === 'female') {
      genderBadge.textContent = '♀';
      genderBadge.style.color = '#f472b6';
    } else {
      genderBadge.textContent = '';
    }
  }

  const avatar = document.getElementById('profile-avatar');
  if (avatar) avatar.textContent = name.charAt(0).toUpperCase();

  const saved = JSON.parse(localStorage.getItem('saved') || '[]');
  const list = document.getElementById('saved-list');

  if (saved.length === 0) {
    list.innerHTML = '<p style="color:var(--muted)">No hackathons saved yet.</p>';
  } else {
    list.innerHTML = saved.map(hack => `
      <div style="padding:8px 12px;margin-bottom:8px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <span>🔖 ${escapeHTML(hack.name)}</span>
        <button onclick="unsaveHackathon('${safeJSString(hack.name)}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px;">✕ Remove</button>
      </div>
    `).join('');
  }
  // --- Interactive Roadmap ---
  const roadmapDiv = document.getElementById('roadmap-list');
  if (roadmapDiv) {
    if (saved.length === 0) {
      roadmapDiv.innerHTML = '<p style="color:var(--muted)">Save some hackathons to see your roadmap!</p>';
    } else {
      // Sort by start date for the timeline
      saved.sort((a, b) => new Date(a.start) - new Date(b.start));
      const now = new Date();

      roadmapDiv.innerHTML = saved.map(hack => {
        const hackDate = new Date(hack.start);
        const isUpcoming = hackDate > now;
        const dateString = hackDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        return `
          <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border);">
            <div style="font-family: var(--mono); font-size: 12px; text-align: center; color: ${isUpcoming ? 'var(--accent)' : 'var(--muted)'}; width: 60px; flex-shrink: 0;">
              <div style="font-weight: 700; font-size: 14px;">${dateString.split(' ')[1] || dateString.split('.')[0]}</div>
              <div>${dateString.split(' ')[0] || dateString.split('.')[1]}</div>
            </div>
            <div style="flex: 1; font-size: 14px;">${escapeHTML(hack.name)}</div>
            <button onclick="unsaveHackathon('${safeJSString(hack.name)}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px;">✕</button>
          </div>
        `;
      }).join('');
    }
  }

  // Load friends list as well
  loadFriends();
}

// ── Logout ──
function logout() {
  document.getElementById('logout-modal').style.display = 'flex';
}

function hideLogoutModal() {
  document.getElementById('logout-modal').style.display = 'none';
}

function confirmLogout() {
  document.getElementById('logout-modal').style.display = 'none';
  document.getElementById('nav-auth').style.display = '';
  document.getElementById('nav-app').style.display = 'none';
  localStorage.removeItem('authToken');
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userUsername');
  localStorage.removeItem('userGender');
  localStorage.removeItem('userBio');
  localStorage.removeItem('userSkills');
  localStorage.removeItem('userMobile');
  localStorage.removeItem('userCollege');
  const btn = document.getElementById('get-started-btn');
  if (btn) btn.style.display = '';
  goTo('landing');
}

// ── Fallback Data ──
function getFallbackHackathons() {
  return [
    { name: "Smart Horizon 2026 International Hackathon", start: "2026-09-03", city: "Bengaluru", country: "India", virtual: false, hybrid: false, website: "https://newhorizonindia.edu/" },
    { name: "PSB's Cybersecurity, Fraud & AI Hackathon", start: "2026-08-27", city: "Hyderabad", country: "India", virtual: false, hybrid: true, website: "https://boihackathon.cse.iith.ac.in/hackathon2026/" },
    { name: "India Food Systems Transformation Hackathon 2026", start: "2026-08-01", city: "Bengaluru", country: "India", virtual: false, hybrid: true, website: "https://www.tdu.edu.in/outreach/india-food-systems-transformation-hackathon-2026" },
    { name: "Ocean Hackathon® 2026 (India Edition)", start: "2026-10-16", city: "Chennai", country: "India", virtual: false, hybrid: false, website: "https://www.campusmer.fr/ocean-hackathon" },
    { name: "2026 Data, AI & Policy APAC Hackathon", start: "2026-09-26", city: "", country: "India", virtual: true, hybrid: false, website: "https://www.apru.org/event/2026-hackathon-financial-health-frontiers/" },
    { name: "Tech Horizon 2.0 National Hackathon", start: "2026-11-13", city: "Hyderabad", country: "India", virtual: false, hybrid: false, website: "https://www.gniindia.org/" },
    { name: "Great Indian Hackathon 2026", start: "2026-11-01", city: "", country: "India", virtual: true, hybrid: false, website: "https://sahrdaya.ac.in/" },
    { name: "CODEX 2026 AI Hackathon", start: "2026-06-13", city: "", country: "India", virtual: true, hybrid: false, website: "https://www.codexbitblaze.in/" },
    { name: "MLH Global Hack Week: Build 2026", start: "2026-06-12", city: "", country: "India", virtual: true, hybrid: false, website: "https://ghw.mlh.io/" },
    { name: "MLH Agents Hack Week", start: "2026-08-07", city: "", country: "India", virtual: true, hybrid: false, website: "https://ghw.mlh.io/" },
    { name: "Solution Challenge 2026", start: "2026-06-20", city: "", country: "India", virtual: true, hybrid: false, website: "https://developers.google.com/community/gdsc-solution-challenge" },
    { name: "Build with AI: PromptWars", start: "2026-10-10", city: "New Delhi", country: "India", virtual: false, hybrid: false, website: "https://hack2skill.com/" },
    { name: "Gen AI Academy APAC Hackathon", start: "2026-05-28", city: "Bengaluru", country: "India", virtual: false, hybrid: true, website: "https://hack2skill.com/" },
    { name: "Robotics Innovation Hackathon 2026", start: "2026-11-05", city: "Hyderabad", country: "India", virtual: false, hybrid: false, website: "https://icmacc.org/" },
    { name: "Agri-Excellence Hackathon 2026", start: "2026-07-01", city: "Kolkata", country: "India", virtual: false, hybrid: true, website: "https://agriexcellence.in/hackathon" },
    { name: "Tata Steel AI Hackathon 2026", start: "2026-06-01", city: "", country: "India", virtual: true, hybrid: false, website: "https://www.hackerearth.com/community/challenges/competitive/tata-steel-ai-hackathon/" },
    { name: "Flying Wings 2026: National Level Hackathon", start: "2026-07-17", city: "Jodhpur", country: "India", virtual: false, hybrid: false, website: "https://www.iitj.ac.in/flying-wings" },
    { name: "PSBs National Hackathon on Cyber Security", start: "2026-07-17", city: "Allahabad", country: "India", virtual: false, hybrid: false, website: "https://www.mnnit.ac.in/hackathon2026/" },
    { name: "Health Hackathon 2026", start: "2026-10-15", city: "Bhopal", country: "India", virtual: false, hybrid: false, website: "https://vitbhopal.ac.in/ibcd2026/" },
    { name: "5G Innovation Hackathon 2026", start: "2026-09-14", city: "New Delhi", country: "India", virtual: false, hybrid: true, website: "https://www.preprodeservices.dot.gov.in/5ghackathon/" }
  ];
}

function toggleSave(btn) {
  const name = btn.dataset.name;
  const start = btn.dataset.start;
  let saved = JSON.parse(localStorage.getItem('saved') || '[]');
  const existingIndex = saved.findIndex(s => s.name === name);

  showToast('🔖', existingIndex > -1 ? 'Removed' : 'Saved!', name);

  if (existingIndex > -1) {
    saved.splice(existingIndex, 1);
    btn.textContent = '🔖 Save';
    btn.style.borderColor = 'var(--border-light)';
    btn.style.color = 'var(--muted)';
  } else {
    saved.push({ name, start });
    btn.textContent = '✅ Saved';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
  }
  localStorage.setItem('saved', JSON.stringify(saved));
  updateStats();
  loadProfile(); // Update profile page if it's active
}

function copyLink(btn, url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      btn.textContent = '✅ Copied!';
      btn.style.borderColor = 'var(--accent)';
      btn.style.color = 'var(--accent)';
    }).catch(() => {
      fallbackCopy(url, btn);
    });
  } else {
    fallbackCopy(url, btn);
  }
  setTimeout(() => {
    btn.textContent = '🔗 Copy';
    btn.style.borderColor = 'var(--border-light)';
    btn.style.color = 'var(--muted)';
  }, 2000);
}

function fallbackCopy(text, btn) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  btn.textContent = '✅ Copied!';
  btn.style.borderColor = 'var(--accent)';
  btn.style.color = 'var(--accent)';
}

function unsaveHackathon(name) {
  let saved = JSON.parse(localStorage.getItem('saved') || '[]');
  saved = saved.filter(s => s.name !== name);
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
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  if (country === 'all') {
    renderHackathons(allHackathons);
  } else {
    renderHackathons(allHackathons.filter(h => h.country === country));
  }
}

function buildCountryList() {
  const countries = ['All Countries', 'Afghanistan', 'Albania', 'Algeria', 'Argentina',
    'Australia', 'Austria', 'Azerbaijan', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia',
    'Brazil', 'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
    'Denmark', 'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia',
    'Germany', 'Ghana', 'Greece', 'Hungary', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
    'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon',
    'Lithuania', 'Malaysia', 'Mexico', 'Morocco', 'Myanmar', 'Nepal', 'Netherlands',
    'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland',
    'Portugal', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia',
    'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland',
    'Taiwan', 'Thailand', 'Turkey', 'Uganda', 'Ukraine', 'United Arab Emirates',
    'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Zimbabwe'];

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
  const startDate = new Date(hack.start).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  let mode = "📍 In-Person";
  if (hack.virtual) mode = "🌐 Online";
  if (hack.hybrid) mode = "🔀 Hybrid";

  document.getElementById('modal-content').innerHTML = `
    ${hack.banner ? `<img src="${escapeHTML(hack.banner)}" style="width:100%;height:160px;object-fit:cover;border-radius:12px;margin-bottom:20px;">` : ''}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      ${hack.logo ? `<img src="${escapeHTML(hack.logo)}" style="width:48px;height:48px;border-radius:10px;">` : '<div style="font-size:32px;">💻</div>'}
      <div>
        <h2 style="color:var(--text);margin:0;">${escapeHTML(hack.name)}</h2>
        <p style="color:var(--accent);font-family:var(--mono);font-size:12px;margin:4px 0;">${mode}</p>
      </div>
    </div>
    <div style="display:grid;gap:12px;font-size:14px;color:var(--muted);">
      <p>📅 <strong style="color:var(--text);">Date:</strong> ${startDate}</p>
      <p>⏳ <strong style="color:var(--text);">Deadline:</strong> ${getCountdown(hack.start)}</p>
      <p>🌎 <strong style="color:var(--text);">Location:</strong> ${hack.virtual ? "Anywhere" : (hack.city ? `${escapeHTML(hack.city)}, ${escapeHTML(hack.country)}` : "TBA")}</p>
      ${hack.state ? `<p>📍 <strong style="color:var(--text);">State:</strong> ${escapeHTML(hack.state)}</p>` : ''}
      ${hack.mlhAssociated ? `<p>🎓 <strong style="color:var(--text);">MLH:</strong> Associated</p>` : ''}
      ${hack.hack_club_event ? `<p>🏠 <strong style="color:var(--text);">Hack Club:</strong> Official Event ✅</p>` : ''}
      ${hack.apac ? `<p>🌏 <strong style="color:var(--text);">Region:</strong> Asia Pacific</p>` : ''}
    </div>
    <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;">
      <a href="${escapeHTML(hack.website)}" target="_blank" style="background:var(--accent);color:#050508;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;font-family:var(--mono);">Register Now →</a>
      <a href="https://wa.me/?text=Check out ${encodeURIComponent(hack.name)}: ${encodeURIComponent(hack.website)}" target="_blank" style="background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:10px 20px;border-radius:10px;text-decoration:none;font-size:13px;font-family:var(--mono);">📲 WhatsApp</a>
    </div>
  `;
  document.getElementById('hack-modal').style.display = 'flex';
  document.getElementById('review-form').style.display = 'none';
  document.getElementById('write-review-btn').style.display = 'block';
  selectedRating = 0;
  loadReviews(hack.name);
}

function closeModal() {
  document.getElementById('hack-modal').style.display = 'none';
}

// ── TEAMS ──
let currentTeamId = null;
let chatEventSource = null;

async function loadTeams() {
  const grid = document.getElementById('teams-grid');
  grid.innerHTML = '<p style="color:#aaa;padding:20px;">Loading teams...</p>';
  try {
    const res = await fetch('/api/teams');
    if (!res.ok) throw new Error('Failed to load teams');
    const teams = await res.json();
    const currentUserEmail = localStorage.getItem('userEmail');

    if (!teams.length) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#aaa;padding:20px;">No teams yet. Create one!</p>'; return; }
    grid.innerHTML = teams.map(t => `
      <div class="feature-card">
        <h3 style="margin-bottom: 8px;">${escapeHTML(t.name)}</h3>
        <p style="color:var(--muted);font-size:13px;margin-bottom:4px;">🏆 ${escapeHTML(t.hackathon || 'Open Hackathon')}</p>
        <p style="font-size:13px;margin-bottom:4px;">🛠 ${escapeHTML(t.skills || 'Any skills welcome')}</p>
        <p style="font-size:13px;margin-bottom:8px;">👥 ${t.slots_left} slots left / ${t.size} total</p>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">Leader: ${escapeHTML(t.leader_email)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${t.leader_email === currentUserEmail
        ? `<button onclick="deleteTeam(${t.id})" class="btn-primary" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Delete Team</button>`
        : `<button onclick="joinTeam(${t.id}, '${safeJSString(t.name)}')" class="btn-primary" style="background:var(--accent);color:#050508;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Join Team</button>`
      }
          <button onclick="openTeamChat(${t.id},'${safeJSString(t.name)}')" class="btn-secondary" style="background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;">💬 Chat</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading teams:', err);
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;padding:20px;">⚠️ Failed to load teams. Please try again.</p>';
  }
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
  if (!name || isNaN(size) || size <= 0) {
    showToast('❌', 'Error', 'Team Name and Team Size are required.');
    return;
  }
  const res = await fetch('/api/teams', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, hackathon, skills, size })
  });
  if (res.ok) { hideCreateTeam(); loadTeams(); }
  else { const d = await res.json(); showToast('❌', 'Error creating team', d.error); }
}

async function joinTeam(teamId, teamName) {
  const res = await fetch(`/api/teams/${teamId}/members`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({})
  });
  const d = await res.json();
  if (res.ok) {
    showToast('✅', 'Joined Team!', `You have successfully joined ${teamName}.`);
    loadTeams();
  } else {
    showToast('❌', 'Failed to Join', d.error);
  }
}

async function openTeamChat(teamId, teamName) {
  currentTeamId = teamId;
  document.getElementById('chat-team-name').textContent = teamName;
  document.getElementById('team-chat-modal').style.display = 'flex';

  try {
    await loadTeamMessages();

    const currentUserEmail = localStorage.getItem('userEmail');

    const teamRes = await fetch(`/api/teams/${teamId}`);
    if (!teamRes.ok) throw new Error('Failed to load team details');
    const currentTeam = await teamRes.json();

    const membersRes = await fetch(`/api/teams/${teamId}/members`);
    if (!membersRes.ok) throw new Error('Failed to load members');
    const members = await membersRes.json();
    const isMember = members.some(member => member.user_email === currentUserEmail);
    const isLeader = currentTeam && currentTeam.leader_email === currentUserEmail;

    const membersListDiv = document.getElementById('team-members-list');
    if (membersListDiv) {
      membersListDiv.innerHTML = '👥 ' + members.map(m => `<span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px;">${escapeHTML(m.user_name || m.user_email)}</span>`).join('');
    }

    const teamActionsDiv = document.getElementById('team-chat-actions');
    if (teamActionsDiv) {
      teamActionsDiv.innerHTML = '';
      if (isMember && !isLeader) {
        teamActionsDiv.innerHTML += `<button onclick="leaveTeam(${teamId})" style="background:#f97316;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Leave Team</button>`;
      }
      teamActionsDiv.innerHTML += `<button onclick="copyInviteLink(${teamId})" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;margin-left:8px;">🔗 Invite</button>`;
    }
  } catch (err) {
    console.error('Error loading team chat:', err);
    showToast('⚠️', 'Error', 'Failed to load team details. Please try again.');
  }

  if (chatEventSource) {
    chatEventSource.close();
  }

  // Connect to SSE stream
  chatEventSource = new EventSource(`/api/teams/${teamId}/stream`);
  chatEventSource.onmessage = (e) => {
    const data = JSON.parse(e.data);
    appendTeamMessage(data);
  };
}

function copyInviteLink(teamId) {
  const url = `${window.location.origin}${window.location.pathname}?join_team=${teamId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('✅', 'Copied!', 'Invite link copied to clipboard.');
    });
  } else {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅', 'Copied!', 'Invite link copied to clipboard.');
  }
}

function closeTeamChat() {
  document.getElementById('team-chat-modal').style.display = 'none';
  if (chatEventSource) {
    chatEventSource.close();
    chatEventSource = null;
  }
  currentTeamId = null;
}

function appendTeamMessage(m) {
  const area = document.getElementById('team-chat-area');
  area.insertAdjacentHTML('beforeend', `
    <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;margin-bottom:8px;">
      <strong style="color:var(--accent);font-size:12px;">${escapeHTML(m.sender_name || m.sender_email)}</strong>
      <p style="font-size:14px;margin-top:4px;color:var(--text);">${escapeHTML(m.message)}</p>
      <p style="font-size:11px;color:var(--muted);margin-top:4px;">${new Date(m.sent_at || Date.now()).toLocaleTimeString()}</p>
    </div>
  `);
  area.scrollTop = area.scrollHeight;
}

async function loadTeamMessages() {
  const area = document.getElementById('team-chat-area');
  const res = await fetch(`/api/teams/${currentTeamId}/messages`);
  const msgs = await res.json();
  area.innerHTML = '';
  msgs.forEach(appendTeamMessage);
}

async function sendTeamMessage() {
  const input = document.getElementById('team-msg-input');
  const message = input.value.trim();
  if (!message) return;

  const res = await fetch(`/api/teams/${currentTeamId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message })
  });

  if (!res.ok) {
    const d = await res.json();
    showToast('❌', 'Blocked', d.error);
    return;
  }
  input.value = '';
}

async function leaveTeam(teamId) {
  if (!confirm('Are you sure you want to leave this team?')) return;

  const user_email = localStorage.getItem('userEmail');
  if (!user_email) {
    showToast('❌', 'Error', 'You must be logged in to leave a team.');
    return;
  }

  try {
    const res = await fetch(`/api/teams/${teamId}/members/${encodeURIComponent(user_email)}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    const data = await res.json();
    if (res.ok) {
      showToast('✅', 'Left Team', 'You have successfully left the team.');
      closeTeamChat();
      loadTeams();
    } else {
      showToast('❌', 'Failed to Leave', data.error);
    }
  } catch (error) {
    console.error('Error leaving team:', error);
    showToast('❌', 'Error', 'Server error while leaving team.');
  }
}

function showToast(icon, title, msg) {
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent = msg;
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function deleteTeam(teamId) {
  if (!confirm('Delete this team?')) return;
  const res = await fetch(`/api/teams/${teamId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (res.ok) loadTeams();
  else { const d = await res.json(); showToast('❌', 'Error', d.error); }
}

function showMatchmaker() {
  document.getElementById('matchmaker-modal').style.display = 'flex';
  document.getElementById('match-results').innerHTML = '';
}

function hideMatchmaker() {
  document.getElementById('matchmaker-modal').style.display = 'none';
}

async function runMatchmaker() {
  const skills = document.getElementById('match-skills').value.trim();
  if (!skills) { showToast('⚠️', 'Missing', 'Enter your skills first.'); return; }

  const resultsDiv = document.getElementById('match-results');
  resultsDiv.innerHTML = '<p style="color:var(--muted);font-family:var(--mono);font-size:13px;">🤖 Analyzing teams...</p>';

  try {
    const res = await fetch('/api/teams/match', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_skills: skills })
    });

    const data = await res.json();

    if (!res.ok) {
      resultsDiv.innerHTML = `<p style="color:#ef4444;font-size:13px;">❌ ${data.error}</p>`;
      return;
    }

    if (!data.matches?.length) {
      resultsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">No open teams found right now.</p>';
      return;
    }

    resultsDiv.innerHTML = data.matches.map(m => `
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-light);border-radius:12px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong style="color:var(--text);font-size:15px;">${escapeHTML(m.name)}</strong>
          <span style="background:rgba(0,240,255,0.1);color:var(--accent);font-family:var(--mono);font-size:11px;padding:3px 10px;border-radius:100px;border:1px solid rgba(0,240,255,0.3);">${m.match_score}% match</span>
        </div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:6px;">🏆 ${escapeHTML(m.hackathon || 'Open')}</p>
        <p style="font-size:13px;color:var(--muted);margin-bottom:8px;">🛠 Looking for: ${escapeHTML(m.skills || 'Any')}</p>
        <p style="font-size:13px;color:var(--accent3);font-style:italic;margin-bottom:12px;">"${escapeHTML(m.reason)}"</p>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">👥 ${m.slots_left} slot${m.slots_left !== 1 ? 's' : ''} left</p>
        <button onclick="joinTeam(${m.id},'${safeJSString(m.name)}')"
          style="background:var(--accent);color:#050508;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">
          Join Team →
        </button>
      </div>
    `).join('');

  } catch (err) {
    resultsDiv.innerHTML = '<p style="color:#ef4444;font-size:13px;">⚠️ Could not reach server.</p>';
  }
}

// ── CALENDAR ──
let calendarDate = new Date();

function goToCalendar() {
  goTo('calendar');
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const saved = JSON.parse(localStorage.getItem('saved') || '[]');
  const savedNames = saved.map(s => s.name);
  const now = new Date();

  document.getElementById('calendar-month-label').textContent =
    calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group hackathons by date
  const byDate = {};
  allHackathons.forEach(h => {
    const d = new Date(h.start);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(h);
    }
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = `<div class="cal-grid">`;

  // Day headers
  days.forEach(d => {
    html += `<div class="cal-day-header">${d}</div>`;
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
    const hacks = byDate[day] || [];

    html += `<div class="cal-day${isToday ? ' today' : ''}">
      <div class="cal-day-num">${day}</div>`;

    hacks.slice(0, 3).forEach(h => {
      const daysLeft = Math.ceil((new Date(h.start) - now) / (1000 * 60 * 60 * 24));
      const isSaved = savedNames.includes(h.name);
      let cls = 'upcoming';
      if (isSaved) cls = 'saved';
      else if (daysLeft <= 5) cls = 'urgent';
      else if (daysLeft <= 20) cls = 'soon';

      html += `<div class="cal-event ${cls}" onclick="openModal(allHackathons.find(x=>x.name==='${safeJSString(h.name)}'))" title="${escapeHTML(h.name)}">
        ${escapeHTML(h.name)}
      </div>`;
    });

    if (hacks.length > 3) {
      html += `<div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:2px;">+${hacks.length - 3} more</div>`;
    }

    html += `</div>`;
  }

  html += `</div>`;
  document.getElementById('calendar-grid').innerHTML = html;
}

function prevMonth() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
}

// ── PROJECT SHOWCASE ──

async function loadShowcase() {
  const grid = document.getElementById('showcase-grid');
  grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#aaa;padding:40px;">Loading projects...</p>';

  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();

    if (!projects.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#aaa;padding:40px;">No projects submitted yet. Be the first! 🚀</p>';
      return;
    }

    const currentUserEmail = localStorage.getItem('userEmail');

    grid.innerHTML = projects.map(p => {
      const techTags = p.tech_stack
        ? p.tech_stack.split(',').map(t => `<span class="tech-tag">${escapeHTML(t.trim())}</span>`).join('')
        : '';

      return `
        <div class="project-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div>
              <h3 style="color:#fff;font-size:17px;margin-bottom:4px;">${escapeHTML(p.title)}</h3>
              <p style="font-family:var(--mono);font-size:11px;color:var(--accent);">by ${escapeHTML(p.teams?.name || 'Unknown Team')}</p>
            </div>
            <span style="font-family:var(--mono);font-size:10px;color:var(--muted);background:rgba(255,255,255,0.04);padding:4px 8px;border-radius:6px;border:1px solid var(--border);white-space:nowrap;">
              🏆 ${escapeHTML(p.teams?.hackathon || 'Open')}
            </span>
          </div>

          ${p.description ? `<p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:12px;">${escapeHTML(p.description)}</p>` : ''}

          ${techTags ? `<div style="margin-bottom:12px;">${techTags}</div>` : ''}

          <p style="font-size:11px;color:var(--muted);font-family:var(--mono);">
            Submitted by ${escapeHTML(p.submitted_by)} · ${new Date(p.created_at).toLocaleDateString()}
          </p>

          <div class="project-links">
            ${p.github_link ? `<a href="${escapeHTML(p.github_link)}" target="_blank" class="project-link-btn github">⬡ GitHub</a>` : ''}
            ${p.demo_link ? `<a href="${escapeHTML(p.demo_link)}" target="_blank" class="project-link-btn demo">▶ Live Demo</a>` : ''}
            ${p.submitted_by === currentUserEmail ? `<button onclick="deleteProject(${p.team_id})" class="project-link-btn" style="color:#ef4444;border-color:rgba(239,68,68,0.3);">✕ Delete</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;padding:40px;">⚠️ Failed to load projects.</p>';
  }
}

async function showSubmitProject() {
  // Load user's teams into dropdown
  const userEmail = localStorage.getItem('userEmail');
  try {
    const res = await fetch('/api/teams');
    const teams = await res.json();
    const myTeams = teams.filter(t =>
      t.leader_email === userEmail
    );

    // Also check team_members
    const allRes = await fetch('/api/teams');
    const allTeams = await allRes.json();

    const select = document.getElementById('project-team-id');
    select.innerHTML = '<option value="">Select your team...</option>';

    // Show all teams where user might be member
    allTeams.forEach(t => {
      select.innerHTML += `<option value="${t.id}">${escapeHTML(t.name)}</option>`;
    });

  } catch (e) {
    console.error(e);
  }
  document.getElementById('submit-project-modal').style.display = 'flex';
}

function hideSubmitProject() {
  document.getElementById('submit-project-modal').style.display = 'none';
}

async function submitProject() {
  const team_id = document.getElementById('project-team-id').value;
  const title = document.getElementById('project-title').value.trim();
  const description = document.getElementById('project-desc').value.trim();
  const github_link = document.getElementById('project-github').value.trim();
  const demo_link = document.getElementById('project-demo').value.trim();
  const tech_stack = document.getElementById('project-tech').value.trim();

  if (!team_id) { showToast('❌', 'Error', 'Select a team.'); return; }
  if (!title) { showToast('❌', 'Error', 'Project title is required.'); return; }

  try {
    const res = await fetch(`/api/teams/${team_id}/project`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, description, github_link, demo_link, tech_stack })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('🚀', 'Submitted!', 'Your project is now live in the showcase.');
      hideSubmitProject();
      loadShowcase();
      // Clear fields
      ['project-title', 'project-desc', 'project-github', 'project-demo', 'project-tech'].forEach(id => {
        document.getElementById(id).value = '';
      });
    } else {
      showToast('❌', 'Error', data.error);
    }
  } catch (err) {
    showToast('❌', 'Error', 'Could not submit project.');
  }
}

async function deleteProject(teamId) {
  if (!confirm('Delete this project?')) return;
  const res = await fetch(`/api/teams/${teamId}/project`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (res.ok) {
    showToast('✅', 'Deleted', 'Project removed.');
    loadShowcase();
  } else {
    const d = await res.json();
    showToast('❌', 'Error', d.error);
  }
}

// ── REVIEWS ──
let currentReviewHackathon = null;
let selectedRating = 0;

function setRating(n) {
  selectedRating = n;
  document.querySelectorAll('#star-input .star').forEach((s, i) => {
    s.style.opacity = i < n ? '1' : '0.3';
  });
}

function showReviewForm() {
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
  if (!isLoggedIn) { showToast('⚠️', 'Login Required', 'Please login to write a review.'); return; }
  document.getElementById('review-form').style.display = 'block';
  document.getElementById('write-review-btn').style.display = 'none';
}

async function loadReviews(hackathonName) {
  currentReviewHackathon = hackathonName;
  const list = document.getElementById('reviews-list');
  list.innerHTML = '<p style="color:var(--muted);font-size:12px;">Loading reviews...</p>';

  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(hackathonName)}`);
    const reviews = await res.json();

    if (!reviews.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:13px;">No reviews yet — be the first!</p>';
      return;
    }

    const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    const userEmail = localStorage.getItem('userEmail');

    list.innerHTML = `
      <div style="margin-bottom:12px;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:8px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;font-weight:700;color:var(--accent);">${avg}</span>
        <span style="color:#f59e0b;font-size:16px;">${'⭐'.repeat(Math.round(avg))}</span>
        <span style="color:var(--muted);font-size:12px;font-family:var(--mono);">(${reviews.length} review${reviews.length !== 1 ? 's' : ''})</span>
      </div>
      ${reviews.map(r => `
        <div style="padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="color:#f59e0b;font-size:14px;">${'⭐'.repeat(r.rating)}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:var(--muted);font-size:11px;font-family:var(--mono);">${escapeHTML(r.user_email)}</span>
              ${r.user_email === userEmail ? `<button onclick="deleteReview('${safeJSString(hackathonName)}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:11px;">✕</button>` : ''}
            </div>
          </div>
          ${r.review ? `<p style="font-size:13px;color:var(--muted);margin:0;">${escapeHTML(r.review)}</p>` : ''}
        </div>
      `).join('')}
    `;
  } catch (e) {
    list.innerHTML = '<p style="color:#ef4444;font-size:13px;">Failed to load reviews.</p>';
  }
}

async function submitReview() {
  if (!selectedRating) { showToast('⚠️', 'Select Rating', 'Please select a star rating.'); return; }
  const review = document.getElementById('review-text').value.trim();

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ hackathon_name: currentReviewHackathon, rating: selectedRating, review })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('⭐', 'Review Submitted!', 'Thanks for your feedback.');
      document.getElementById('review-form').style.display = 'none';
      document.getElementById('write-review-btn').style.display = 'block';
      document.getElementById('review-text').value = '';
      selectedRating = 0;
      loadReviews(currentReviewHackathon);
    } else {
      showToast('❌', 'Error', data.error);
    }
  } catch (e) {
    showToast('❌', 'Error', 'Could not submit review.');
  }
}

async function deleteReview(hackathonName) {
  if (!confirm('Delete your review?')) return;
  const res = await fetch(`/api/reviews/${encodeURIComponent(hackathonName)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (res.ok) { showToast('✅', 'Deleted', 'Review removed.'); loadReviews(hackathonName); }
}

function selectGender(val) {
  const male = document.getElementById('gender-male-label');
  const female = document.getElementById('gender-female-label');
  if (val === 'male') {
    male.style.borderColor = 'var(--accent)';
    male.style.color = 'var(--accent)';
    female.style.borderColor = 'var(--border-light)';
    female.style.color = 'var(--muted)';
  } else {
    female.style.borderColor = 'var(--accent2)';
    female.style.color = 'var(--accent2)';
    male.style.borderColor = 'var(--border-light)';
    male.style.color = 'var(--muted)';
  }
}

// ── FRIEND SYSTEM ──

function showUserSearch() {
  document.getElementById('user-search-modal').style.display = 'flex';
  document.getElementById('user-search-results').innerHTML = '';
  document.getElementById('user-search-input').value = '';
  fetch(`/api/users/search?q=a`, { headers: authHeaders() })
    .then(r => r.json())
    .then(users => showUserResults(users))
    .catch(() => { });
}

function hideUserSearch() {
  document.getElementById('user-search-modal').style.display = 'none';
}

let searchUsersTimeout = null;
async function searchUsers(q) {
  clearTimeout(searchUsersTimeout);
  if (!q.trim()) {
    // Show all users as suggestions
    try {
      const res = await fetch(`/api/users/search?q=a`, { headers: authHeaders() });
      const users = await res.json();
      showUserResults(users);
    } catch (e) { }
    return;
  }
  searchUsersTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders()
      });
      const users = await res.json();
      const resultsDiv = document.getElementById('user-search-results');

      if (!users.length) {
        resultsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">No users found.</p>';
        return;
      }

      resultsDiv.innerHTML = users.map(u => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#050508;flex-shrink:0;">
            ${escapeHTML(u.name.charAt(0).toUpperCase())}
          </div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              <strong onclick="openPublicProfile('${escapeHTML(u.username)}')" style="cursor:pointer;color:#fff;font-size:14px;text-decoration:underline;text-decoration-color:var(--accent);">${escapeHTML(u.name)}</strong>
              <span style="font-size:14px;">${u.gender === 'male' ? '♂' : u.gender === 'female' ? '♀' : ''}</span>
            </div>
            <p style="color:var(--accent);font-family:var(--mono);font-size:11px;">@${escapeHTML(u.username || '')}</p>
            ${u.bio ? `<p style="color:var(--muted);font-size:12px;margin-top:2px;">${escapeHTML(u.bio)}</p>` : ''}
          </div>
          <button onclick="sendFriendRequest('${escapeHTML(u.email)}')"
            style="background:var(--accent);color:#050508;border:none;padding:6px 14px;border-radius:8px;font-family:var(--mono);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">
            + Add
          </button>
        </div>
      `).join('');
    } catch (e) {
      document.getElementById('user-search-results').innerHTML = '<p style="color:#ef4444;font-size:13px;">Error searching users.</p>';
    }
  }, 400);
}

function showUserResults(users) {
  const resultsDiv = document.getElementById('user-search-results');
  if (!users.length) { resultsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">No users found.</p>'; return; }
  resultsDiv.innerHTML = users.map(u => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#050508;flex-shrink:0;">
        ${escapeHTML(u.name.charAt(0).toUpperCase())}
      </div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:6px;">
          <strong onclick="openPublicProfile('${escapeHTML(u.username)}')" style="cursor:pointer;color:#fff;font-size:14px;text-decoration:underline;text-decoration-color:var(--accent);">${escapeHTML(u.name)}</strong>
          <span style="font-size:14px;">${u.gender === 'male' ? '♂' : u.gender === 'female' ? '♀' : ''}</span>
          ${onlineDot(u.email, 8)}
        </div>
        <p style="color:var(--accent);font-family:var(--mono);font-size:11px;">@${escapeHTML(u.username || '')}</p>
        ${u.bio ? `<p style="color:var(--muted);font-size:12px;margin-top:2px;">${escapeHTML(u.bio)}</p>` : ''}
      </div>
      <button onclick="sendFriendRequest('${escapeHTML(u.email)}')"
        style="background:var(--accent);color:#050508;border:none;padding:6px 14px;border-radius:8px;font-family:var(--mono);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">
        + Add
      </button>
    </div>
  `).join('');
}

async function sendFriendRequest(to_email) {
  try {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ to_email })
    });
    const data = await res.json();
    if (res.ok) showToast('✅', 'Request Sent!', 'Friend request sent successfully.');
    else showToast('❌', 'Error', data.error);
  } catch (e) {
    showToast('❌', 'Error', 'Could not send request.');
  }
}

async function loadFriends() {
  try {
    // Load pending requests
    const reqRes = await fetch('/api/friends/requests', { headers: authHeaders() });
    const requests = await reqRes.json();
    const pendingDiv = document.getElementById('pending-requests');

    if (requests.length) {
      pendingDiv.innerHTML = `
        <h4 style="color:var(--accent);font-family:var(--mono);font-size:12px;margin-bottom:10px;">📬 PENDING REQUESTS (${requests.length})</h4>
        ${requests.map(r => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(0,240,255,0.05);border:1px solid rgba(0,240,255,0.2);border-radius:10px;margin-bottom:8px;">
            <div style="flex:1;">
              <strong style="color:#fff;font-size:13px;">${escapeHTML(r.from_email)}</strong>
              <p style="color:var(--muted);font-size:11px;font-family:var(--mono);">wants to be your friend</p>
            </div>
            <button onclick="respondRequest(${r.id}, 'accepted')" style="background:var(--accent);color:#050508;border:none;padding:6px 12px;border-radius:6px;font-family:var(--mono);font-size:11px;font-weight:700;cursor:pointer;margin-right:4px;">✓ Accept</button>
            <button onclick="respondRequest(${r.id}, 'declined')" style="background:transparent;border:1px solid #ef4444;color:#ef4444;padding:6px 12px;border-radius:6px;font-family:var(--mono);font-size:11px;cursor:pointer;">✕</button>
          </div>
        `).join('')}
      `;
    } else {
      pendingDiv.innerHTML = '';
    }

    // Load friends
    const friendRes = await fetch('/api/friends', { headers: authHeaders() });
    const friends = await friendRes.json();
    const friendsDiv = document.getElementById('friends-list');

    if (!friends.length) {
      friendsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">No friends yet. Search for hackers to connect!</p>';
      return;
    }

    friendsDiv.innerHTML = `
      <h4 style="color:var(--muted);font-family:var(--mono);font-size:12px;margin-bottom:10px;">🤝 FRIENDS (${friends.length})</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">
        ${friends.map(f => `
          <div style="padding:12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;color:#050508;flex-shrink:0;">
              ${escapeHTML(f.name.charAt(0).toUpperCase())}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:4px;">
                <strong onclick="openPublicProfile('${escapeHTML(f.username)}')" style="color:#fff;font-size:13px;cursor:pointer;text-decoration:underline;text-decoration-color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(f.name)}</strong>
                <span style="font-size:12px;">${f.gender === 'male' ? '♂' : f.gender === 'female' ? '♀' : ''}</span>
${onlineDot(f.email, 8)}
                <span style="font-size:12px;">${f.gender === 'male' ? '♂' : f.gender === 'female' ? '♀' : ''}</span>
              </div>
              <p style="color:var(--accent);font-family:var(--mono);font-size:10px;">@${escapeHTML(f.username || '')}</p>
            </div>
            <button onclick="openDMChat('${escapeHTML(f.email)}','${escapeHTML(f.name)}')" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:4px 10px;border-radius:6px;font-family:var(--mono);font-size:10px;cursor:pointer;margin-right:4px;">💬</button>
            <button onclick="removeFriend('${escapeHTML(f.email)}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:14px;">✕</button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    console.error('Error loading friends:', e);
  }
}

async function respondRequest(id, status) {
  try {
    const res = await fetch(`/api/friends/requests/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast('✅', status === 'accepted' ? 'Friend Added!' : 'Declined', '');
      loadFriends();
    }
  } catch (e) {
    showToast('❌', 'Error', 'Could not respond to request.');
  }
}

async function removeFriend(friend_email) {
  if (!confirm('Remove this friend?')) return;
  const res = await fetch(`/api/friends/${encodeURIComponent(friend_email)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (res.ok) { showToast('✅', 'Removed', 'Friend removed.'); loadFriends(); }
}

// ── AI TOOLS ──

async function generateIdeas() {
  const theme = document.getElementById('idea-theme').value.trim();
  const problem = document.getElementById('idea-problem').value.trim();
  const level = document.getElementById('idea-level').value;
  const duration = document.getElementById('idea-duration').value;
  const skills = document.getElementById('idea-skills').value.trim();

  if (!theme) { showToast('⚠️', 'Missing', 'Enter a hackathon theme.'); return; }

  const output = document.getElementById('ideas-output');
  output.innerHTML = `
    <div style="text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:12px;">🤖</div>
      <p style="color:var(--muted);font-family:var(--mono);font-size:13px;">Generating 5 unique project ideas...</p>
    </div>`;

  try {
    const res = await fetch('/api/ai/ideas', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ theme, problem, level, duration, skills })
    });
    const data = await res.json();

    if (!res.ok) { output.innerHTML = `<p style="color:#ef4444;">${data.error}</p>`; return; }

    output.innerHTML = `
      <h4 style="color:var(--accent);font-family:var(--mono);font-size:12px;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;">✨ 5 Project Ideas for "${escapeHTML(theme)}"</h4>
      ${data.ideas.map((idea, i) => `
        <div class="idea-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div>
              <h3 style="color:#fff;font-size:16px;margin-bottom:4px;">${i + 1}. ${escapeHTML(idea.title)}</h3>
              <p style="color:var(--accent);font-family:var(--mono);font-size:12px;">${escapeHTML(idea.tagline)}</p>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:12px;">
              <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:${idea.winning_potential >= 80 ? 'var(--accent)' : idea.winning_potential >= 60 ? '#f59e0b' : '#ef4444'};">${idea.winning_potential}%</div>
              <div style="font-size:10px;color:var(--muted);font-family:var(--mono);">WIN CHANCE</div>
            </div>
          </div>

          <p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:16px;">${escapeHTML(idea.description)}</p>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:4px;">INNOVATION</div>
              <div style="font-size:13px;color:#fff;font-weight:700;">${idea.innovation_score}%</div>
              <div class="score-bar"><div class="score-fill" style="width:${idea.innovation_score}%;"></div></div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:4px;">FEASIBILITY</div>
              <div style="font-size:13px;color:#fff;font-weight:700;">${idea.feasibility_score}%</div>
              <div class="score-bar"><div class="score-fill" style="width:${idea.feasibility_score}%;background:linear-gradient(90deg,#f59e0b,#ef4444);"></div></div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:4px;">WIN POTENTIAL</div>
              <div style="font-size:13px;color:#fff;font-weight:700;">${idea.winning_potential}%</div>
              <div class="score-bar"><div class="score-fill" style="width:${idea.winning_potential}%;background:linear-gradient(90deg,var(--accent2),var(--accent));"></div></div>
            </div>
          </div>

          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:6px;">🛠 TECH STACK</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${idea.tech_stack.map(t => `<span class="tech-tag">${escapeHTML(t)}</span>`).join('')}
            </div>
          </div>

          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:6px;">⚡ MVP FEATURES</div>
            ${idea.mvp_features.map(f => `<div style="font-size:12px;color:var(--text);padding:2px 0;">• ${escapeHTML(f)}</div>`).join('')}
          </div>

          <div style="background:rgba(0,240,255,0.05);border:1px solid rgba(0,240,255,0.15);border-radius:8px;padding:10px 12px;">
            <span style="font-size:11px;color:var(--accent);font-family:var(--mono);">🏆 WOW FACTOR: </span>
            <span style="font-size:12px;color:var(--text);">${escapeHTML(idea.wow_factor)}</span>
          </div>
        </div>
      `).join('')}
    `;
  } catch (err) {
    output.innerHTML = '<p style="color:#ef4444;">Failed to generate ideas. Try again.</p>';
  }
}

async function analyzeHackathon() {
  const name = document.getElementById('analyzer-name').value.trim();
  const details = document.getElementById('analyzer-details').value.trim();
  const skills = document.getElementById('analyzer-skills').value.trim();

  if (!details) { showToast('⚠️', 'Missing', 'Paste hackathon details first.'); return; }

  const output = document.getElementById('analyzer-output');
  output.innerHTML = `
    <div style="text-align:center;padding:40px;">
      <div style="font-size:32px;margin-bottom:12px;">🔍</div>
      <p style="color:var(--muted);font-family:var(--mono);font-size:13px;">Analyzing hackathon difficulty...</p>
    </div>`;

  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, details, skills })
    });
    const data = await res.json();

    if (!res.ok) { output.innerHTML = `<p style="color:#ef4444;">${data.error}</p>`; return; }

    const a = data.analysis;
    const diffClass = {
      'Easy': 'difficulty-easy',
      'Medium': 'difficulty-medium',
      'Hard': 'difficulty-hard',
      'Expert': 'difficulty-expert'
    }[a.overall_difficulty] || 'difficulty-medium';

    output.innerHTML = `
      <div class="idea-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h3 style="color:#fff;font-size:18px;margin-bottom:8px;">${escapeHTML(name || 'Hackathon Analysis')}</h3>
            <span class="difficulty-badge ${diffClass}">${a.overall_difficulty}</span>
          </div>
          <div style="text-align:center;">
            <div style="font-family:var(--mono);font-size:40px;font-weight:700;color:var(--accent2);">${a.difficulty_score}</div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);">DIFFICULTY SCORE</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">
          <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid var(--border);">
            <div style="font-size:24px;font-weight:700;color:var(--accent);">${a.skill_match_percentage}%</div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px;">SKILL MATCH</div>
          </div>
          <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid var(--border);">
            <div style="font-size:24px;font-weight:700;color:#f59e0b;">${a.preparation_time_days} days</div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px;">PREP TIME</div>
          </div>
          <div style="text-align:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid var(--border);">
            <div style="font-size:24px;font-weight:700;color:${a.winning_percentage >= 50 ? 'var(--accent)' : '#ef4444'};">${a.winning_percentage}%</div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px;">WIN CHANCE</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:8px;">🛠 REQUIRED SKILLS</div>
            ${a.required_skills.map(s => `<div style="font-size:12px;color:var(--text);padding:2px 0;">• ${escapeHTML(s)}</div>`).join('')}
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:8px;">⚡ RECOMMENDED STACK</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;">
              ${a.recommended_stack.map(t => `<span class="tech-tag">${escapeHTML(t)}</span>`).join('')}
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div>
            <div style="font-size:11px;color:#ef4444;font-family:var(--mono);margin-bottom:8px;">⚠️ KEY CHALLENGES</div>
            ${a.key_challenges.map(c => `<div style="font-size:12px;color:var(--muted);padding:2px 0;">• ${escapeHTML(c)}</div>`).join('')}
          </div>
          <div>
            <div style="font-size:11px;color:var(--accent);font-family:var(--mono);margin-bottom:8px;">✅ YOUR ADVANTAGES</div>
            ${a.advantages.map(c => `<div style="font-size:12px;color:var(--muted);padding:2px 0;">• ${escapeHTML(c)}</div>`).join('')}
          </div>
        </div>

        <div style="margin-bottom:20px;">
          <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:8px;">📅 PREPARATION PLAN</div>
          ${a.preparation_plan.map((p, i) => `
            <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
              <span style="color:var(--accent);font-family:var(--mono);font-size:12px;flex-shrink:0;">${i + 1}.</span>
              <span style="font-size:12px;color:var(--text);">${escapeHTML(p)}</span>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(208,91,255,0.06);border:1px solid rgba(208,91,255,0.2);border-radius:10px;padding:14px;">
          <div style="font-size:11px;color:var(--accent2);font-family:var(--mono);margin-bottom:6px;">🤖 AI VERDICT</div>
          <p style="font-size:13px;color:var(--text);line-height:1.6;">${escapeHTML(a.verdict)}</p>
        </div>
      </div>
    `;
  } catch (err) {
    output.innerHTML = '<p style="color:#ef4444;">Failed to analyze. Try again.</p>';
  }
}

function toggleNavMenu() {
  const dropdown = document.getElementById('nav-dropdown');
  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// Click outside se close ho
document.addEventListener('click', (e) => {
  const btn = document.getElementById('nav-menu-btn');
  const dropdown = document.getElementById('nav-dropdown');
  if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// ── DIRECT MESSAGES ──
let currentDMPartner = null;
let dmEventSource = null;

function eyeUnseen() {
  return `<span class="eye-indicator" title="Not seen">
    <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="#64748b"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="#64748b"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" stroke-width="2"/>
    </svg>
  </span>`;
}

function eyeSeen() {
  return `<span class="eye-indicator" title="Seen">
    <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#00f0ff"/>
      <circle cx="12" cy="12" r="3" stroke="#00f0ff"/>
    </svg>
  </span>`;
}

async function loadConversations() {
  try {
    const res = await fetch('/api/dm/conversations', { headers: authHeaders() });
    const convos = await res.json();
    const list = document.getElementById('conversations-list');

    const totalUnread = convos.reduce((sum, c) => sum + c.unread, 0);
    const badge = document.getElementById('nav-unread-badge');
    if (badge) {
      if (totalUnread > 0) { badge.style.display = 'inline'; badge.textContent = totalUnread; }
      else badge.style.display = 'none';
    }

    if (!convos.length) {
      list.innerHTML = '<p style="padding:20px;color:var(--muted);font-size:13px;">No conversations yet.<br>Add friends and start chatting!</p>';
      return;
    }

    list.innerHTML = convos.map(c => `
      <div class="conv-item ${currentDMPartner === c.partner_email ? 'active' : ''}"
        onclick="openDMChat('${escapeHTML(c.partner_email)}', '${escapeHTML(c.partner.name || c.partner_email)}')">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;color:#050508;flex-shrink:0;">
            ${escapeHTML((c.partner.name || 'U').charAt(0).toUpperCase())}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#fff;font-size:13px;">${escapeHTML(c.partner.name || c.partner_email)}</strong>
              ${onlineDot(c.partner_email, 8)}
              ${c.unread > 0 ? `<span style="background:#ef4444;color:#fff;font-size:10px;padding:2px 6px;border-radius:100px;font-family:var(--mono);">${c.unread}</span>` : ''}
            </div>
            <p style="color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(c.last_message)}</p>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    console.error('Error loading conversations:', e);
  }
}

async function openDMChat(partnerEmail, partnerName) {
  currentDMPartner = partnerEmail;
  await loadConversations();

  document.getElementById('dm-chat-header').innerHTML = `
  <div style="position:relative;flex-shrink:0;">
    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:700;color:#050508;">
      ${escapeHTML(partnerName.charAt(0).toUpperCase())}
    </div>
    <span style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:${isOnline(partnerEmail) ? '#22c55e' : '#64748b'};border:2px solid var(--surface);${isOnline(partnerEmail) ? 'box-shadow:0 0 6px #22c55e;' : ''}"></span>
  </div>
  <div>
    <strong style="color:#fff;">${escapeHTML(partnerName)}</strong>
    <p style="color:${isOnline(partnerEmail) ? '#22c55e' : 'var(--muted)'};font-size:12px;font-family:var(--mono);">${isOnline(partnerEmail) ? '● Online' : '○ Offline'}</p>
  </div>
`;

  const inputArea = document.getElementById('dm-input-area');
  inputArea.style.display = 'flex';

  await loadDMMessages(partnerEmail);

  if (dmEventSource) dmEventSource.close();
  const token = localStorage.getItem('authToken');
  dmEventSource = new EventSource(`/api/dm/${encodeURIComponent(partnerEmail)}/stream?token=${token}`);
  dmEventSource.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'seen') {
      document.querySelectorAll('.eye-unseen').forEach(el => {
        el.outerHTML = eyeSeen();
      });
    } else {
      appendDMMessage(data);
      if (data.to_email === localStorage.getItem('userEmail')) {
        fetch(`/api/dm/${encodeURIComponent(partnerEmail)}/seen`, {
          method: 'PUT',
          headers: authHeaders()
        });
      }
    }
  };

  loadConversations();
}

async function loadDMMessages(partnerEmail) {
  const area = document.getElementById('dm-chat-area');
  area.innerHTML = '<p style="color:var(--muted);text-align:center;font-size:13px;">Loading...</p>';

  try {
    const res = await fetch(`/api/dm/${encodeURIComponent(partnerEmail)}`, { headers: authHeaders() });
    const messages = await res.json();
    area.innerHTML = '';
    messages.forEach(m => appendDMMessage(m));
    area.scrollTop = area.scrollHeight;
  } catch (e) {
    area.innerHTML = '<p style="color:#ef4444;text-align:center;">Failed to load messages.</p>';
  }
}

function appendDMMessage(m) {
  const area = document.getElementById('dm-chat-area');
  const myEmail = localStorage.getItem('userEmail');
  const isSent = m.from_email === myEmail;
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = `dm-msg ${isSent ? 'sent' : 'received'}`;
  div.dataset.msgId = m.id;

  div.innerHTML = `
    <div class="dm-bubble">${escapeHTML(m.message)}</div>
    <div class="dm-meta">
      ${time}
      ${isSent ? (m.seen ? eyeSeen() : `<span class="eye-unseen">${eyeUnseen()}</span>`) : ''}
    </div>
  `;

  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

async function sendDM() {
  const input = document.getElementById('dm-input');
  const message = input.value.trim();
  if (!message || !currentDMPartner) return;

  input.value = '';

  try {
    const res = await fetch(`/api/dm/${encodeURIComponent(currentDMPartner)}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message })
    });

    if (!res.ok) {
      const d = await res.json();
      showToast('❌', 'Error', d.error);
      input.value = message;
    }
  } catch (e) {
    showToast('❌', 'Error', 'Could not send message.');
    input.value = message;
  }
}
// ── VOICE CHAT ──
let speechSynth = window.speechSynthesis;
let currentUtterance = null;
let isListening = false;
let recognition = null;
let silenceTimer = null;

function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('⚠️', 'Not Supported', 'Voice input not supported in this browser.');
    return null;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = 'en-US';

  // LOCAL accumulated — persists across multiple onresult calls via closure
  let accumulated = '';

  r.onresult = (e) => {
    let interim = '';
    // Only process NEW results using resultIndex
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        accumulated += e.results[i][0].transcript + ' ';
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    // Live preview in input box
    const input = document.getElementById('chat-input');
    if (input) input.value = (accumulated + interim).trim();

    // Reset 5-second silence timer on each new word heard
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      const finalText = accumulated.trim();
      if (isListening) {
        stopListening(true);
        if (finalText) {
          // Set input value explicitly before sending
          const inp = document.getElementById('chat-input');
          if (inp) inp.value = finalText;
          setTimeout(() => sendChat(), 150);
          showToast('✅', 'Got it!', 'Sending your message...');
        } else {
          showToast('🎤', 'Nothing heard', 'Try speaking again.');
        }
      }
    }, 5000);
  };

  r.onerror = (ev) => {
    if (ev.error === 'no-speech') return;
    stopListening();
    showToast('❌', 'Voice Error', 'Could not hear you. Try again.');
  };

  r.onend = () => {
    if (isListening) stopListening();
  };

  return r;
}

function toggleVoiceInput() {
  if (isListening) { stopListening(true); return; } // SEND when manually stopped
  const input = document.getElementById('chat-input');
  if (input) input.value = '';
  recognition = initSpeechRecognition();
  if (!recognition) return;
  isListening = true;
  try { recognition.start(); } catch (e) { isListening = false; return; }
  const btn = document.getElementById('mic-btn');
  if (btn) { btn.textContent = '🔴'; btn.style.borderColor = '#ef4444'; btn.style.color = '#ef4444'; }
  showToast('🎤', 'Listening...', 'Speak freely — auto-sends after 5s pause');

  // Fallback: if user never speaks, stop after 5s
  silenceTimer = setTimeout(() => {
    if (isListening) {
      stopListening();
      showToast('🎤', 'Nothing heard', 'Try speaking again.');
    }
  }, 5000);
}

function stopListening(autoSend = false) {
  isListening = false;
  clearTimeout(silenceTimer);
  silenceTimer = null;
  if (recognition) { try { recognition.stop(); } catch (e) { } recognition = null; }
  const btn = document.getElementById('mic-btn');
  if (btn) { btn.textContent = '🎤'; btn.style.borderColor = 'var(--border-light)'; btn.style.color = 'var(--muted)'; }

  if (autoSend) {
    const input = document.getElementById('chat-input');
    if (input && input.value.trim()) {
      setTimeout(() => sendChat(), 150);
      showToast('✅', 'Got it!', 'Sending your message...');
    }
  }
}

function speakText(text) {
  if (!speechSynth) return;
  stopSpeech();

  // Clean text — remove emojis and HTML tags
  const clean = text.replace(/<[^>]*>/g, '').replace(/[\u{1F600}-\u{1F64F}]/gu, '').replace(/[\u{1F300}-\u{1F5FF}]/gu, '').replace(/[\u{1F680}-\u{1F6FF}]/gu, '').replace(/[\u{2600}-\u{26FF}]/gu, '').trim();

  currentUtterance = new SpeechSynthesisUtterance(clean);
  currentUtterance.rate = 0.75;
  currentUtterance.pitch = 1.0;
  currentUtterance.volume = 1.0;

  const stopBtn = document.getElementById('stop-btn');

  currentUtterance.onstart = () => { if (stopBtn) stopBtn.style.display = 'flex'; };
  currentUtterance.onend = () => { if (stopBtn) stopBtn.style.display = 'none'; currentUtterance = null; };
  currentUtterance.onerror = () => { if (stopBtn) stopBtn.style.display = 'none'; };

  speechSynth.speak(currentUtterance);
}

function stopSpeech() {
  if (speechSynth) speechSynth.cancel();
  currentUtterance = null;
  const stopBtn = document.getElementById('stop-btn');
  if (stopBtn) stopBtn.style.display = 'none';
}
function suggestTranslation() {
  showToast('🌐', 'Translation', 'Right-click → Translate to your language, or use browser translation.');
}
// ── LIVE COUNTDOWN ──
function startCountdowns() {
  setInterval(() => {
    document.querySelectorAll('[data-countdown]').forEach(el => {
      const target = new Date(el.dataset.countdown);
      const diff = target - new Date();
      if (diff <= 0) { el.textContent = 'Ended'; el.style.color = '#ef4444'; return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) el.textContent = `${days}d ${hours}h ${mins}m left`;
      else if (hours > 0) el.textContent = `${hours}h ${mins}m ${secs}s left`;
      else el.textContent = `${mins}m ${secs}s left ⚡`;

      // Color urgency
      if (days <= 1) el.style.color = '#ef4444';
      else if (days <= 5) el.style.color = '#f59e0b';
      else el.style.color = 'var(--accent)';
    });
  }, 1000);
}

// ── PUBLIC PROFILE ──
async function openPublicProfile(username) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
    if (!res.ok) { showToast('❌', 'Not Found', 'User not found.'); return; }
    const user = await res.json();

    // Set page title
    document.getElementById('pub-profile-title').textContent = user.name;

    // Avatar
    const avatar = document.getElementById('pub-avatar');
    avatar.textContent = user.name.charAt(0).toUpperCase();

    // Basic info
    document.getElementById('pub-name').textContent = user.name;
    document.getElementById('pub-username').textContent = '@' + user.username;
    document.getElementById('pub-bio').textContent = user.bio || 'No bio yet.';
    document.getElementById('pub-college').textContent = user.college || '—';
    document.getElementById('pub-skills').textContent = user.skills || '—';

    // Gender
    const genderEl = document.getElementById('pub-gender');
    if (user.gender === 'male') { genderEl.textContent = '♂'; genderEl.style.color = '#60a5fa'; }
    else if (user.gender === 'female') { genderEl.textContent = '♀'; genderEl.style.color = '#f472b6'; }
    else genderEl.textContent = '';

    // Projects
    const projectsDiv = document.getElementById('pub-projects');
    if (!user.projects?.length) {
      projectsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">No projects submitted yet.</p>';
    } else {
      projectsDiv.innerHTML = user.projects.map(p => `
        <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid var(--border);margin-bottom:8px;">
          <strong style="color:#fff;">${escapeHTML(p.title)}</strong>
          <p style="color:var(--muted);font-size:12px;margin:4px 0;">${escapeHTML(p.description || '')}</p>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
            ${p.tech_stack ? p.tech_stack.split(',').map(t => `<span class="tech-tag">${escapeHTML(t.trim())}</span>`).join('') : ''}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            ${p.github_link ? `<a href="${escapeHTML(p.github_link)}" target="_blank" class="project-link-btn github">⬡ GitHub</a>` : ''}
            ${p.demo_link ? `<a href="${escapeHTML(p.demo_link)}" target="_blank" class="project-link-btn demo">▶ Demo</a>` : ''}
          </div>
        </div>
      `).join('');
    }

    // Teams
    const teamsDiv = document.getElementById('pub-teams');
    if (!user.teams?.length) {
      teamsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">Not in any teams yet.</p>';
    } else {
      teamsDiv.innerHTML = user.teams.map(t => `
        <div style="padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid var(--border);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:#fff;font-size:13px;">${escapeHTML(t.teams?.name || 'Team')}</strong>
          <span style="color:var(--muted);font-size:12px;font-family:var(--mono);">🏆 ${escapeHTML(t.teams?.hackathon || 'Open')}</span>
        </div>
      `).join('');
    }

    goTo('public-profile');
  } catch (err) {
    showToast('❌', 'Error', 'Could not load profile.');
  }
}

// ── ONLINE STATUS ──
let onlineUsers = [];

async function startHeartbeat() {
  const ping = async () => {
    if (localStorage.getItem('loggedIn') === 'true') {
      try {
        await fetch('/api/ping', { method: 'POST', headers: authHeaders() });
      } catch (e) { }
    }
  };
  ping();
  setInterval(ping, 30000);
}

async function fetchOnlineUsers() {
  if (document.hidden) return;
  try {
    const res = await fetch('/api/users/online', { headers: authHeaders() });
    onlineUsers = await res.json();
  } catch (e) { }
}

function isOnline(email) {
  return onlineUsers.includes(email);
}

function onlineDot(email, size = 10) {
  const online = isOnline(email);
  return `<span style="width:${size}px;height:${size}px;border-radius:50%;background:${online ? '#22c55e' : '#64748b'};display:inline-block;flex-shrink:0;box-shadow:${online ? '0 0 6px #22c55e' : 'none'};" title="${online ? 'Online' : 'Offline'}"></span>`;
}
