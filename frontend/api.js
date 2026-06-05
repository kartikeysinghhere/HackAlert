import { state } from './state.js';

export function censorMessage(text) {
  let censoredText = text;
  state.bannedWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censoredText = censoredText.replace(regex, '*'.repeat(word.length));
  });
  return censoredText;
}

export function escapeHTML(str) {
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

export function safeJSString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

export function safeHTML(html) {
  if (!html) return '';
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html);
  }
  return escapeHTML(html);
}

export function authHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  const oldToken = localStorage.getItem('authToken');
  if (oldToken) {
    headers['Authorization'] = `Bearer ${oldToken}`;
  }
  return headers;
}
