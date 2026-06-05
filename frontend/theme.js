export function toggleTheme() {
  document.body.classList.toggle('light');
  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.textContent = document.body.classList.contains('light') ? '🌕' : '🌙';
  }
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
}

export function initTheme() {
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = '🌕';
  }
}
