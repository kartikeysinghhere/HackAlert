import { state } from './state.js';
import { escapeHTML, safeHTML, safeJSString, authHeaders } from './api.js';
import { showToast, openModal, closeModal } from './ui.js';
import { goTo } from './router.js';

let onlineUsers = [];

export function loadProfile() {
  const name = localStorage.getItem('userName') || '—';
  const email = localStorage.getItem('userEmail') || '—';
  const mobile = localStorage.getItem('userMobile') || '—';
  const college = localStorage.getItem('userCollege') || '—';
  const username = localStorage.getItem('userUsername') || '—';
  const gender = localStorage.getItem('userGender') || '';
  const bio = localStorage.getItem('userBio') || '';
  const skills = localStorage.getItem('userSkills') || '';

  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = name;
  const emailEl = document.getElementById('profile-email');
  if (emailEl) emailEl.textContent = email;
  const mobileEl = document.getElementById('profile-mobile');
  if (mobileEl) mobileEl.textContent = mobile;
  const collegeEl = document.getElementById('profile-college');
  if (collegeEl) collegeEl.textContent = college;
  const usernameEl = document.getElementById('profile-username');
  if (usernameEl) usernameEl.textContent = '@' + username;
  const skillsEl = document.getElementById('profile-skills');
  if (skillsEl) skillsEl.textContent = skills || '—';

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

  if (list) {
    if (saved.length === 0) {
      list.innerHTML = '<p style="color:var(--muted)">No hackathons saved yet.</p>';
    } else {
      list.innerHTML = safeHTML(saved.map(hack => `
        <div style="padding:8px 12px;margin-bottom:8px;background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <span>🔖 ${escapeHTML(hack.name)}</span>
          <button onclick="window.unsaveHackathon('${safeJSString(hack.name)}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px;">✕ Remove</button>
        </div>
      `).join(''));
    }
  }

  const roadmapDiv = document.getElementById('roadmap-list');
  if (roadmapDiv) {
    if (saved.length === 0) {
      roadmapDiv.innerHTML = '<p style="color:var(--muted)">Save some hackathons to see your roadmap!</p>';
    } else {
      saved.sort((a, b) => new Date(a.start) - new Date(b.start));
      const now = new Date();

      roadmapDiv.innerHTML = safeHTML(saved.map(hack => {
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
            <button onclick="window.unsaveHackathon('${safeJSString(hack.name)}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px;">✕</button>
          </div>
        `;
      }).join(''));
    }
  }

  loadFriends();
}

export function loadFindFriends() {
  const resDiv = document.getElementById('user-search-results');
  if (resDiv) resDiv.innerHTML = '';
  const searchInput = document.getElementById('user-search-input');
  if (searchInput) searchInput.value = '';
  fetch(`/api/users/search?q=a`, { headers: authHeaders(), credentials: 'include' })
    .then(r => r.json())
    .then(users => showUserResults(users))
    .catch(() => { });
}

export function showUserSearch() {
  goTo('find-friends');
}

export function hideUserSearch() {
  closeModal('user-search-modal');
}

let searchUsersTimeout = null;
export async function searchUsers(q) {
  clearTimeout(searchUsersTimeout);
  if (!q.trim()) {
    try {
      const res = await fetch(`/api/users/search?q=a`, { headers: authHeaders(), credentials: 'include' });
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
      showUserResults(users);
    } catch (e) {
      const resultsDiv = document.getElementById('user-search-results');
      if (resultsDiv) resultsDiv.innerHTML = '<p style="color:#ef4444;font-size:13px;">Error searching users.</p>';
    }
  }, 400);
}

export function showUserResults(users) {
  const resultsDiv = document.getElementById('user-search-results');
  if (!resultsDiv) return;
  if (!users.length) { resultsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">No users found.</p>'; return; }
  resultsDiv.innerHTML = users.map(u => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#050508;flex-shrink:0;">
        ${escapeHTML(u.name.charAt(0).toUpperCase())}
      </div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:6px;">
          <strong onclick="window.openPublicProfile('${escapeHTML(safeJSString(u.username))}')" style="cursor:pointer;color:#fff;font-size:14px;text-decoration:underline;text-decoration-color:var(--accent);">${escapeHTML(u.name)}</strong>
          <span style="font-size:14px;">${u.gender === 'male' ? '♂' : u.gender === 'female' ? '♀' : ''}</span>
          ${onlineDot(u.email, 8)}
        </div>
        <p style="color:var(--accent);font-family:var(--mono);font-size:11px;">@${escapeHTML(u.username || '')}</p>
        ${u.bio ? `<p style="color:var(--muted);font-size:12px;margin-top:2px;">${escapeHTML(u.bio)}</p>` : ''}
      </div>
      <button onclick="window.sendFriendRequest(this, '${escapeHTML(safeJSString(u.email))}')"
        style="background:var(--accent);color:#050508;border:none;padding:6px 14px;border-radius:8px;font-family:var(--mono);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;">
        + Add
      </button>
    </div>
  `).join('');
}

export async function sendFriendRequest(btn, to_email) {
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Sending...';
  }
  try {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ to_email })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('✅', 'Request Sent!', 'Friend request sent successfully.');
      if (btn) {
        btn.innerText = 'Pending';
        btn.style.background = '#64748b';
        btn.style.color = '#fff';
      }
    } else {
      showToast('❌', 'Error', data.error);
      if (btn) {
        btn.disabled = false;
        btn.innerText = '+ Add';
      }
    }
  } catch (e) {
    showToast('❌', 'Error', 'Could not send request.');
    if (btn) {
      btn.disabled = false;
      btn.innerText = '+ Add';
    }
  }
}

