import { state } from './state.js';
import { showToast, openModal, closeModal } from './ui.js';
import { goTo } from './router.js';
import { authHeaders } from './api.js';

export async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  if (!email || !pass) return alert('Fill all fields');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, pass })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('loggedIn', 'true');
      if (window.startOnlineUsersPolling) window.startOnlineUsersPolling();
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', data.user?.name || '');
      localStorage.setItem('userUsername', data.user?.username || '');
      localStorage.setItem('userGender', data.user?.gender || '');
      localStorage.setItem('userBio', data.user?.bio || '');
      localStorage.setItem('userSkills', data.user?.skills || '');
      localStorage.setItem('userMobile', data.user?.mobile || '');
      localStorage.setItem('userCollege', data.user?.college || '');
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

      const pendingJoin = sessionStorage.getItem('pendingJoinTeam');
      if (pendingJoin) {
        sessionStorage.removeItem('pendingJoinTeam');
        goTo('teams');
        // Wait for teams to load then auto-open chat (this will be bound globally)
        setTimeout(() => window.openTeamChat(parseInt(pendingJoin), 'Team'), 800);
      } else {
        goTo('dashboard');
      }
      showToast('success', 'Login Successful!', `Welcome back, ${data.user?.name || 'user'}!`);
    } else {
      showToast('error', 'Login Failed', data.error || 'Something went wrong during login.');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('error', 'Server Error', 'Could not connect to the server. Please try again.');
  }
}

let mobileVerified = false;

export function togglePasswordVisibility() {
  const passInput = document.getElementById('signup-pass');
  const eyeOpen = document.getElementById('eye-icon-open');
  const eyeClosed = document.getElementById('eye-icon-closed');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    eyeOpen.style.display = 'none';
    eyeClosed.style.display = 'block';
  } else {
    passInput.type = 'password';
    eyeOpen.style.display = 'block';
    eyeClosed.style.display = 'none';
  }
}

export async function signupUser() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const pass = document.getElementById('signup-pass').value.trim();
  const mobile = document.getElementById('signup-mobile').value.trim() || null;
  const college = document.getElementById('signup-college').value.trim() || null;
  const username = document.getElementById('signup-username').value.trim().replace('@', '');
  const gender = document.querySelector('input[name="gender"]:checked')?.value || null;
  const bio = document.getElementById('signup-bio').value.trim() || null;
  const skills = document.getElementById('signup-skills').value.trim() || null;

  if (!name || !email || !pass || !username) return alert('Name, Email, Password and Username are required.');

  if (mobile && !mobileVerified) {
    showToast('Error', 'Mobile Not Verified', 'Please verify your mobile number before signing up, or remove it.');
    return;
  }


  state.pendingSignupData = { name, email, pass, mobile, college, username, gender, bio, skills };

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('Error', 'OTP Failed', data.error || 'Could not send OTP.');
      return;
    }

    document.getElementById('otp-email-display').textContent = `We sent a code to ${email}`;
    openModal('otp-modal');
    document.getElementById('otp-input').value = '';
    document.getElementById('otp-input').focus();
  } catch (err) {
    console.error('Signup OTP error:', err);
    showToast('Error', 'Server Error', 'Could not send OTP. Please try again.');
  }
}

export async function verifyOTP() {
  const otp = document.getElementById('otp-input').value.trim();
  if (!/^\d{6}$/.test(otp)) {
    showToast('Invalid', 'Invalid', 'Enter the 6-digit code.');
    return;
  }

  const email = state.pendingSignupData?.email;
  if (!email) return;

  try {
    const verifyRes = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, otp })
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      showToast('Error', 'Wrong Code', verifyData.error || 'Invalid OTP');
      return;
    }

    closeModal('otp-modal');

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(state.pendingSignupData)
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('loggedIn', 'true');
      if (window.startOnlineUsersPolling) window.startOnlineUsersPolling();
      localStorage.setItem('userName', state.pendingSignupData.name);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userUsername', state.pendingSignupData.username);
      localStorage.setItem('userGender', state.pendingSignupData.gender || '');
      localStorage.setItem('userBio', state.pendingSignupData.bio || '');
      localStorage.setItem('userSkills', state.pendingSignupData.skills || '');
      localStorage.setItem('userMobile', state.pendingSignupData.mobile || '');
      localStorage.setItem('userCollege', state.pendingSignupData.college || '');

      const signedUpName = state.pendingSignupData.name;
      state.pendingSignupData = null;
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

      goTo('dashboard');
      showToast('Success', 'Signup Successful!', `Welcome to Hack/Alert, ${signedUpName}!`);
    } else {
      showToast('Error', 'Signup Failed', data.error || 'Something went wrong during signup.');
    }
  } catch (err) {
    console.error('OTP verification error:', err);
    showToast('Error', 'Error', 'Something went wrong.');
  }
}

export async function resendOTP() {
  const email = state.pendingSignupData?.email;
  if (!email) return;

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) showToast('Email', 'Sent!', 'New OTP sent to your email.');
    else showToast('Error', 'Error', data.error || 'Could not resend.');
  } catch (err) {
    showToast('Error', 'Error', 'Could not resend.');
  }
}

export function toggleChip(el) {
  el.classList.toggle('selected');
}

