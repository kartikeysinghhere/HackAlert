import { state, loadPersistedState } from './state.js';
import { initTheme, toggleTheme } from './theme.js';
import { goTo, handleRoute } from './router.js';
import { censorMessage, escapeHTML, safeJSString, safeHTML, authHeaders } from './api.js';
import {
  loginUser, signupUser, verifyOTP, resendOTP, toggleChip,
  logout, hideLogoutModal, confirmLogout, selectGender,
  requestPasswordReset, handlePasswordReset
} from './auth.js';
import {
  appendMessage, showWelcomeMessage, sendChat, quickSend,
  toggleVoiceInput, stopSpeech
} from './chat.js';
import {
  fetchHackathons, searchHackathons, filterCards, toggleBeginnerFilter,
  togglePrizeFilter, clearAllFilters, toggleSave, unsaveHackathon,
  filterByCountry, filterCountryList, selectCountry, openHackModal,
  hideHackModal, prevMonth, nextMonth, renderCalendar, setRating,
  showReviewForm, loadReviews, submitReview, deleteReview, startCountdowns
} from './hackathons.js';
import {
  loadTeams, showCreateTeam, hideCreateTeam, createTeam, joinTeam,
  openTeamChat, copyInviteLink, closeTeamChat, sendTeamMessage,
  leaveTeam, deleteTeam, loadShowcase, showSubmitProject, hideSubmitProject,
  submitProject, deleteProject, showCreateTeammateModal, hideCreateTeammateModal,
  fetchTeammates, submitTeammateListing, deleteTeammateListing, markTeammateFilled,
  showMatchmaker, hideMatchmaker, runMatchmaker
} from './teams.js';
import {
  loadProfile, loadFindFriends, showUserSearch, hideUserSearch,
  searchUsers, showUserResults, sendFriendRequest, loadFriends,
  respondRequest, removeFriend, openPublicProfile, loadConversations,
  openDMChat, sendDM, startHeartbeat, fetchOnlineUsers
} from './profile.js';
import {
  showToast, openModal, closeModal, showBugReport, hideBugReport,
  submitBugReport, toggleNavMenu, suggestTranslation
} from './ui.js';

