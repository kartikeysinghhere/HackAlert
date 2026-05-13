async function runTests() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const baseUrl = "http://localhost:3000";
  
  console.log("Registering user...");
  let email = "test" + Date.now() + "@example.com";
  const res = await fetch(baseUrl + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass: 'TestPass123!', name: 'Test User', username: 'testuser123' })
  });
  
  const cookies = res.headers.raw()['set-cookie'];
  console.log("Set-Cookie headers:", !!cookies);
  
  if (!cookies) return console.log("❌ No cookies received!");
  
  const accessTokenCookie = cookies.find(c => c.startsWith('accessToken=')).split(';')[0];
  const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken=')).split(';')[0];

  console.log("✅ Cookies received and stored.");

  console.log("Testing protected route /api/profile...");
  const profileRes = await fetch(baseUrl + '/api/profile', {
    headers: { 'Cookie': accessTokenCookie }
  });
  console.log("Profile status:", profileRes.status);
  if (profileRes.status === 200) console.log("✅ Protected route works with cookie!");

  console.log("Testing EventSource /api/dm/test@example.com/stream...");
  const streamRes = await fetch(baseUrl + '/api/dm/test@example.com/stream', {
    headers: { 'Cookie': accessTokenCookie, 'Accept': 'text/event-stream' }
  });
  console.log("EventSource status:", streamRes.status);
  if (streamRes.status === 200) console.log("✅ EventSource stream works with cookie!");

  console.log("Testing Refresh Flow...");
  const refreshRes = await fetch(baseUrl + '/api/refresh', {
    method: 'POST',
    headers: { 'Cookie': refreshTokenCookie }
  });
  console.log("Refresh status:", refreshRes.status);
  if (refreshRes.status === 200 && refreshRes.headers.raw()['set-cookie']) {
    console.log("✅ Refresh flow works and rotates cookies!");
  } else {
    console.log("❌ Refresh flow failed.");
  }

  console.log("Testing Logout...");
  const logoutRes = await fetch(baseUrl + '/api/logout', {
    method: 'POST',
    headers: { 'Cookie': refreshTokenCookie }
  });
  console.log("Logout status:", logoutRes.status);
  const logoutCookies = logoutRes.headers.raw()['set-cookie'];
  if (logoutCookies && logoutCookies.some(c => c.includes('Max-Age=-1') || c.includes('Expires=Thu, 01 Jan 1970'))) {
      console.log("✅ Logout works and clears cookies!");
  } else {
      console.log("❌ Logout failed or did not clear cookies.");
  }
}
runTests();
