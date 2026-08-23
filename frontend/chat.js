import { state } from './state.js';
import { showToast } from './ui.js';
import { censorMessage, escapeHTML, safeHTML } from './api.js';

const BOT_AVATAR_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>`;
const USER_AVATAR_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
const MIC_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
const RECORDING_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="7"></circle></svg>`;

export function appendMessage(role, text, isHTML = false, saveHistory = true) {
  const area = document.getElementById('chat-area');
  if (!area) return;
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
  msg.innerHTML = safeHTML(`
    <div class="msg-avatar">${role === 'bot' ? BOT_AVATAR_SVG : USER_AVATAR_SVG}</div>
    <div class="msg-bubble">${displayText}</div>
  `);
  area.appendChild(msg);
  area.scrollTop = area.scrollHeight;

  if (saveHistory) {
    if (role === 'bot' && state.chatHistory.some(m => m.content === text)) return;
    state.chatHistory.push({ role: role === 'user' ? 'user' : 'assistant', content: censorMessage(text), isHTML });
    if (state.chatHistory.length > 30) state.chatHistory = state.chatHistory.slice(-30);
    localStorage.setItem('hackBotHistory', JSON.stringify(state.chatHistory));
  }
}

export function showTyping() {
  const area = document.getElementById('chat-area');
  if (!area) return;
  const typing = document.createElement('div');
  typing.className = 'msg bot';
  typing.id = 'typing-indicator';
  typing.innerHTML = safeHTML(`
    <div class="msg-avatar">${BOT_AVATAR_SVG}</div>
    <div class="msg-bubble">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `);
  area.appendChild(typing);
  area.scrollTop = area.scrollHeight;
}

export function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

export function showWelcomeMessage() {
  setTimeout(() => {
    if (state.chatHistory.length > 0) {
      state.chatHistory.forEach(msg => {
        appendMessage(msg.role === 'user' ? 'user' : 'bot', msg.content, msg.isHTML || false, false);
      });
    } else {
      const welcomeMsg = "Hello! I'm <strong>HackBot</strong>. Ask me anything about hackathons — upcoming events, online ones, prizes, or team building!";
      appendMessage('bot', welcomeMsg, true);
    }
  }, 600);
}

export async function sendChat() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendMessage('user', message);
  showTyping();

  const censoredLocal = censorMessage(message).toLowerCase();
  if (censoredLocal.includes('nearest') || censoredLocal.includes('closest')) {
    const next = state.allHackathons[0];
    if (next) {
      removeTyping();
      appendMessage('bot', `Nearest hackathon is <strong>${escapeHTML(next.name)}</strong> on ${new Date(next.start).toLocaleDateString()} — ${next.virtual ? 'Online' : `${escapeHTML(next.city)}, ${escapeHTML(next.country)}`}. <a href="${escapeHTML(next.website)}" target="_blank">Visit →</a>`, true);
      return;
    }
  }

  try {
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: state.chatHistory,
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
    
    if (data.action === 'filter' && data.payload) {
      const pill = document.querySelector(`.filter-pill[onclick*="${data.payload}"]`);
      if (pill && window.filterCards) window.filterCards(pill, data.payload);
    } else if (data.action === 'navigate' && data.payload) {
      if (window.goTo) window.goTo(data.payload);
    }
  } catch (err) {
    removeTyping();
    appendMessage('bot', "Unable to process request right now. Please try again in a moment.");
  }
}

export async function speakText(text) {
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
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);
    audio.play();
  } catch (err) {
    console.error('Voice error:', err);
  }
}

export function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function quickSend(btn) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = btn.textContent;
    sendChat();
  }
}

export function initSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast('warning', 'Not Supported', 'Voice input not supported in this browser.');
    return null;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = 'en-US';

  let accumulated = '';
  let silenceTimer = null;

  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        accumulated += e.results[i][0].transcript + ' ';
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    const input = document.getElementById('chat-input');
    if (input) input.value = (accumulated + interim).trim();

    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      const finalText = accumulated.trim();
      if (state.recognitionActive) {
        stopListening(true);
        if (finalText) {
          const inp = document.getElementById('chat-input');
          if (inp) inp.value = finalText;
          setTimeout(() => sendChat(), 150);
          showToast('success', 'Got it!', 'Sending your message...');
        } else {
          showToast('info', 'Nothing heard', 'Try speaking again.');
        }
      }
    }, 5000);
  };

  r.onerror = (ev) => {
    if (ev.error === 'no-speech') return;
    stopListening();
    showToast('error', 'Voice Error', 'Could not hear you. Try again.');
  };

  r.onend = () => {
    if (state.recognitionActive) stopListening();
  };

  return r;
}

export function toggleVoiceInput() {
  if (state.recognitionActive) {
    stopListening(true);
    return;
  }
  const input = document.getElementById('chat-input');
  if (input) input.value = '';
  state.recognition = initSpeechRecognition();
  if (!state.recognition) return;
  state.recognitionActive = true;
  try {
    state.recognition.start();
  } catch (e) {
    state.recognitionActive = false;
    return;
  }
  const btn = document.getElementById('mic-btn');
  if (btn) {
    btn.innerHTML = RECORDING_SVG;
    btn.style.borderColor = '#ef4444';
    btn.style.color = '#ef4444';
  }
  showToast('info', 'Listening...', 'Speak freely — auto-sends after 5s pause');
}

export function stopListening(autoSend = false) {
  state.recognitionActive = false;
  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (e) { }
    state.recognition = null;
  }
  const btn = document.getElementById('mic-btn');
  if (btn) {
    btn.innerHTML = MIC_SVG;
    btn.style.borderColor = 'var(--border-light)';
    btn.style.color = 'var(--muted)';
  }

  if (autoSend) {
    const input = document.getElementById('chat-input');
    if (input && input.value.trim()) {
      setTimeout(() => sendChat(), 150);
      showToast('success', 'Got it!', 'Sending your message...');
    }
  }
}

