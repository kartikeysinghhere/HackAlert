import { authHeaders } from './api.js';
import { goTo } from './router.js';

export function showToast(icon, title, msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent = msg || '';
  t.classList.add('active');
  setTimeout(() => { t.classList.remove('active'); }, 4000);
}

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    const openModals = Array.from(document.querySelectorAll('.modal')).filter(m => m.style.display === 'flex');
    if (openModals.length === 0) {
      document.body.classList.remove('modal-open');
    }
  }
}

export function showBugReport() {
  openModal('bug-report-modal');
}

export function hideBugReport() {
  closeModal('bug-report-modal');
  document.getElementById('bug-title').value = '';
  document.getElementById('bug-desc').value = '';
  document.getElementById('bug-severity').value = 'medium';
  document.getElementById('bug-screenshot').value = '';
}

export async function submitBugReport() {
  const title = document.getElementById('bug-title').value.trim();
  const description = document.getElementById('bug-desc').value.trim();
  const severity = document.getElementById('bug-severity').value;
  const screenshot_url = document.getElementById('bug-screenshot').value.trim();

  if (!title || !description) {
    showToast('⚠️', 'Missing Info', 'Please provide a title and description.');
    return;
  }

  try {
    const res = await fetch('/api/bug-reports', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ title, description, severity, screenshot_url })
    });
    const data = await res.json();

    if (res.ok) {
      showToast('✅', 'Submitted!', data.message);
      hideBugReport();
    } else {
      showToast('❌', 'Error', data.error || 'Failed to submit report.');
    }
  } catch (err) {
    showToast('❌', 'Error', 'Failed to connect to server.');
  }
}

export function toggleNavMenu() {
  const dropdown = document.getElementById('nav-dropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

export function suggestTranslation() {
  showToast('🌐', 'Translation', 'Right-click → Translate to your language, or use browser translation.');
}

// Global modal escape key listeners
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = Array.from(document.querySelectorAll('.modal')).filter(m => m.style.display === 'flex');
    openModals.forEach(m => {
      if (m.id === 'bug-report-modal') hideBugReport();
      else if (m.id === 'logout-modal') closeModal('logout-modal');
      else closeModal(m.id);
    });
  }
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    const m = e.target;
    if (m.id === 'bug-report-modal') hideBugReport();
    else if (m.id === 'logout-modal') closeModal('logout-modal');
    else closeModal(m.id);
  }
});

document.addEventListener('click', (e) => {
  const btn = document.getElementById('nav-menu-btn');
  const dropdown = document.getElementById('nav-dropdown');
  if (dropdown && btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});
