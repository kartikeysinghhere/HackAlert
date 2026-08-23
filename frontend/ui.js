import { authHeaders } from './api.js';
import { goTo } from './router.js';

const TOAST_ICONS = {
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  bookmark: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>`,
  star: `<svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  submit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path></svg>`
};

export function showToast(icon, title, msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  const iconEl = document.getElementById('toast-icon');
  
  if (typeof icon === 'string') {
    if (icon.startsWith('<svg')) {
      iconEl.innerHTML = icon;
    } else if (icon === 'success' || icon.includes('success') || icon.includes('check')) {
      iconEl.innerHTML = TOAST_ICONS.success;
    } else if (icon === 'error' || icon.includes('error') || icon.includes('fail')) {
      iconEl.innerHTML = TOAST_ICONS.error;
    } else if (icon === 'warning' || icon.includes('warn') || icon.includes('alert')) {
      iconEl.innerHTML = TOAST_ICONS.warning;
    } else if (icon === 'bookmark' || icon.includes('save')) {
      iconEl.innerHTML = TOAST_ICONS.bookmark;
    } else if (icon === 'star' || icon.includes('rate')) {
      iconEl.innerHTML = TOAST_ICONS.star;
    } else if (icon === 'submit' || icon.includes('send')) {
      iconEl.innerHTML = TOAST_ICONS.submit;
    } else {
      iconEl.innerHTML = TOAST_ICONS.info;
    }
  } else {
    iconEl.innerHTML = TOAST_ICONS.info;
  }

  document.getElementById('toast-title').textContent = title || '';
  document.getElementById('toast-msg').textContent = msg || '';
  t.classList.add('active');
  setTimeout(() => { t.classList.remove('active'); }, 4000);
}

function trapFocus(modal) {
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex="0"]';
  
  const handleKeydown = (e) => {
    if (e.key !== 'Tab') return;

    const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors))
      .filter(el => !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null);
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };

  setTimeout(() => {
    const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors))
      .filter(el => !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, 50);

  modal._focusTrapListener = handleKeydown;
  modal.addEventListener('keydown', handleKeydown);
}

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal._previouslyFocusedElement = document.activeElement;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    trapFocus(modal);
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    if (modal._focusTrapListener) {
      modal.removeEventListener('keydown', modal._focusTrapListener);
      delete modal._focusTrapListener;
    }
    if (modal._previouslyFocusedElement && typeof modal._previouslyFocusedElement.focus === 'function') {
      modal._previouslyFocusedElement.focus();
      delete modal._previouslyFocusedElement;
    }
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
    showToast('warning', 'Missing Info', 'Please provide a title and description.');
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
      showToast('success', 'Submitted!', data.message);
      hideBugReport();
    } else {
      showToast('error', 'Error', data.error || 'Failed to submit report.');
    }
  } catch (err) {
    showToast('error', 'Error', 'Failed to connect to server.');
  }
}

export function showFeedback() {
  openModal('feedback-modal');
  const title = document.getElementById('feedback-title');
  if (title) title.focus();
}

export function hideFeedback() {
  closeModal('feedback-modal');
  const title = document.getElementById('feedback-title');
  const desc = document.getElementById('feedback-desc');
  const rating = document.getElementById('feedback-rating');
  if (title) title.value = '';
  if (desc) desc.value = '';
  if (rating) rating.value = '3';
}

export async function submitFeedback() {
  const title = document.getElementById('feedback-title').value.trim();
  const description = document.getElementById('feedback-desc').value.trim();
  const rating = parseInt(document.getElementById('feedback-rating').value, 10);

  if (!title || !description) {
    showToast('warning', 'Missing Info', 'Please provide a subject and description.');
    return;
  }

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ title, description, rating })
    });
    const data = await res.json();

    if (res.ok) {
      showToast('success', 'Submitted!', data.message);
      hideFeedback();
    } else {
      showToast('error', 'Error', data.error || 'Failed to submit feedback.');
    }
  } catch (err) {
    showToast('error', 'Error', 'Failed to connect to server.');
  }
}

export function toggleNavMenu() {
  const dropdown = document.getElementById('nav-dropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

export function openLanguageModal() {
  openModal('language-modal');
}

export function closeLanguageModal() {
  closeModal('language-modal');
}

export function changeLanguage(langCode, langName) {
  try {
    if (langCode === 'en') {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = 'en';
        select.dispatchEvent(new Event('change'));
      }
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/;`;
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname};`;
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
      }
    }
  } catch (e) {
    console.warn('Translation cookie exception:', e);
  }

  // Update active state in modal buttons
  const cards = document.querySelectorAll('.lang-card');
  cards.forEach(c => {
    if (c.getAttribute('data-lang') === langCode) {
      c.classList.add('active');
      c.style.borderColor = 'var(--accent)';
      c.style.background = 'rgba(0, 240, 255, 0.1)';
    } else {
      c.classList.remove('active');
      c.style.borderColor = 'var(--border-light)';
      c.style.background = 'rgba(255, 255, 255, 0.05)';
    }
  });

  closeModal('language-modal');
  showToast('success', 'Language', `Language selected: ${langName}`);
}

export function suggestTranslation() {
  openLanguageModal();
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

export function renderErrorRecovery(containerId, errorText, retryCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let isRetrying = false;

  container.innerHTML = `
    <div class="error-recovery-container" style="text-align: center; padding: 30px 20px; border: 1px dashed var(--border); border-radius: 12px; margin: 20px 0; background: rgba(255, 68, 68, 0.03);">
      <div style="margin-bottom: 12px; display: flex; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      </div>
      <p style="color: var(--text); font-size: 15px; margin-bottom: 16px; font-weight: 500;">${errorText || 'Something went wrong.'}</p>
      <button class="btn-primary retry-btn" style="min-height: 40px; padding: 10px 20px; font-family: var(--mono); font-size: 13px; font-weight: 600; text-transform: uppercase; cursor: pointer; transition: all 0.3s;">
        Try Again
      </button>
    </div>
  `;

  const btn = container.querySelector('.retry-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      if (isRetrying) return;
      isRetrying = true;
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Retrying...';
      try {
        await retryCallback();
      } catch (err) {
        console.error('Retry failed:', err);
        btn.textContent = originalText;
        btn.disabled = false;
        isRetrying = false;
      }
    });
  }
}


