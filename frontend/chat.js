import { state } from './state.js';
import { showToast } from './ui.js';
import { censorMessage, escapeHTML, safeHTML } from './api.js';

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
    <div class="msg-avatar">${role === 'bot' ? '🤖' : '👤'}</div>
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
    <div class="msg-avatar">🤖</div>
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
      const welcomeMsg = "Hey! 👋 I'm <strong>HackBot</strong>. Ask me anything about hackathons — upcoming events, online ones, prizes, or anything else!";
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
      appendMessage('bot', `🏆 Nearest hackathon is <strong>${escapeHTML(next.name)}</strong> on 📅 ${new Date(next.start).toLocaleDateString()} — ${next.virtual ? '🌐 Online' : `📍 ${escapeHTML(next.city)}, ${escapeHTML(next.country)}`}. <a href="${escapeHTML(next.website)}" target="_blank">Visit →</a>`, true);
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
      // Access filterCards globally or import it. We'll expose filterCards on window
      const pill = document.querySelector(`.filter-pill[onclick*="${data.payload}"]`);
      if (pill && window.filterCards) window.filterCards(pill, data.payload);
    } else if (data.action === 'navigate' && data.payload) {
      if (window.goTo) window.goTo(data.payload);
    }
  } catch (err) {
    removeTyping();
    appendMessage('bot', "😅 Oops! I took a quick nap — please try again in a moment!");
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
    showToast('⚠️', 'Not Supported', 'Voice input not supported in this browser.');
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
    btn.textContent = '🔴';
    btn.style.borderColor = '#ef4444';
    btn.style.color = '#ef4444';
  }
  showToast('🎤', 'Listening...', 'Speak freely — auto-sends after 5s pause');
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
    btn.textContent = '🎤';
    btn.style.borderColor = 'var(--border-light)';
    btn.style.color = 'var(--muted)';
  }

  if (autoSend) {
    const input = document.getElementById('chat-input');
    if (input && input.value.trim()) {
      setTimeout(() => sendChat(), 150);
      showToast('✅', 'Got it!', 'Sending your message...');
    }
  }
}
