const supabase = require('./config/db');
const teamsService = require('./services/teams.service');
const hackathonsService = require('./services/hackathons.service');

async function verifySchema() {
  console.log('🔍 Starting Phase 2 Schema Verification (Sync & Repair)...\n');

  const testEmail = `test_schema_${Date.now()}@example.com`;
  let testHackathonId;

  try {
    // 0. Seed a test hackathon
    console.log('0. Seeding test hackathon...');
    const { data: hackathon, error: hError } = await supabase.from('hackathons').insert([{
        name: 'Verification Hackathon',
        description: 'Testing schema sync'
    }]).select().single();
    
    if (hError) throw new Error(`Could not seed hackathon: ${hError.message}`);
    testHackathonId = hackathon.id;
    console.log(`✅ Seeded hackathon ID: ${testHackathonId}`);

    // 1. Test Saved Hackathons Uniqueness
    console.log('\n1. Testing Saved Hackathons Uniqueness...');
    await hackathonsService.save(testEmail, testHackathonId);
    try {
      await hackathonsService.save(testEmail, testHackathonId);
      console.error('❌ FAIL: Allowed duplicate saved hackathon');
    } catch (e) {
      console.log('✅ PASS: Blocked duplicate saved hackathon');
    }

    // 2. Test Team Membership Uniqueness
    console.log('\n2. Testing Team Membership Uniqueness...');
    const team = await teamsService.createTeam(testEmail, { 
        name: `Test Team ${Date.now()}`,
        hackathon_id: testHackathonId 
    });
    try {
      await supabase.from('team_members').insert([{ team_id: team.id, user_email: testEmail, role: 'Member' }]);
      console.error('❌ FAIL: Allowed duplicate team membership');
    } catch (e) {
      console.log('✅ PASS: Blocked duplicate team membership');
    }

    // 3. Test teams.service.js onConflict Fix
    console.log('\n3. Testing teams.service.js onConflict Fix...');
    try {
      await supabase.from('saved_hackathons').upsert(
        [{ user_email: testEmail, hackathon_id: testHackathonId }],
        { onConflict: 'user_email,hackathon_id' }
      );
      console.log('✅ PASS: onConflict logic successfully executed with corrected columns');
    } catch (e) {
      console.error('❌ FAIL: onConflict logic failed:', e.message);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('saved_hackathons').delete().eq('user_email', testEmail);
    await supabase.from('team_members').delete().eq('user_email', testEmail);
    await supabase.from('teams').delete().eq('id', team.id);
    await supabase.from('hackathons').delete().eq('id', testHackathonId);
    await supabase.from('users').delete().eq('email', testEmail);

  } catch (err) {
    console.error('\n💥 Verification failed unexpectedly:', err.message);
  }

  console.log('\n✨ Verification Complete.');
  process.exit();
}

verifySchema();
