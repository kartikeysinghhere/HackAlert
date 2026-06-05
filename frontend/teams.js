import { state } from './state.js';
import { escapeHTML, safeHTML, safeJSString, authHeaders } from './api.js';
import { showToast, openModal, closeModal, renderErrorRecovery } from './ui.js';

function renderTeamSkeletons() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `
      <div class="skeleton-card" aria-busy="true" aria-live="polite" style="opacity: 0.85;">
        <div class="skeleton-bar title shimmer"></div>
        <div class="skeleton-bar shimmer" style="width: 70%;"></div>
        <div class="skeleton-bar shimmer" style="width: 80%;"></div>
        <div class="skeleton-bar shimmer" style="width: 50%;"></div>
        <div class="skeleton-bar shimmer" style="width: 90%;"></div>
        <div style="display: flex; gap: 8px; margin-top: auto;">
          <div class="skeleton-bar shimmer" style="width: 90px; height: 32px; border-radius: 8px;"></div>
          <div class="skeleton-bar shimmer" style="width: 70px; height: 32px; border-radius: 8px;"></div>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

export async function loadTeams() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  
  renderTeamSkeletons();
  
  try {
    const res = await fetch('/api/teams');
    if (!res.ok) throw new Error('Failed to load teams');
    const teams = await res.json();
    const currentUserEmail = localStorage.getItem('userEmail');

    if (!teams.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#aaa;padding:20px;">No teams yet. Create one!</p>';
      return;
    }
    grid.innerHTML = safeHTML(teams.map(t => `
      <div class="feature-card">
        <h3 style="margin-bottom: 8px;">${escapeHTML(t.name)}</h3>
        <p style="color:var(--muted);font-size:13px;margin-bottom:4px;">🏆 ${escapeHTML(t.hackathon || 'Open Hackathon')}</p>
        <p style="font-size:13px;margin-bottom:4px;">🛠 ${escapeHTML(t.skills || 'Any skills welcome')}</p>
        <p style="font-size:13px;margin-bottom:8px;">👥 ${t.slots_left} slots left / ${t.size} total</p>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">Leader: ${escapeHTML(t.leader_email)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${t.leader_email === currentUserEmail
        ? `<button onclick="window.deleteTeam(${t.id})" class="btn-primary" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Delete Team</button>`
        : `<button onclick="window.joinTeam(${t.id}, '${safeJSString(t.name)}')" class="btn-primary" style="background:var(--accent);color:#050508;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Join Team</button>`
      }
          <button onclick="window.openTeamChat(${t.id},'${safeJSString(t.name)}')" class="btn-secondary" style="background:transparent;border:1px solid var(--border-light);color:var(--muted);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;">💬 Chat</button>
        </div>
      </div>
    `).join(''));
  } catch (err) {
    console.error('Error loading teams:', err);
    renderErrorRecovery('teams-grid', 'Failed to load teams. Please check your network connection.', async () => {
      await loadTeams();
    });
  }
}

export function showCreateTeam() {
  openModal('create-team-modal');
}
export function hideCreateTeam() {
  closeModal('create-team-modal');
}

export async function createTeam() {
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
  if (res.ok) {
    hideCreateTeam();
    loadTeams();
  } else {
    const d = await res.json();
    showToast('❌', 'Error creating team', d.error);
  }
}

export async function joinTeam(teamId, teamName) {
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

export async function openTeamChat(teamId, teamName) {
  state.currentTeamId = teamId;
  document.getElementById('chat-team-name').textContent = teamName;
  openModal('team-chat-modal');

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
      membersListDiv.innerHTML = '👥 ' + safeHTML(members.map(m => `<span style="background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px;">${escapeHTML(m.user_name || m.user_email)}</span>`).join(''));
    }

    const teamActionsDiv = document.getElementById('team-chat-actions');
    if (teamActionsDiv) {
      teamActionsDiv.innerHTML = '';
      if (isMember && !isLeader) {
        teamActionsDiv.insertAdjacentHTML('beforeend', `<button onclick="window.leaveTeam(${teamId})" style="background:#f97316;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Leave Team</button>`);
      }
      teamActionsDiv.insertAdjacentHTML('beforeend', `<button onclick="window.copyInviteLink(${teamId})" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;margin-left:8px;">🔗 Invite</button>`);
    }
  } catch (err) {
    console.error('Error loading team chat:', err);
    showToast('⚠️', 'Error', 'Failed to load team details. Please try again.');
  }

  if (state.chatEventSource) {
    state.chatEventSource.close();
  }

  state.chatEventSource = new EventSource(`/api/teams/${teamId}/stream`);
  state.chatEventSource.onmessage = (e) => {
    const data = JSON.parse(e.data);
    appendTeamMessage(data);
  };
}