// Expose state and functions globally on window for full backward compatibility
window.state = state;
window.goTo = goTo;
window.handleRoute = handleRoute;
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
window.censorMessage = censorMessage;
window.escapeHTML = escapeHTML;
window.safeJSString = safeJSString;
window.safeHTML = safeHTML;
window.authHeaders = authHeaders;
window.loginUser = loginUser;
window.signupUser = signupUser;
window.verifyOTP = verifyOTP;
window.resendOTP = resendOTP;
window.toggleChip = toggleChip;
window.logout = logout;
window.hideLogoutModal = hideLogoutModal;
window.confirmLogout = confirmLogout;
window.selectGender = selectGender;
window.requestPasswordReset = requestPasswordReset;
window.handlePasswordReset = handlePasswordReset;
window.appendMessage = appendMessage;
window.showWelcomeMessage = showWelcomeMessage;
window.sendChat = sendChat;
window.quickSend = quickSend;
window.toggleVoiceInput = toggleVoiceInput;
window.stopSpeech = stopSpeech;
window.fetchHackathons = fetchHackathons;
window.searchHackathons = searchHackathons;
window.filterCards = filterCards;
window.toggleBeginnerFilter = toggleBeginnerFilter;
window.togglePrizeFilter = togglePrizeFilter;
window.clearAllFilters = clearAllFilters;
window.toggleSave = toggleSave;
window.unsaveHackathon = unsaveHackathon;
window.filterByCountry = filterByCountry;
window.filterCountryList = filterCountryList;
window.selectCountry = selectCountry;
window.openHackModal = openHackModal;
window.hideHackModal = hideHackModal;
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.renderCalendar = renderCalendar;
window.setRating = setRating;
window.showReviewForm = showReviewForm;
window.loadReviews = loadReviews;
window.submitReview = submitReview;
window.deleteReview = deleteReview;
window.startCountdowns = startCountdowns;
window.loadTeams = loadTeams;
window.showCreateTeam = showCreateTeam;
window.hideCreateTeam = hideCreateTeam;
window.createTeam = createTeam;
window.joinTeam = joinTeam;
window.openTeamChat = openTeamChat;
window.copyInviteLink = copyInviteLink;
window.closeTeamChat = closeTeamChat;
window.sendTeamMessage = sendTeamMessage;
window.leaveTeam = leaveTeam;
window.deleteTeam = deleteTeam;
window.loadShowcase = loadShowcase;
window.showSubmitProject = showSubmitProject;
window.hideSubmitProject = hideSubmitProject;
window.submitProject = submitProject;
window.deleteProject = deleteProject;
window.showCreateTeammateModal = showCreateTeammateModal;
window.hideCreateTeammateModal = hideCreateTeammateModal;
window.fetchTeammates = fetchTeammates;
window.submitTeammateListing = submitTeammateListing;
window.deleteTeammateListing = deleteTeammateListing;
window.markTeammateFilled = markTeammateFilled;
window.showMatchmaker = showMatchmaker;
window.hideMatchmaker = hideMatchmaker;
window.runMatchmaker = runMatchmaker;
window.loadProfile = loadProfile;
window.loadFindFriends = loadFindFriends;
window.showUserSearch = showUserSearch;
window.hideUserSearch = hideUserSearch;
window.searchUsers = searchUsers;
window.showUserResults = showUserResults;
window.sendFriendRequest = sendFriendRequest;
window.loadFriends = loadFriends;
window.respondRequest = respondRequest;
window.removeFriend = removeFriend;
window.openPublicProfile = openPublicProfile;
window.loadConversations = loadConversations;
window.openDMChat = openDMChat;
window.sendDM = sendDM;
window.startHeartbeat = startHeartbeat;
window.fetchOnlineUsers = fetchOnlineUsers;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.showBugReport = showBugReport;
window.hideBugReport = hideBugReport;
window.submitBugReport = submitBugReport;
window.toggleNavMenu = toggleNavMenu;
window.suggestTranslation = suggestTranslation;

// Initialization
initTheme();

window.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
  if (isLoggedIn) {
    fetchHackathons();
    document.getElementById('nav-auth').style.display = 'none';
    document.getElementById('nav-app').style.display = 'flex';
    
    const btn1 = document.getElementById('get-started-btn');
    if (btn1) {
      btn1.textContent = 'Explore Hackathons →';
      btn1.setAttribute('onclick', "goTo('dashboard')");
    }
    const btn2 = document.getElementById('get-started-btn2');
    if (btn2) {
      btn2.textContent = 'Explore Hackathons →';
      btn2.setAttribute('onclick', "goTo('dashboard')");
    }
    const ctaHeading = document.getElementById('bottom-cta-heading');
    if (ctaHeading) {
      ctaHeading.textContent = 'Ready for your next hackathon?';
    }

    startHeartbeat();
    setInterval(fetchOnlineUsers, 15000);
    fetchOnlineUsers();
    startCountdowns();
  }
  showWelcomeMessage();

  const params = new URLSearchParams(window.location.search);
  const joinTeamId = params.get('join_team');
  const resetToken = params.get('reset_token');

  if (resetToken) {
    goTo('reset-password');
  } else if (joinTeamId) {
    if (!isLoggedIn) {
      sessionStorage.setItem('pendingJoinTeam', joinTeamId);
      goTo('login');
    } else {
      goTo('teams');
      setTimeout(() => openTeamChat(parseInt(joinTeamId), 'Team'), 800);
    }
    window.history.replaceState({}, '', window.location.pathname);
  } else {
    const persistedRoute = loadPersistedState('active_route');
    const hash = window.location.hash.startsWith('#/') ? window.location.hash.slice(2) : (persistedRoute || 'landing');
    handleRoute(hash);
  }
});

