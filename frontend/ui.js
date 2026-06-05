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

export function renderErrorRecovery(containerId, errorText, retryCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let isRetrying = false;

  container.innerHTML = `
    <div class="error-recovery-container" style="text-align: center; padding: 30px 20px; border: 1px dashed var(--border); border-radius: 12px; margin: 20px 0; background: rgba(255, 68, 68, 0.03);">
      <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
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