export function copyInviteLink(teamId) {
  const url = `${window.location.origin}${window.location.pathname}?join_team=${teamId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('✅', 'Copied!', 'Invite link copied to clipboard.');
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅', 'Copied!', 'Invite link copied to clipboard.');
  }
}

export function closeTeamChat() {
  closeModal('team-chat-modal');
  if (state.chatEventSource) {
    state.chatEventSource.close();
    state.chatEventSource = null;
  }
  state.currentTeamId = null;
}

export function appendTeamMessage(m) {
  const area = document.getElementById('team-chat-area');
  if (!area) return;
  area.insertAdjacentHTML('beforeend', safeHTML(`
    <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 14px;margin-bottom:8px;">
      <strong style="color:var(--accent);font-size:12px;">${escapeHTML(m.sender_name || m.sender_email)}</strong>
      <p style="font-size:14px;margin-top:4px;color:var(--text);">${escapeHTML(m.message)}</p>
      <p style="font-size:11px;color:var(--muted);margin-top:4px;">${new Date(m.sent_at || Date.now()).toLocaleTimeString()}</p>
    </div>
  `));
  area.scrollTop = area.scrollHeight;
}

export async function loadTeamMessages() {
  const area = document.getElementById('team-chat-area');
  if (!area) return;
  const res = await fetch(`/api/teams/${state.currentTeamId}/messages`);
  const msgs = await res.json();
  area.innerHTML = '';
  msgs.forEach(appendTeamMessage);
}

export async function sendTeamMessage() {
  const input = document.getElementById('team-msg-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;

  const res = await fetch(`/api/teams/${state.currentTeamId}/messages`, {
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

export async function leaveTeam(teamId) {
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
    const d = await res.json();
    if (res.ok) {
      showToast('✅', 'Left Team', 'You have successfully left the team.');
      closeTeamChat();
      loadTeams();
    } else {
      showToast('❌', 'Error', d.error);
    }
  } catch (err) {
    showToast('❌', 'Error', 'Could not leave team.');
  }
}

export async function deleteTeam(teamId) {
  if (!confirm('Are you sure you want to delete this team? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const d = await res.json();
    if (res.ok) {
      showToast('✅', 'Deleted', 'Team deleted successfully.');
      loadTeams();
    } else {
      showToast('❌', 'Error', d.error);
    }
  } catch (err) {
    showToast('❌', 'Error', 'Could not delete team.');
  }
}

function renderShowcaseSkeletons() {
  const grid = document.getElementById('showcase-grid');
  if (!grid) return;
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `
      <div class="skeleton-card" aria-busy="true" aria-live="polite" style="opacity: 0.85;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; width: 100%;">
          <div style="flex-grow: 1;">
            <div class="skeleton-bar title shimmer" style="width: 60%; margin-bottom: 6px;"></div>
            <div class="skeleton-bar shimmer" style="width: 40%;"></div>
          </div>
          <div class="skeleton-bar shimmer" style="width: 80px; height: 20px; border-radius: 6px;"></div>
        </div>
        <div class="skeleton-bar shimmer" style="width: 90%;"></div>
        <div class="skeleton-bar shimmer" style="width: 80%;"></div>
        <div style="display: flex; gap: 6px; margin: 8px 0;">
          <div class="skeleton-bar shimmer" style="width: 60px; height: 18px; border-radius: 4px;"></div>
          <div class="skeleton-bar shimmer" style="width: 80px; height: 18px; border-radius: 4px;"></div>
        </div>
        <div class="skeleton-bar shimmer" style="width: 50%;"></div>
        <div style="display: flex; gap: 8px; margin-top: auto; padding-top: 12px;">
          <div class="skeleton-bar shimmer" style="width: 80px; height: 32px; border-radius: 8px;"></div>
          <div class="skeleton-bar shimmer" style="width: 80px; height: 32px; border-radius: 8px;"></div>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

export async function loadShowcase() {
  const grid = document.getElementById('showcase-grid');
  if (!grid) return;
  
  renderShowcaseSkeletons();

  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to load projects');
    const projects = await res.json();

    if (!projects.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#aaa;padding:40px;">No projects submitted yet. Be the first! 🚀</p>';
      return;
    }

    const currentUserEmail = localStorage.getItem('userEmail');

    grid.innerHTML = safeHTML(projects.map(p => {
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
            ${p.submitted_by === currentUserEmail ? `<button onclick="window.deleteProject(${p.team_id})" class="project-link-btn" style="color:#ef4444;border-color:rgba(239,68,68,0.3);">✕ Delete</button>` : ''}
          </div>
        </div>
      `;
    }).join(''));
  } catch (err) {
    console.error('Error loading projects:', err);
    renderErrorRecovery('showcase-grid', 'Failed to load projects. Please try again.', async () => {
      await loadShowcase();
    });
  }
}

export async function showSubmitProject() {
  const select = document.getElementById('project-team-id');
  if (!select) return;
  select.innerHTML = '<option value="">Select Team</option>';
  try {
    const res = await fetch('/api/teams');
    const teams = await res.json();
    const currentUserEmail = localStorage.getItem('userEmail');
    const myTeams = teams.filter(t => t.leader_email === currentUserEmail);
    
    myTeams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
  } catch (e) { }
  openModal('submit-project-modal');
}

export function hideSubmitProject() {
  closeModal('submit-project-modal');
}

export async function submitProject() {
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
      credentials: 'include',
      body: JSON.stringify({ title, description, github_link, demo_link, tech_stack })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('🚀', 'Submitted!', 'Your project is now live in the showcase.');
      hideSubmitProject();
      loadShowcase();
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

export async function deleteProject(teamId) {
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

export function showCreateTeammateModal() {
  const el = document.getElementById('create-teammate-modal');
  if (el) el.style.display = 'flex';
}
export function hideCreateTeammateModal() {
  const el = document.getElementById('create-teammate-modal');
  if (el) el.style.display = 'none';
}

function renderTeammateSkeletons() {
  const grid = document.getElementById('teammate-listings-grid');
  if (!grid) return;
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `
      <div class="skeleton-card" aria-busy="true" aria-live="polite" style="opacity: 0.85; display: flex; flex-direction: column; gap: 12px;">
        <div class="skeleton-bar shimmer" style="width: 30%; height: 12px;"></div>
        <div class="skeleton-bar title shimmer" style="width: 70%;"></div>
        <div class="skeleton-bar shimmer" style="width: 90%;"></div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border);">
          <div class="skeleton-bar shimmer" style="width: 70px; height: 20px; border-radius: 6px;"></div>
          <div class="skeleton-bar shimmer" style="width: 80px; height: 20px; border-radius: 6px;"></div>
          <div class="skeleton-bar shimmer" style="width: 60px; height: 20px; border-radius: 6px;"></div>
        </div>
        <div class="skeleton-bar shimmer" style="width: 100%; height: 32px; border-radius: 8px; margin-top: 12px;"></div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

export async function fetchTeammates() {
  const grid = document.getElementById('teammate-listings-grid');
  if (!grid) return;
  
  renderTeammateSkeletons();

  const skill = document.getElementById('tm-skill-search')?.value || '';
  const hackathon = document.getElementById('tm-hackathon-search')?.value || '';
  let url = '/api/teammates?';
  if (skill) url += 'skill=' + encodeURIComponent(skill) + '&';
  if (hackathon) url += 'hackathon=' + encodeURIComponent(hackathon);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch teammate listings');
    const data = await res.json();
    
    if (data.length === 0) {
      grid.innerHTML = '<p style="color:var(--muted);">No listings found.</p>';
      return;
    }

    grid.innerHTML = data.map(tm => `<div class="feature-card" style="position:relative;display:flex;flex-direction:column;gap:12px;">
      ${tm.creator_email === localStorage.getItem('userEmail') ? `<div style="position:absolute;top:16px;right:16px;display:flex;gap:8px;">
        <button onclick="window.markTeammateFilled('${tm.id}')" title="Mark as Filled" style="background:var(--accent);border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;color:#000;">✅ Filled</button>
        <button onclick="window.deleteTeammateListing('${tm.id}')" title="Delete" style="background:#ef4444;color:#fff;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">🗑️ Delete</button>
      </div>` : ''}
      <div style="font-family:var(--mono);font-size:11px;color:var(--accent);">${safeHTML(tm.hackathon_name)}</div>
      <h3 style="color:#fff;margin:0;">${safeHTML(tm.required_role)}</h3>
      <p style="color:var(--muted);font-size:13px;margin:0;">${safeHTML(tm.description)}</p>
      
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:12px;border-top:1px solid var(--border);">
        <span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:6px;font-size:11px;color:var(--text);">🛠 ${safeHTML(tm.tech_stack)}</span>
        <span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:6px;font-size:11px;color:var(--text);">⭐ ${safeHTML(tm.experience_level)}</span>
        <span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:6px;font-size:11px;color:var(--text);">👥 ${tm.team_size_remaining} spots</span>
        <span style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:6px;font-size:11px;color:var(--text);">📍 ${safeHTML(tm.mode)}</span>
      </div>
      <div style="margin-top:12px;">
        <a href="mailto:${safeHTML(tm.creator_email)}" style="display:block;text-align:center;background:rgba(0,240,255,0.1);color:var(--accent);border:1px solid rgba(0,240,255,0.3);padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700;">✉️ Contact ${safeHTML(tm.creator_email)}</a>
      </div>
    </div>`).join('');
  } catch (err) {
    console.error(err);
    renderErrorRecovery('teammate-listings-grid', 'Failed to load teammate listings.', async () => {
      await fetchTeammates();
    });
  }
}

export async function submitTeammateListing() {
  const hackathon_name = document.getElementById('tm-hackathon').value;
  const required_role = document.getElementById('tm-role').value;
  const tech_stack = document.getElementById('tm-stack').value;
  const experience_level = document.getElementById('tm-exp').value;
  const team_size_remaining = document.getElementById('tm-size').value;
  const mode = document.getElementById('tm-mode').value;
  const description = document.getElementById('tm-desc').value;

  if (!hackathon_name || !required_role || !tech_stack || !experience_level || !team_size_remaining || !mode || !description) {
    return alert('All fields are required');
  }

  try {
    const res = await fetch('/api/teammates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hackathon_name, required_role, tech_stack, experience_level, team_size_remaining, mode, description })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    hideCreateTeammateModal();
    document.getElementById('tm-hackathon').value = '';
    document.getElementById('tm-role').value = '';
    document.getElementById('tm-stack').value = '';
    document.getElementById('tm-exp').value = '';
    document.getElementById('tm-size').value = '';
    document.getElementById('tm-mode').value = '';
    document.getElementById('tm-desc').value = '';
    
    fetchTeammates();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

export async function deleteTeammateListing(id) {
  if (!confirm('Are you sure you want to delete this listing?')) return;
  try {
    const res = await fetch('/api/teammates/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    fetchTeammates();
  } catch (err) {
    alert(err.message);
  }
}

export async function markTeammateFilled(id) {
  if (!confirm('Mark this role as filled? It will be removed from the public listings.')) return;
  try {
    const res = await fetch('/api/teammates/' + id, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to update');
    fetchTeammates();
  } catch (err) {
    alert(err.message);
  }
}

export function showMatchmaker() {
  openModal('matchmaker-modal');
  document.getElementById('match-skills').value = localStorage.getItem('userSkills') || '';
  document.getElementById('match-results').innerHTML = '';
}
export function hideMatchmaker() {
  closeModal('matchmaker-modal');
}

export async function runMatchmaker() {
  const user_skills = document.getElementById('match-skills').value.trim();
  const experience_level = document.getElementById('match-experience').value;
  const hackathon_type = document.getElementById('match-hackathon-type').value;
  const availability = document.querySelector('input[name="match-availability"]:checked')?.value || 'weekends';

  const preferredRoles = [];
  document.querySelectorAll('#match-roles-container input[type="checkbox"]:checked').forEach(c => preferredRoles.push(c.value));

  if (!user_skills) {
    showToast('⚠️', 'Missing Info', 'Provide your skills to match.');
    return;
  }

  const resultsDiv = document.getElementById('match-results');
  resultsDiv.innerHTML = '<p style="color:var(--muted);font-family:var(--mono);font-size:12px;text-align:center;">Analyzing compatibility using AI...</p>';

  try {
    const res = await fetch('/api/teams/match', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ user_skills, experience_level, availability, preferred_role: preferredRoles.join(','), hackathon_type })
    });
    const data = await res.json();
    if (!res.ok) {
      resultsDiv.innerHTML = `<p style="color:#ef4444;font-size:13px;">${escapeHTML(data.error)}</p>`;
      return;
    }

    if (!data.matches || !data.matches.length) {
      resultsDiv.innerHTML = '<p style="color:var(--muted);font-size:13px;text-align:center;">No match found. Adjust filters or build your own team!</p>';
      return;
    }

    resultsDiv.innerHTML = safeHTML(data.matches.map(m => {
      const overlap = m.compatibility_details?.['skill_overlap'] || m.compatibility_details?.['skill_overlap%'] + '%' || '0%';
      const roleFit = m.compatibility_details?.role_fit || 'Medium';
      const availMatch = m.compatibility_details?.availability_match || 'Medium';

      return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:12px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <h4 style="color:#fff;margin:0;font-size:15px;">${escapeHTML(m.name)}</h4>
            <span style="font-family:var(--mono);font-size:14px;color:var(--accent);font-weight:700;">${m.match_score}% Match</span>
          </div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:6px;">🏆 ${escapeHTML(m.hackathon || 'Open')}</p>
          <p style="font-size:13px;color:var(--muted);margin-bottom:8px;">🛠 Looking for: ${escapeHTML(m.skills || 'Any')}</p>
          
          <div style="display:flex;gap:12px;background:rgba(0,240,255,0.02);border:1px solid rgba(0,240,255,0.1);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-family:var(--mono);font-size:11px;color:var(--muted);justify-content:space-between;flex-wrap:wrap;">
            <div>📚 Overlap: <strong style="color:var(--text);">${escapeHTML(overlap)}</strong></div>
            <div>👤 Role: <strong style="color:var(--accent2);">${escapeHTML(roleFit)}</strong></div>
            <div>⏱️ Time: <strong style="color:var(--accent);">${escapeHTML(availMatch)}</strong></div>
          </div>

          <p style="font-size:13px;color:var(--accent3);font-style:italic;margin-bottom:12px;">"${escapeHTML(m.reason)}"</p>
          <p style="font-size:12px;color:var(--muted);margin-bottom:12px;">👥 ${m.slots_left} slot${m.slots_left !== 1 ? 's' : ''} left</p>
          <button onclick="window.joinTeam(${m.id},'${safeJSString(m.name)}')"
            style="background:var(--accent);color:#050508;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">
            Join Team →
          </button>
        </div>
      `;
    }).join(''));
  } catch (err) {
    resultsDiv.innerHTML = '<p style="color:#ef4444;font-size:13px;">⚠️ Could not reach server.</p>';
  }
}
