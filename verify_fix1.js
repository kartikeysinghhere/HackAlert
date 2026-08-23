async function runTests() {
  const fetch = globalThis.fetch;
  const baseUrl = "http://localhost:3000";
  
  console.log("Registering user...");
  let email = "test" + Date.now() + "@example.com";
  const username = "testuser" + Math.floor(Math.random() * 1000000);
  const res = await fetch(baseUrl + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass: 'TestPass123!', name: 'Test User', username })
  });
  
  console.log("Register response status:", res.status);
  const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  console.log("Set-Cookie headers count:", cookies.length);
  
  if (cookies.length === 0) return console.log(" No cookies received!");
  
  const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='))?.split(';')[0];
  const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='))?.split(';')[0];
  if (!accessTokenCookie || !refreshTokenCookie) return console.log(" Missing cookies!");

  console.log(" Cookies received and stored.");

  console.log("Testing protected route /api/profile...");
  const profileRes = await fetch(baseUrl + '/api/profile', {
    headers: { 'Cookie': accessTokenCookie }
  });
  console.log("Profile status:", profileRes.status);
  if (profileRes.status === 200) console.log(" Protected route works with cookie!");

  console.log("Testing EventSource /api/dm/test@example.com/stream...");
  const streamRes = await fetch(baseUrl + '/api/dm/test@example.com/stream', {
    headers: { 'Cookie': accessTokenCookie, 'Accept': 'text/event-stream' }
  });
  console.log("EventSource status:", streamRes.status);
  if (streamRes.status === 200) console.log(" EventSource stream works with cookie!");

  console.log("Testing Refresh Flow...");
  const refreshRes = await fetch(baseUrl + '/api/refresh', {
    method: 'POST',
    headers: { 'Cookie': refreshTokenCookie }
  });
  console.log("Refresh status:", refreshRes.status);
  const refreshCookies = refreshRes.headers.getSetCookie ? refreshRes.headers.getSetCookie() : [];
  if (refreshRes.status === 200 && refreshCookies.length > 0) {
    console.log(" Refresh flow works and rotates cookies!");
  } else {
    console.log(" Refresh flow failed.");
  }

  console.log("Testing Logout...");
  const logoutRes = await fetch(baseUrl + '/api/logout', {
    method: 'POST',
    headers: { 'Cookie': refreshTokenCookie }
  });
  console.log("Logout status:", logoutRes.status);
  const logoutCookies = logoutRes.headers.getSetCookie ? logoutRes.headers.getSetCookie() : [];
  if (logoutCookies && logoutCookies.some(c => c.includes('Max-Age=-1') || c.includes('Expires=Thu, 01 Jan 1970'))) {
      console.log(" Logout works and clears cookies!");
  } else {
      console.log(" Logout failed or did not clear cookies.");
  }
}
runTests();