export async function loadFriends() {
  try {
    const reqRes = await fetch('/api/friends/requests', { headers: authHeaders(), credentials: 'include' });
    const requests = await reqRes.json();
    const pendingDiv = document.getElementById('pending-requests');

    if (pendingDiv) {
      if (requests.length) {
        pendingDiv.innerHTML = `
          <h4 style="color:var(--accent);font-family:var(--mono);font-size:12px;margin-bottom:10px;">📬 PENDING REQUESTS (${requests.length})</h4>
          ${requests.map(r => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:rgba(0,240,255,0.05);border:1px solid rgba(0,240,255,0.2);border-radius:10px;margin-bottom:8px;">
              <div style="flex:1;">
                <strong style="color:#fff;font-size:13px;">${escapeHTML(r.from_email)}</strong>
                <p style="color:var(--muted);font-size:11px;font-family:var(--mono);">wants to be your friend</p>
              </div>
              <button onclick="window.respondRequest(${r.id}, 'accepted')" style="background:var(--accent);color:#050508;border:none;padding:6px 12px;border-radius:6px;font-family:var(--mono);font-size:11px;font-weight:700;cursor:pointer;margin-right:4px;">✓ Accept</button>
              <button onclick="window.respondRequest(${r.id}, 'declined')" style="background:transparent;border:1px solid #ef4444;color:#ef4444;padding:6px 12px;border-radius:6px;font-family:var(--mono);font-size:11px;cursor:pointer;">✕</button>
            </div>
          `).join('')}
        `;
      } else {
        pendingDiv.innerHTML = '';
      }
    }

    const friendRes = await fetch('/api/friends', { headers: authHeaders(), credentials: 'include' });
    const friends = await friendRes.json();
    const friendsDiv = document.getElementById('friends-list');

    if (friendsDiv) {
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
                    <strong onclick="window.openPublicProfile('${escapeHTML(safeJSString(f.username))}')" style="color:#fff;font-size:13px;cursor:pointer;text-decoration:underline;text-decoration-color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(f.name)}</strong>
                    <span style="font-size:12px;">${f.gender === 'male' ? '♂' : f.gender === 'female' ? '♀' : ''}</span>
                    ${onlineDot(f.email, 8)}
                  </div>
                  <p style="color:var(--accent);font-family:var(--mono);font-size:10px;">@${escapeHTML(f.username || '')}</p>
                </div>
                <button onclick="window.openDMChat('${escapeHTML(safeJSString(f.email))}','${escapeHTML(safeJSString(f.name))}')" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:4px 10px;border-radius:6px;font-family:var(--mono);font-size:10px;cursor:pointer;margin-right:4px;">💬</button>
                <button onclick="window.removeFriend('${escapeHTML(safeJSString(f.email))}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:14px;">✕</button>
              </div>
            `).join('')}
          </div>
        `;
    }
  } catch (e) {
    console.error('Error loading friends:', e);
  }
}

export async function respondRequest(id, status) {
  try {
    const res = await fetch(`/api/friends/requests/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
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

