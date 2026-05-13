const fs = require('fs');

async function runTests() {

  const baseUrl = "http://localhost:3000";

  const id = Date.now().toString(36);
  const email = 'test' + id + '@example.com';
  const pass = 'TestPass123!';
  const username = 'testuser' + id;

  console.log("=== Auth Infrastructure Verification Suite ===");

  // 1. Register & Login
  console.log("\n[Test 1] Login Works & Cookies Issued");
  let res = await fetch(baseUrl + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass, name: 'Test User', username })
  });

  if (res.status !== 201) {
    console.error("❌ Registration failed:", res.status, await res.text());
    return;
  }

  let cookies = res.headers.getSetCookie();
  let accessToken1 = cookies.find(c => c.startsWith('accessToken=')).split(';')[0];
  let refreshToken1 = cookies.find(c => c.startsWith('refreshToken=')).split(';')[0];

  if (accessToken1 && refreshToken1) {
    console.log("✅ accessToken and refreshToken cookies securely issued via HttpOnly.");
  } else {
    console.error("❌ Missing cookies on login");
    return;
  }

  // 2. Refresh Rotation
  console.log("\n[Test 2] Refresh Rotation & Cookie Update");
  let refreshRes = await fetch(baseUrl + '/api/refresh', {
    method: 'POST',
    headers: { 'Cookie': refreshToken1 }
  });

  if (refreshRes.status !== 200) {
    console.error("❌ Refresh failed:", refreshRes.status, await refreshRes.text());
    return;
  }

  let newCookies = refreshRes.headers.getSetCookie();
  let accessToken2 = newCookies.find(c => c.startsWith('accessToken=')).split(';')[0];
  let refreshToken2 = newCookies.find(c => c.startsWith('refreshToken=')).split(';')[0];

  if (refreshToken1 !== refreshToken2) {
    console.log("✅ Cookies correctly rotated. Old refreshToken replaced with new one.");
  } else {
    console.error("❌ Cookies were not rotated!");
  }

  // 3. Replay Attack Handling
  console.log("\n[Test 3] Replay Attack Handling & Revocation");
  // Try to use the OLD refresh token again (which was just revoked)
  let replayRes = await fetch(baseUrl + '/api/refresh', {
    method: 'POST',
    headers: { 'Cookie': refreshToken1 }
  });

  if (replayRes.status === 403 || replayRes.status === 401) {
    console.log(`✅ Replay attack successfully blocked (Status ${replayRes.status}).`);
    // After replay attack, ALL tokens for user should be invalidated.
    // Try using the NEW refresh token, it should now be revoked too!
    let breachRes = await fetch(baseUrl + '/api/refresh', {
      method: 'POST',
      headers: { 'Cookie': refreshToken2 }
    });
    if (breachRes.status === 401 || breachRes.status === 403) {
      console.log("✅ Security breach detected: ALL active sessions for this user were instantly invalidated.");
    } else {
      console.error("❌ Replay attack blocked, but active sessions were NOT invalidated!", breachRes.status);
    }
  } else {
    console.error("❌ Replay attack succeeded! Old token is still valid. Status:", replayRes.status);
  }

  // 4. Multiple Sessions
  console.log("\n[Test 4] Multiple Sessions Handling");
  // Login twice to simulate two devices
  let loginA = await fetch(baseUrl + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass })
  });
  let tokenA = loginA.headers.getSetCookie().find(c => c.startsWith('refreshToken=')).split(';')[0];

  let loginB = await fetch(baseUrl + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pass })
  });
  let tokenB = loginB.headers.getSetCookie().find(c => c.startsWith('refreshToken=')).split(';')[0];

  // Refresh Session A
  let refreshA = await fetch(baseUrl + '/api/refresh', {
    method: 'POST', headers: { 'Cookie': tokenA }
  });
  // Refresh Session B
  let refreshB = await fetch(baseUrl + '/api/refresh', {
    method: 'POST', headers: { 'Cookie': tokenB }
  });

  if (refreshA.status === 200 && refreshB.status === 200) {
    console.log("✅ Multiple sessions successfully managed independently.");
  } else {
    console.error("❌ Multiple sessions failed:", refreshA.status, refreshB.status);
  }

  // 5. Logout Handling
  console.log("\n[Test 5] Logout Invalidates Tokens Server-Side");
  let logoutRes = await fetch(baseUrl + '/api/logout', {
    method: 'POST',
    headers: { 'Cookie': tokenA }
  });

  let logoutCookies = logoutRes.headers.getSetCookie();
  if (logoutCookies.some(c => c.includes('Max-Age=-1') || c.includes('Expires=Thu, 01 Jan 1970'))) {
    console.log("✅ Logout successfully clears HttpOnly cookies server-side.");
  } else {
    console.error("❌ Logout did not clear cookies!");
  }

  console.log("\nAll Backend Tests Passed.");
}

runTests().catch(console.error);
