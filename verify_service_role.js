const supabase = require('./config/db');
const http = require('http');

const baseUrl = "http://localhost:3000";

// Helper to perform HTTP requests and extract cookies
function makeRequest(path, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: res.headers['set-cookie'] || [],
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, cookies: res.headers['set-cookie'] || [], body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log(' Starting service_role functional verification tests...\n');

  // Verify that the environment variable exists but mask it from being printed
  const maskedKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' 
    : 'MISSING';
  console.log(`[Config Check] SUPABASE_SERVICE_ROLE_KEY prefix: ${maskedKey}`);
  console.log(`[Config Check] SUPABASE_URL: ${process.env.SUPABASE_URL}`);

  try {
    // ----------------------------------------------------
    // PART 1: Direct DB-level verification (RLS Bypassing)
    // ----------------------------------------------------
    console.log('\n--- Part 1: Direct DB Access Verification (Bypassing RLS) ---');
    
    // 1. Teams Table
    console.log('1. Testing direct write/read on teams table...');
    const { data: team, error: teamErr } = await supabase.from('teams').insert([{
      name: `Direct Test Team ${Date.now()}`,
      leader_email: 'direct_test@example.com',
      hackathon: 'Direct Hackathon',
      skills: 'JS, SQL',
      size: 4,
      slots_left: 3
    }]).select().single();
    if (teamErr) throw new Error(`Teams write failed: ${teamErr.message}`);
    console.log(`    Success: Team created directly. ID = ${team.id}`);

    // 2. Team Members Table
    console.log('2. Testing direct write/read on team_members table...');
    const { data: member, error: memberErr } = await supabase.from('team_members').insert([{
      team_id: team.id,
      user_email: 'direct_test@example.com',
      user_name: 'Direct User',
      role: 'Leader'
    }]).select().single();
    if (memberErr) throw new Error(`Team Members write failed: ${memberErr.message}`);
    console.log(`    Success: Member added directly. ID = ${member.id}`);

    // 3. Team Messages Table
    console.log('3. Testing direct write/read on team_messages table...');
    const { data: msg, error: msgErr } = await supabase.from('team_messages').insert([{
      team_id: team.id,
      sender_email: 'direct_test@example.com',
      sender_name: 'Direct User',
      message: 'Hello direct test!'
    }]).select().single();
    if (msgErr) throw new Error(`Team Messages write failed: ${msgErr.message}`);
    console.log(`    Success: Message sent directly. ID = ${msg.id}`);

    // 4. Chat Threads Table
    console.log('4. Testing direct write/read on chat_threads table...');
    const { data: thread, error: threadErr } = await supabase.from('chat_threads').insert([{
      user_email: 'direct_test@example.com'
    }]).select().single();
    if (threadErr) throw new Error(`Chat Threads write failed: ${threadErr.message}`);
    console.log(`    Success: Chat thread created directly. ID = ${thread.id}`);

    // 5. Chat Messages Table
    console.log('5. Testing direct write/read on chat_messages table...');
    const { data: chatMsg, error: chatMsgErr } = await supabase.from('chat_messages').insert([{
      thread_id: thread.id,
      role: 'user',
      content: 'Hello AI assistant!'
    }]).select().single();
    if (chatMsgErr) throw new Error(`Chat Messages write failed: ${chatMsgErr.message}`);
    console.log(`    Success: Chat message added directly. ID = ${chatMsg.id}`);

    // Clean up direct test data
    console.log(' Cleaning up Part 1 test data...');
    await supabase.from('chat_messages').delete().eq('id', chatMsg.id);
    await supabase.from('chat_threads').delete().eq('id', thread.id);
    await supabase.from('team_messages').delete().eq('id', msg.id);
    await supabase.from('team_members').delete().eq('id', member.id);
    await supabase.from('teams').delete().eq('id', team.id);
    console.log('    Part 1 Cleaned up.');

    // ----------------------------------------------------
    // PART 2: API-level End-to-End Functional Flow Verification
    // ----------------------------------------------------
    console.log('\n--- Part 2: API Route Verification (End-to-End Flow) ---');

    const emailA = `usera_${Date.now()}@example.com`;
    const usernameA = `usera_${Math.floor(Math.random() * 100000)}`;
    const emailB = `userb_${Date.now()}@example.com`;
    const usernameB = `userb_${Math.floor(Math.random() * 100000)}`;

    // A. Seed OTP in database directly to bypass actual email sending
    console.log('A. Seeding verification OTPs for User A and User B...');
    const otpVal = "123456";
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabase.from('email_otps').insert([
      { email: emailA, otp: otpVal, expires_at: otpExpiry, used: false },
      { email: emailB, otp: otpVal, expires_at: otpExpiry, used: false }
    ]);

    // B. Verify OTPs via HTTP
    console.log('B. Verifying OTPs via API...');
    const verifyARes = await makeRequest('/api/verify-otp', 'POST', {}, { email: emailA, otp: otpVal });
    const verifyBRes = await makeRequest('/api/verify-otp', 'POST', {}, { email: emailB, otp: otpVal });
    if (verifyARes.status !== 200 || verifyBRes.status !== 200) {
      throw new Error(`OTP verification failed: User A status: ${verifyARes.status}, User B status: ${verifyBRes.status}`);
    }
    console.log('    Success: Both OTPs verified successfully.');

    // C. Register Users via HTTP
    console.log('C. Registering User A and User B via API...');
    const signupARes = await makeRequest('/api/signup', 'POST', {}, {
      email: emailA, pass: 'TestPass123!', name: 'User A', username: usernameA,
      gender: 'Male', mobile: '1234567890', college: 'Tech University', bio: 'Bio A', skills: 'JS'
    });
    const signupBRes = await makeRequest('/api/signup', 'POST', {}, {
      email: emailB, pass: 'TestPass123!', name: 'User B', username: usernameB,
      gender: 'Female', mobile: '0987654321', college: 'Science College', bio: 'Bio B', skills: 'SQL'
    });
    if (signupARes.status !== 201 || signupBRes.status !== 201) {
      throw new Error(`Signup failed: User A status: ${signupARes.status}, User B status: ${signupBRes.status}`);
    }
    console.log('    Success: Both users registered successfully.');

    // D. Log in Users and extract cookies
    console.log('D. Logging in User A and User B to obtain session cookies...');
    const loginARes = await makeRequest('/api/login', 'POST', {}, { email: emailA, pass: 'TestPass123!' });
    const loginBRes = await makeRequest('/api/login', 'POST', {}, { email: emailB, pass: 'TestPass123!' });
    if (loginARes.status !== 200 || loginBRes.status !== 200) {
      throw new Error(`Login failed: User A status: ${loginARes.status}, User B status: ${loginBRes.status}`);
    }
    
    const cookieA = loginARes.cookies.find(c => c.startsWith('authToken='))?.split(';')[0];
    const cookieB = loginBRes.cookies.find(c => c.startsWith('authToken='))?.split(';')[0];
    if (!cookieA || !cookieB) throw new Error('Missing session cookies!');
    console.log('    Success: Logged in and session cookies obtained.');

    // E. Team Creation
    console.log('E. User A creating a new team...');
    const createTeamRes = await makeRequest('/api/teams', 'POST', { 'Cookie': cookieA }, {
      name: `API Test Team ${Date.now()}`,
      hackathon: 'API Hackathon',
      skills: 'JS, SQL',
      size: 4
    });
    if (createTeamRes.status !== 200) {
      throw new Error(`Team creation failed: ${createTeamRes.status} - ${JSON.stringify(createTeamRes.body)}`);
    }
    const apiTeam = createTeamRes.body;
    console.log(`    Success: Team created. ID = ${apiTeam.id}, Name = "${apiTeam.name}"`);

    // F. Team Joining
    console.log('F. User B joining User A\'s team...');
    const joinTeamRes = await makeRequest(`/api/teams/${apiTeam.id}/members`, 'POST', { 'Cookie': cookieB });
    if (joinTeamRes.status !== 200) {
      throw new Error(`Team joining failed: ${joinTeamRes.status} - ${JSON.stringify(joinTeamRes.body)}`);
    }
    console.log('    Success: User B joined the team.');

    // G. Team Messaging
    console.log('G. User B sending a message to the team...');
    const messageRes = await makeRequest(`/api/teams/${apiTeam.id}/messages`, 'POST', { 'Cookie': cookieB }, {
      message: 'Hello team, User B here!'
    });
    if (messageRes.status !== 200) {
      throw new Error(`Team messaging failed: ${messageRes.status} - ${JSON.stringify(messageRes.body)}`);
    }
    console.log('    Success: Team message sent and saved.');

    // H. Clean up users & team data from the database
    console.log(' Cleaning up API verification data from database...');
    await supabase.from('team_messages').delete().eq('team_id', apiTeam.id);
    await supabase.from('team_members').delete().eq('team_id', apiTeam.id);
    await supabase.from('teams').delete().eq('id', apiTeam.id);
    await supabase.from('users').delete().in('email', [emailA, emailB]);
    console.log('    Cleanup complete.');

    console.log('\n ALL FUNCTIONAL AND SCHEMA CHECKS PASSED PERFECTLY WITH SERVICE_ROLE! ');

  } catch (err) {
    console.error('\n Verification failed:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

runTests();