export async function removeFriend(friend_email) {
  if (!confirm('Remove this friend?')) return;
  const res = await fetch(`/api/friends/${encodeURIComponent(friend_email)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (res.ok) {
    showToast('✅', 'Removed', 'Friend removed.');
    loadFriends();
  }
}

export async function openPublicProfile(username) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
    if (!res.ok) { showToast('❌', 'Not Found', 'User not found.'); return; }
    const user = await res.json();

    document.getElementById('pub-profile-title').textContent = user.name;
    const avatar = document.getElementById('pub-avatar');
    if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();

    document.getElementById('pub-name').textContent = user.name;
    document.getElementById('pub-username').textContent = '@' + user.username;
    document.getElementById('pub-bio').textContent = user.bio || 'No bio yet.';
    document.getElementById('pub-college').textContent = user.college || '—';
    document.getElementById('pub-skills').textContent = user.skills || '—';

    const genderEl = document.getElementById('pub-gender');
    if (genderEl) {
      if (user.gender === 'male') { genderEl.textContent = '♂'; genderEl.style.color = '#60a5fa'; }
      else if (user.gender === 'female') { genderEl.textContent = '♀'; genderEl.style.color = '#f472b6'; }
      else genderEl.textContent = '';
    }

    const projectsDiv = document.getElementById('pub-projects');
    if (projectsDiv) {
      if (!user.projects?.length) {
        projectsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">No projects submitted yet.</p>';
      } else {
        projectsDiv.innerHTML = safeHTML(user.projects.map(p => `
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
        `).join(''));
      }
    }

    const teamsDiv = document.getElementById('pub-teams');
    if (teamsDiv) {
      if (!user.teams?.length) {
        teamsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;">Not in any teams yet.</p>';
      } else {
        teamsDiv.innerHTML = safeHTML(user.teams.map(t => `
          <div style="padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid var(--border);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#fff;font-size:13px;">${escapeHTML(t.teams?.name || 'Team')}</strong>
            <span style="color:var(--muted);font-size:12px;font-family:var(--mono);">🏆 ${escapeHTML(t.teams?.hackathon || 'Open')}</span>
          </div>
        `).join(''));
      }
    }

    goTo('public-profile');
  } catch (err) {
    showToast('❌', 'Error', 'Could not load profile.');
  }
}

export function eyeUnseen() {
  return `<span class="eye-indicator" title="Not seen">
    <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="#64748b"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="#64748b"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" stroke-width="2"/>
    </svg>
  </span>`;
}

export function eyeSeen() {
  return `<span class="eye-indicator" title="Seen">
    <svg class="eye-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#00f0ff"/>
      <circle cx="12" cy="12" r="3" stroke="#00f0ff"/>
    </svg>
  </span>`;
}

export async function loadConversations() {
  try {
    const res = await fetch('/api/dm/conversations', { headers: authHeaders() });
    const convos = await res.json();
    const list = document.getElementById('conversations-list');
    if (!list) return;

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

    list.innerHTML = safeHTML(convos.map(c => `
      <div class="conv-item ${state.currentDMPartner === c.partner_email ? 'active' : ''}"
        onclick="window.openDMChat('${escapeHTML(safeJSString(c.partner_email))}', '${escapeHTML(safeJSString(c.partner.name || c.partner_email))}')">
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
    `).join(''));
  } catch (e) {
    console.error('Error loading conversations:', e);
  }
}

export async function openDMChat(partnerEmail, partnerName) {
  state.currentDMPartner = partnerEmail;
  await loadConversations();

  const header = document.getElementById('dm-chat-header');
  if (header) {
    header.innerHTML = safeHTML(`
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
    `);
  }

  const inputArea = document.getElementById('dm-input-area');
  if (inputArea) inputArea.style.display = 'flex';

  await loadDMMessages(partnerEmail);

  if (state.activeDMStream) state.activeDMStream.close();
  state.activeDMStream = new EventSource(`/api/dm/${encodeURIComponent(partnerEmail)}/stream`);
  state.activeDMStream.onmessage = (e) => {
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

export async function loadDMMessages(partnerEmail) {
  const area = document.getElementById('dm-chat-area');
  if (!area) return;
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

export function appendDMMessage(m) {
  const area = document.getElementById('dm-chat-area');
  if (!area) return;
  const myEmail = localStorage.getItem('userEmail');
  const isSent = m.from_email === myEmail;
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = `dm-msg ${isSent ? 'sent' : 'received'}`;
  div.dataset.msgId = m.id;

  div.innerHTML = safeHTML(`
    <div class="dm-bubble">${escapeHTML(m.message)}</div>
    <div class="dm-meta">
      ${time}
      ${isSent ? (m.seen ? eyeSeen() : `<span class="eye-unseen">${eyeUnseen()}</span>`) : ''}
    </div>
  `);

  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

export async function sendDM() {
  const input = document.getElementById('dm-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message || !state.currentDMPartner) return;

  input.value = '';

  try {
    const res = await fetch(`/api/dm/${encodeURIComponent(state.currentDMPartner)}`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
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

export async function startHeartbeat() {
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

export async function fetchOnlineUsers() {
  if (document.hidden) return;
  try {
    const res = await fetch('/api/users/online', { headers: authHeaders(), credentials: 'include' });
    onlineUsers = await res.json();
  } catch (e) { }
}

export function isOnline(email) {
  return onlineUsers.includes(email);
}

export function onlineDot(email, size = 10) {
  const online = isOnline(email);
  return `<span style="width:${size}px;height:${size}px;border-radius:50%;background:${online ? '#22c55e' : '#64748b'};display:inline-block;flex-shrink:0;box-shadow:${online ? '0 0 6px #22c55e' : 'none'};" title="${online ? 'Online' : 'Offline'}"></span>`;
}
