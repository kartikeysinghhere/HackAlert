import { state } from './state.js';
import { escapeHTML, safeHTML, safeJSString, authHeaders } from './api.js';
import { showToast, openModal, closeModal, renderErrorRecovery } from './ui.js';
import { loadPersistedState, savePersistedState } from './state.js';

let calendarDate = new Date();

export function getCountdown(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (isNaN(diff)) return "TBA";
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${days}d ${hours}h left`;
}

function renderHackathonSkeletons() {
  const grid = document.getElementById("hackathon-grid");
  if (!grid) return;
  
  let html = '';
  for (let i = 0; i < 6; i++) {
    html += `
      <div class="skeleton-card" aria-busy="true" aria-live="polite" style="opacity: 0.85;">
        <div class="skeleton-bar title shimmer"></div>
        <div class="skeleton-bar shimmer" style="width: 85%;"></div>
        <div class="skeleton-bar shimmer" style="width: 60%;"></div>
        <div class="skeleton-bar shimmer" style="width: 75%;"></div>
        <div class="skeleton-bar shimmer" style="width: 50%;"></div>
        <div style="display: flex; gap: 8px; margin-top: auto;">
          <div class="skeleton-bar shimmer" style="width: 80px; height: 32px; border-radius: 8px;"></div>
          <div class="skeleton-bar shimmer" style="width: 80px; height: 32px; border-radius: 8px;"></div>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

export function restorePersistedFilters() {
  const persistedFilters = loadPersistedState('hackathon_filters');
  if (persistedFilters) {
    state.currentFilters = persistedFilters;
  }
  
  const savedSearch = loadPersistedState('search_query');
  const searchInput = document.getElementById('search-input');
  if (searchInput && savedSearch !== null) {
    searchInput.value = savedSearch;
  }

  // Update UI components
  const dateSelect = document.getElementById('filter-date');
  if (dateSelect) {
    dateSelect.value = state.currentFilters.date;
    if (state.currentFilters.date !== 'all') {
      dateSelect.classList.add('active');
      dateSelect.style.borderColor = 'var(--accent)';
      dateSelect.style.color = 'var(--accent)';
    }
  }

  const domainSelect = document.getElementById('filter-domain');
  if (domainSelect) {
    domainSelect.value = state.currentFilters.domain;
    if (state.currentFilters.domain !== 'all') {
      domainSelect.classList.add('active');
      domainSelect.style.borderColor = 'var(--accent)';
      domainSelect.style.color = 'var(--accent)';
    }
  }

  const begBtn = document.getElementById('filter-beginner');
  if (begBtn) {
    if (state.currentFilters.beginner) {
      begBtn.classList.add('active');
      begBtn.style.borderColor = 'var(--accent)';
      begBtn.style.color = 'var(--accent)';
      begBtn.style.background = 'rgba(0, 255, 136, 0.06)';
    } else {
      begBtn.classList.remove('active');
      begBtn.style.borderColor = 'var(--border)';
      begBtn.style.color = 'var(--muted)';
      begBtn.style.background = 'transparent';
    }
  }

  const prizeBtn = document.getElementById('filter-prize');
  if (prizeBtn) {
    if (state.currentFilters.hasPrize) {
      prizeBtn.classList.add('active');
      prizeBtn.style.borderColor = 'var(--accent)';
      prizeBtn.style.color = 'var(--accent)';
      prizeBtn.style.background = 'rgba(0, 255, 136, 0.06)';
    } else {
      prizeBtn.classList.remove('active');
      prizeBtn.style.borderColor = 'var(--border)';
      prizeBtn.style.color = 'var(--muted)';
      prizeBtn.style.background = 'transparent';
    }
  }

  const mode = state.currentFilters.mode;
  const modePills = document.querySelectorAll('.filter-bar:not(.secondary-filters) .filter-pill');
  modePills.forEach(btn => {
    const text = btn.textContent.toLowerCase();
    let matches = false;
    if (mode === 'all' && text.includes('all')) matches = true;
    else if (mode === 'online' && text.includes('online')) matches = true;
    else if (mode === 'offline' && text.includes('in-person')) matches = true;
    else if (mode === 'hybrid' && text.includes('hybrid')) matches = true;
    
    if (matches) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const clearBtn = document.getElementById('filter-clear');
  const hasActiveFilters = state.currentFilters.mode !== 'all' || state.currentFilters.date !== 'all' || state.currentFilters.beginner || state.currentFilters.domain !== 'all' || state.currentFilters.hasPrize;
  if (clearBtn) {
    clearBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
  }
}

export async function fetchHackathons() {
  const grid = document.getElementById("hackathon-grid");
  if (!grid) return;
  
  renderHackathonSkeletons();

  try {
    const response = await fetch("/api/hackathons");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    state.allHackathons = await response.json();
    if (!state.allHackathons || state.allHackathons.length === 0) {
      state.allHackathons = getFallbackHackathons();
    }
    state.allHackathons.sort((a, b) => new Date(a.start) - new Date(b.start));
    restorePersistedFilters();
    applyAdvancedFilters();
  } catch (error) {
    console.error("API Error:", error);
    renderErrorRecovery("hackathon-grid", "Failed to load hackathons. Please check your internet connection.", async () => {
      await fetchHackathons();
    });
  }
}

export function createHackathonCard(hack, isDimmed = false) {
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
    openHackModal(hack);
  };
  const daysLeft = Math.ceil((new Date(hack.start) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 5) card.classList.add('urgent');
  else if (daysLeft <= 20) card.classList.add('soon');
  if (isDimmed) card.style.opacity = "0.35";

  const isSaved = savedList.some(s => s.name === hack.name);
  card.innerHTML = safeHTML(`
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
    <button onclick="toggleSave(this)" data-name="${escapeHTML(hack.name)}" data-start="${hack.start}" data-website="${escapeHTML(hack.website)}" style="margin-left:8px;background:transparent;border:1px solid ${isSaved ? 'var(--accent)' : 'var(--border-light)'};color:${isSaved ? 'var(--accent)' : 'var(--muted)'};padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">${isSaved ? '✅ Saved' : '🔖 Save'}</button>
  `);
  return card;
}

export function renderHackathons(hackathons) {
  const grid = document.getElementById("hackathon-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (hackathons.length === 0) {
    const query = escapeHTML(document.getElementById('search-input')?.value || '');
    grid.innerHTML = safeHTML(`<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#aaa;font-size:16px;">🚫 No hackathons found${query ? ` for "<strong>${query}</strong>"` : ''}</div>`);
    return;
  }

  hackathons.forEach(hack => {
    grid.appendChild(createHackathonCard(hack));
  });
  updateStats();
  buildCountryList();
}

export function searchHackathons(query) {
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(() => {
    savePersistedState('search_query', query);
    const q = query.toLowerCase().trim();

    if (!q) {
      renderHackathons(state.allHackathons);
      return;
    }

    const matched = [];
    const rest = [];

    state.allHackathons.forEach(h => {
      const inName = h.name.toLowerCase().includes(q);
      const inCity = h.city && h.city.toLowerCase().includes(q);
      const inCountry = h.country && h.country.toLowerCase().includes(q);
      if (inName || inCity || inCountry) matched.push(h);
      else rest.push(h);
    });

    renderHackathonsSorted(matched, rest);
  }, 300);
}

export function renderHackathonsSorted(matched, rest) {
  const grid = document.getElementById("hackathon-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (matched.length === 0 && rest.length === 0) {
    const query = escapeHTML(document.getElementById('search-input')?.value || '');
    grid.innerHTML = safeHTML(`<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#aaa;font-size:16px;">🚫 No hackathons found for "<strong>${query}</strong>"</div>`);
    return;
  }

  matched.forEach(h => grid.appendChild(createHackathonCard(h, false)));
  rest.forEach(h => grid.appendChild(createHackathonCard(h, true)));
}

export function filterCards(btn, type) {
  const modeBar = btn.closest('.filter-bar');
  if (modeBar) {
    modeBar.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  }
  btn.classList.add('active');
  
  state.currentFilters.mode = type;
  applyAdvancedFilters();
}

export function toggleBeginnerFilter() {
  const btn = document.getElementById('filter-beginner');
  if (!btn) return;
  state.currentFilters.beginner = !state.currentFilters.beginner;
  if (state.currentFilters.beginner) {
    btn.classList.add('active');
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
    btn.style.background = 'rgba(0, 255, 136, 0.06)';
  } else {
    btn.classList.remove('active');
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--muted)';
    btn.style.background = 'transparent';
  }
  applyAdvancedFilters();
}

export function togglePrizeFilter() {
  const btn = document.getElementById('filter-prize');
  if (!btn) return;
  state.currentFilters.hasPrize = !state.currentFilters.hasPrize;
  if (state.currentFilters.hasPrize) {
    btn.classList.add('active');
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';
    btn.style.background = 'rgba(0, 255, 136, 0.06)';
  } else {
    btn.classList.remove('active');
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--muted)';
    btn.style.background = 'transparent';
  }
  applyAdvancedFilters();
}

export function clearAllFilters() {
  state.currentFilters = {
    mode: 'all',
    date: 'all',
    beginner: false,
    domain: 'all',
    hasPrize: false
  };

  const modePills = document.querySelectorAll('.filter-bar:not(.secondary-filters) .filter-pill');
  modePills.forEach(btn => {
    if (btn.textContent.toLowerCase().includes('all')) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const dateSelect = document.getElementById('filter-date');
  if (dateSelect) {
    dateSelect.value = 'all';
    dateSelect.classList.remove('active');
    dateSelect.style.borderColor = 'var(--border)';
    dateSelect.style.color = 'var(--muted)';
  }

  const domainSelect = document.getElementById('filter-domain');
  if (domainSelect) {
    domainSelect.value = 'all';
    domainSelect.classList.remove('active');
    domainSelect.style.borderColor = 'var(--border)';
    domainSelect.style.color = 'var(--muted)';
  }

  const begBtn = document.getElementById('filter-beginner');
  if (begBtn) {
    begBtn.classList.remove('active');
    begBtn.style.borderColor = 'var(--border)';
    begBtn.style.color = 'var(--muted)';
    begBtn.style.background = 'transparent';
  }

  const prizeBtn = document.getElementById('filter-prize');
  if (prizeBtn) {
    prizeBtn.classList.remove('active');
    prizeBtn.style.borderColor = 'var(--border)';
    prizeBtn.style.color = 'var(--muted)';
    prizeBtn.style.background = 'transparent';
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  savePersistedState('search_query', '');
  applyAdvancedFilters();
}

export function applyAdvancedFilters() {
  const dateSelect = document.getElementById('filter-date');
  if (dateSelect) {
    state.currentFilters.date = dateSelect.value;
    if (state.currentFilters.date !== 'all') {
      dateSelect.classList.add('active');
      dateSelect.style.borderColor = 'var(--accent)';
      dateSelect.style.color = 'var(--accent)';
    } else {
      dateSelect.classList.remove('active');
      dateSelect.style.borderColor = 'var(--border)';
      dateSelect.style.color = 'var(--muted)';
    }
  }

  const domainSelect = document.getElementById('filter-domain');
  if (domainSelect) {
    state.currentFilters.domain = domainSelect.value;
    if (state.currentFilters.domain !== 'all') {
      domainSelect.classList.add('active');
      domainSelect.style.borderColor = 'var(--accent)';
      domainSelect.style.color = 'var(--accent)';
    } else {
      domainSelect.classList.remove('active');
      domainSelect.style.borderColor = 'var(--border)';
      domainSelect.style.color = 'var(--muted)';
    }
  }

  const clearBtn = document.getElementById('filter-clear');
  const hasActiveFilters = state.currentFilters.mode !== 'all' || state.currentFilters.date !== 'all' || state.currentFilters.beginner || state.currentFilters.domain !== 'all' || state.currentFilters.hasPrize;
  if (clearBtn) {
    clearBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
  }

  savePersistedState('hackathon_filters', state.currentFilters);

  let filtered = state.allHackathons;

  if (state.currentFilters.mode === 'online') {
    filtered = filtered.filter(h => h.virtual);
  } else if (state.currentFilters.mode === 'hybrid') {
    filtered = filtered.filter(h => h.hybrid);
  } else if (state.currentFilters.mode === 'offline') {
    filtered = filtered.filter(h => !h.virtual && !h.hybrid);
  }

  if (state.currentFilters.date !== 'all') {
    const now = new Date();
    filtered = filtered.filter(h => {
      if (!h.start) return false;
      const startDate = new Date(h.start);
      const diffTime = startDate.getTime() - now.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (state.currentFilters.date === 'week') {
        return diffDays >= 0 && diffDays <= 7;
      } else if (state.currentFilters.date === 'month') {
        return diffDays >= 0 && diffDays <= 30;
      } else if (state.currentFilters.date === '3months') {
        return diffDays >= 0 && diffDays <= 90;
      }
      return true;
    });
  }

  if (state.currentFilters.beginner) {
    filtered = filtered.filter(h => {
      const text = `${h.name} ${h.tags || ''}`.toLowerCase();
      return text.includes('beginner') || text.includes('student') || text.includes('first-time');
    });
  }

  if (state.currentFilters.domain !== 'all') {
    filtered = filtered.filter(h => {
      const text = `${h.name} ${h.tags || ''}`.toLowerCase();
      const dom = state.currentFilters.domain;
      if (dom === 'AI/ML') {
        return text.includes('ai') || text.includes('ml') || text.includes('artificial intelligence') || text.includes('machine learning') || text.includes('deep learning');
      } else if (dom === 'Web3/Blockchain') {
        return text.includes('web3') || text.includes('blockchain') || text.includes('crypto') || text.includes('ethereum') || text.includes('solidity') || text.includes('smart contract');
      } else if (dom === 'Cybersecurity') {
        return text.includes('cybersecurity') || text.includes('security') || text.includes('cyber') || text.includes('infosec') || text.includes('fraud') || text.includes('ethical hacking');
      } else if (dom === 'Mobile') {
        return text.includes('mobile') || text.includes('android') || text.includes('ios') || text.includes('flutter') || text.includes('react native') || text.includes('swift');
      } else if (dom === 'Open Source') {
        return text.includes('open source') || text.includes('foss') || text.includes('git') || text.includes('github');
      } else if (dom === 'HealthTech') {
        return text.includes('health') || text.includes('medical') || text.includes('healthtech') || text.includes('bio') || text.includes('clinical');
      } else if (dom === 'FinTech') {
        return text.includes('fintech') || text.includes('finance') || text.includes('banking') || text.includes('payment') || text.includes('defi') || text.includes('wealth');
      }
      return true;
    });
  }

  if (state.currentFilters.hasPrize) {
    filtered = filtered.filter(h => {
      return !!(h.prize || h.prizes || h.prize_pool || h.name.toLowerCase().includes('prize') || h.name.toLowerCase().includes('$') || h.name.toLowerCase().includes('pool') || h.name.toLowerCase().includes('inr') || h.name.toLowerCase().includes('reward'));
    });
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput && searchInput.value.trim()) {
    const q = searchInput.value.toLowerCase().trim();
    const matched = [];
    const rest = [];
    filtered.forEach(h => {
      const inName = h.name.toLowerCase().includes(q);
      const inCity = h.city && h.city.toLowerCase().includes(q);
      const inCountry = h.country && h.country.toLowerCase().includes(q);
      if (inName || inCity || inCountry) matched.push(h);
      else rest.push(h);
    });
    renderHackathonsSorted(matched, rest);
  } else {
    renderHackathons(filtered);
  }
}

export function toggleSave(btn) {
  const name = btn.dataset.name;
  const start = btn.dataset.start;
  const website = btn.dataset.website || '';
  let saved = JSON.parse(localStorage.getItem('saved') || '[]');
  const existingIndex = saved.findIndex(s => s.name === name);

  showToast('🔖', existingIndex > -1 ? 'Removed' : 'Saved!', name);

  if (existingIndex > -1) {
    saved.splice(existingIndex, 1);
    btn.textContent = '🔖 Save';
    btn.style.borderColor = 'var(--border-light)';
    btn.style.color = 'var(--muted)';

    fetch(`/api/saved/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include'
    }).catch(err => console.error('Error deleting saved hackathon:', err));
  } else {
    saved.push({ name, start, website });
    btn.textContent = '✅ Saved';
    btn.style.borderColor = 'var(--accent)';
    btn.style.color = 'var(--accent)';

    fetch('/api/saved', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ hackathon_name: name, hackathon_start: start, hackathon_website: website })
    }).catch(err => console.error('Error saving hackathon:', err));

    requestNotificationPermission().then(permission => {
      if (permission === 'granted') {
        new Notification("🔖 Hackathon Saved", {
          body: `"${name}" has been saved to your reminders.`
        });
        scheduleNotificationCheck();
      }
    });
  }
  localStorage.setItem('saved', JSON.stringify(saved));
  updateStats();
  if (window.loadProfile) window.loadProfile();
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return Promise.resolve('denied');
  }
  return Notification.requestPermission();
}

export function scheduleNotificationCheck() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const saved = JSON.parse(localStorage.getItem('saved') || '[]');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  saved.forEach(hack => {
    if (!hack.start) return;
    const hackDate = new Date(hack.start);
    hackDate.setHours(0, 0, 0, 0);
    const diffTime = hackDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 2) {
      new Notification("⏰ Hackathon Reminder", {
        body: `"${hack.name}" is starting in 2 days!`,
        tag: `reminder-${hack.name}`
      });
    }
  });
}

export function copyLink(btn, url) {
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

export function fallbackCopy(text, btn) {
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

export function unsaveHackathon(name) {
  let saved = JSON.parse(localStorage.getItem('saved') || '[]');
  saved = saved.filter(s => s.name !== name);
  localStorage.setItem('saved', JSON.stringify(saved));
  if (window.loadProfile) window.loadProfile();
}

export function updateStats() {
  const now = new Date();
  const t = document.getElementById('stat-total');
  const u = document.getElementById('stat-upcoming');
  const e = document.getElementById('stat-ended');
  const s = document.getElementById('stat-saved');
  if (t) t.textContent = state.allHackathons.length;
  if (u) u.textContent = state.allHackathons.filter(h => new Date(h.start) > now).length;
  if (e) e.textContent = state.allHackathons.filter(h => new Date(h.start) <= now).length;
  if (s) s.textContent = JSON.parse(localStorage.getItem('saved') || '[]').length;
}

export function filterByCountry(country) {
  document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  if (country === 'all') {
    renderHackathons(state.allHackathons);
  } else {
    renderHackathons(state.allHackathons.filter(h => h.country === country));
  }
}

export function buildCountryList() {
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
  list.innerHTML = safeHTML(countries.map(c => `
    <div onmousedown="window.selectCountry('${c}')"
      style="padding:8px 12px;cursor:pointer;font-family:var(--mono);font-size:12px;color:var(--muted);"
      onmouseover="this.style.color='var(--accent)'"
      onmouseout="this.style.color='var(--muted)'">${c}</div>
  `).join(''));
}

export function filterCountryList(q) {
  const list = document.getElementById('country-list');
  if (!list) return;
  list.style.display = 'block';
  list.querySelectorAll('div').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q.toLowerCase()) ? 'block' : 'none';
  });
}

export function selectCountry(country) {
  const input = document.getElementById('country-search');
  if (input) input.value = country === 'All Countries' ? '' : country;
  const list = document.getElementById('country-list');
  if (list) list.style.display = 'none';
  if (country === 'All Countries') renderHackathons(state.allHackathons);
  else renderHackathons(state.allHackathons.filter(h => h.country === country));
}

export function openHackModal(hack) {
  const startDate = new Date(hack.start).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  let mode = "📍 In-Person";
  if (hack.virtual) mode = "🌐 Online";
  if (hack.hybrid) mode = "🔀 Hybrid";

  const modalContent = document.getElementById('modal-content');
  if (modalContent) {
    modalContent.innerHTML = safeHTML(`
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
    `);
  }
  openModal('hack-modal');
  const reviewForm = document.getElementById('review-form');
  const writeReviewBtn = document.getElementById('write-review-btn');
  if (reviewForm) reviewForm.style.display = 'none';
  if (writeReviewBtn) writeReviewBtn.style.display = 'block';
  state.selectedStarRating = 0;
  loadReviews(hack.name);
}

export function hideHackModal() {
  closeModal('hack-modal');
}

export function startCountdowns() {
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

      if (days <= 1) el.style.color = '#ef4444';
      else if (days <= 5) el.style.color = '#f59e0b';
      else el.style.color = 'var(--accent)';
    });
  }, 1000);
}

export function prevMonth() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
}

export function nextMonth() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
}

export function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const saved = JSON.parse(localStorage.getItem('saved') || '[]');
  const savedNames = saved.map(s => s.name);
  const now = new Date();

  const calMonth = document.getElementById('calendar-month-label');
  if (calMonth) {
    calMonth.textContent = calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = {};
  state.allHackathons.forEach(h => {
    const d = new Date(h.start);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(h);
    }
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let html = `<div class="cal-grid">`;

  days.forEach(d => {
    html += `<div class="cal-day-header">${d}</div>`;
  });

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

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

      html += `<div class="cal-event ${cls}" onclick="window.openModal(window.state.allHackathons.find(x=>x.name==='${safeJSString(h.name)}'))" title="${escapeHTML(h.name)}">
        ${escapeHTML(h.name)}
      </div>`;
    });

    if (hacks.length > 3) {
      html += `<div style="font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:2px;">+${hacks.length - 3} more</div>`;
    }

    html += `</div>`;
  }

  html += `</div>`;
  const calGrid = document.getElementById('calendar-grid');
  if (calGrid) calGrid.innerHTML = safeHTML(html);
}

export function showReviewForm() {
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
  if (!isLoggedIn) { showToast('⚠️', 'Login Required', 'Please login to write a review.'); return; }
  const reviewForm = document.getElementById('review-form');
  const writeReviewBtn = document.getElementById('write-review-btn');
  if (reviewForm) reviewForm.style.display = 'block';
  if (writeReviewBtn) writeReviewBtn.style.display = 'none';
}

export function setRating(n) {
  state.selectedStarRating = n;
  document.querySelectorAll('#star-input .star').forEach((s, i) => {
    s.style.opacity = i < n ? '1' : '0.3';
  });
}

export async function loadReviews(hackathonName) {
  state.currentReviewHackathon = hackathonName;
  const list = document.getElementById('reviews-list');
  if (!list) return;
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

    list.innerHTML = safeHTML(`
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
              ${r.user_email === userEmail ? `<button onclick="window.deleteReview('${safeJSString(hackathonName)}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:11px;">✕</button>` : ''}
            </div>
          </div>
          ${r.review ? `<p style="font-size:13px;color:var(--muted);margin:0;">${escapeHTML(r.review)}</p>` : ''}
        </div>
      `).join('')}
    `);
  } catch (e) {
    list.innerHTML = '<p style="color:#ef4444;font-size:13px;">Failed to load reviews.</p>';
  }
}

export async function submitReview() {
  if (!state.selectedStarRating) { showToast('⚠️', 'Select Rating', 'Please select a star rating.'); return; }
  const review = document.getElementById('review-text').value.trim();

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ hackathon_name: state.currentReviewHackathon, rating: state.selectedStarRating, review })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('⭐', 'Review Submitted!', 'Thanks for your feedback.');
      document.getElementById('review-form').style.display = 'none';
      document.getElementById('write-review-btn').style.display = 'block';
      document.getElementById('review-text').value = '';
      state.selectedStarRating = 0;
      loadReviews(state.currentReviewHackathon);
    } else {
      showToast('❌', 'Error', data.error);
    }
  } catch (e) {
    showToast('❌', 'Error', 'Could not submit review.');
  }
}

export async function deleteReview(hackathonName) {
  if (!confirm('Delete your review?')) return;
  const res = await fetch(`/api/reviews/${encodeURIComponent(hackathonName)}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (res.ok) {
    showToast('✅', 'Deleted', 'Review removed.');
    loadReviews(hackathonName);
  }
}

export function getFallbackHackathons() {
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