export async function sendMobileOTP() {
  const mobile = document.getElementById('signup-mobile').value.trim();
  if (!mobile || mobile.length < 10) {
    showToast('Error', 'Invalid', 'Enter a valid mobile number.');
    return;
  }

  try {
    const res = await fetch('/api/send-mobile-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast('Error', 'OTP Failed', data.error || 'Could not send OTP.');
      return;
    }

    document.getElementById('mobile-otp-display').textContent = `We sent a code to ${mobile}`;
    openModal('mobile-otp-modal');
    document.getElementById('mobile-otp-input').value = '';
    document.getElementById('mobile-otp-input').focus();
  } catch (err) {
    console.error('Mobile OTP error:', err);
    showToast('Error', 'Server Error', 'Could not send OTP. Please try again.');
  }
}

export async function verifyMobileOTP() {
  const otp = document.getElementById('mobile-otp-input').value.trim();
  if (!/^\d{6}$/.test(otp)) {
    showToast('Invalid', 'Invalid', 'Enter the 6-digit code.');
    return;
  }

  const mobile = document.getElementById('signup-mobile').value.trim();
  if (!mobile) return;

  try {
    const verifyRes = await fetch('/api/verify-mobile-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ mobile, otp })
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      showToast('Error', 'Wrong Code', verifyData.error || 'Invalid OTP');
      return;
    }

    mobileVerified = true;
    closeModal('mobile-otp-modal');
    document.getElementById('mobile-verify-btn').style.display = 'none';
    document.getElementById('mobile-verified-badge').style.display = 'inline';
    document.getElementById('signup-mobile').setAttribute('readonly', true);
    showToast('Success', 'Verified!', 'Mobile number verified successfully.');
  } catch (err) {
    console.error('Mobile OTP verification error:', err);
    showToast('Error', 'Error', 'Something went wrong.');
  }
}

export async function resendMobileOTP() {
  const mobile = document.getElementById('signup-mobile').value.trim();
  if (!mobile) return;

  try {
    const res = await fetch('/api/send-mobile-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile })
    });
    const data = await res.json();
    if (res.ok) showToast('SMS', 'Sent!', 'New OTP sent to your mobile.');
    else showToast('Error', 'Error', data.error || 'Could not resend.');
  } catch (err) {
    showToast('Error', 'Error', 'Could not resend.');
  }
}

export function logout() {
  openModal('logout-modal');
}

export function hideLogoutModal() {
  closeModal('logout-modal');
}

export async function confirmLogout() {
  closeModal('logout-modal');
  if (window.stopOnlineUsersPolling) window.stopOnlineUsersPolling();
  try {
    await fetch('/api/logout', {
      method: 'POST',
      headers: authHeaders()
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
  document.getElementById('nav-auth').style.display = '';
  document.getElementById('nav-app').style.display = 'none';
  localStorage.removeItem('authToken');
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userUsername');
  localStorage.removeItem('userGender');
  localStorage.removeItem('userBio');
  localStorage.removeItem('userSkills');
  localStorage.removeItem('userMobile');
  localStorage.removeItem('userCollege');
  
  const btn1 = document.getElementById('get-started-btn');
  if (btn1) {
    btn1.textContent = "Get Started — It's Free →";
    btn1.setAttribute('onclick', "goTo('signup')");
  }
  const btn2 = document.getElementById('get-started-btn2');
  if (btn2) {
    btn2.textContent = 'Create Free Account →';
    btn2.setAttribute('onclick', "goTo('signup')");
  }
  const ctaHeading = document.getElementById('bottom-cta-heading');
  if (ctaHeading) {
    ctaHeading.textContent = 'Ready to win your first hackathon?';
  }
  
  goTo('landing');
}

export function selectGender(val) {
  const male = document.getElementById('gender-male-label');
  const female = document.getElementById('gender-female-label');
  if (val === 'male') {
    male.style.borderColor = 'var(--accent)';
    male.style.color = 'var(--accent)';
    female.style.borderColor = 'var(--border-light)';
    female.style.color = 'var(--muted)';
  } else {
    female.style.borderColor = 'var(--accent2)';
    female.style.color = 'var(--accent2)';
    male.style.borderColor = 'var(--border-light)';
    male.style.color = 'var(--muted)';
  }
}

export async function requestPasswordReset() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('warning', 'Invalid Email', 'Please enter a valid email address.');
    return;
  }

  try {
    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    showToast('info', 'Request Sent', data.message);
    if (res.ok) {
      document.getElementById('forgot-email').value = '';
    }
  } catch (err) {
    showToast('error', 'Error', 'Failed to request password reset.');
  }
}

export async function handlePasswordReset() {
  const pass = document.getElementById('reset-pass').value;
  const confirm = document.getElementById('reset-pass-confirm').value;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('reset_token');

  if (!token) {
    showToast('error', 'Invalid Link', 'Reset token is missing.');
    return;
  }

  if (pass.length < 8) {
    showToast('warning', 'Weak Password', 'Password must be at least 8 characters.');
    return;
  }

  if (pass !== confirm) {
    showToast('warning', 'Mismatch', 'Passwords do not match.');
    return;
  }

  try {
    const res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: pass })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Success!', 'Password has been reset. Please log in.');
      window.history.replaceState({}, '', window.location.pathname);
      goTo('login');
    } else {
      showToast('error', 'Reset Failed', data.error);
    }
  } catch (err) {
    showToast('error', 'Error', 'Failed to reset password.');
  }
}

