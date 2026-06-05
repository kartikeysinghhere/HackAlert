import { state } from './state.js';
import { fetchHackathons, renderCalendar } from './hackathons.js';
import { loadProfile, loadFindFriends, loadConversations } from './profile.js';
import { loadTeams, fetchTeammates, loadShowcase } from './teams.js';

export function handleRoute(pageId) {
  const protectedPages = ['dashboard', 'bot', 'profile', 'teams', 'calendar', 'showcase', 'messages', 'ai-tools', 'public-profile', 'find-teammates', 'find-friends'];
  const authPages = ['login', 'signup', 'forgot-password', 'reset-password'];
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';

  if (protectedPages.includes(pageId) && !isLoggedIn) {
    goTo('login');
    return;
  }

  if (authPages.includes(pageId) && isLoggedIn) {
    goTo('dashboard');
    return;
  }

  // Hide dropdown menu when navigating
  const dropdown = document.getElementById('nav-dropdown');
  if (dropdown) dropdown.style.display = 'none';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  } else {
    goTo('landing');
    return;
  }

  if (pageId === 'dashboard' && state.allHackathons.length === 0) fetchHackathons();
  if (pageId === 'profile') loadProfile();
  if (pageId === 'teams') loadTeams();
  if (pageId === 'find-teammates') fetchTeammates();
  if (pageId === 'find-friends') loadFindFriends();
  if (pageId === 'calendar') renderCalendar();
  if (pageId === 'showcase') loadShowcase();
  if (pageId === 'messages') loadConversations();
}

export function goTo(pageId) {
  const targetHash = '#/' + pageId;
  if (window.location.hash !== targetHash) {
    window.location.hash = '/' + pageId;
  } else {
    handleRoute(pageId);
  }
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.startsWith('#/') ? window.location.hash.slice(2) : 'landing';
  handleRoute(hash);
});
