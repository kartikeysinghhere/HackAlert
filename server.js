const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const cron = require('node-cron');

const app = express();
const PORT = 3000;

// Banned words list and censor function for the bot
const bannedWords = ['fuck', 'shit', 'ass', 'bastard', 'bitch', 'damn', 'crap']; // Extend as needed
function censorMessage(text) {
  let censoredText = text;
  bannedWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi'); // Whole word, case-insensitive
    censoredText = censoredText.replace(regex, '*'.repeat(word.length));
  });
  return censoredText;
}

// ── Auth middleware ──
function authenticate(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

const teamClients = {}; // Holds SSE connections { teamId: [res1, res2, ...] }
let globalHackathons = []; // Cached hackathons for RAG

// ── Replace empty cron with real alert logic ──
cron.schedule('0 10 * * *', async () => {
  console.log('[CRON] Running deadline alert check...');
  if (!process.env.RESEND_API_KEY) {
    console.log('[CRON] No RESEND_API_KEY. Skipping.');
    return;
  }

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Get all saved hackathons starting within 3 days
  const { data: upcoming, error } = await supabase
    .from('saved_hackathons')
    .select('*')
    .gte('hackathon_start', now.toISOString())
    .lte('hackathon_start', in3Days.toISOString());

  if (error || !upcoming?.length) {
    console.log('[CRON] No upcoming deadlines found.');
    return;
  }

  // Group by user
  const byUser = {};
  upcoming.forEach(row => {
    if (!byUser[row.user_email]) byUser[row.user_email] = [];
    byUser[row.user_email].push(row);
  });

  // Send one email per user
  for (const [email, hacks] of Object.entries(byUser)) {
    const hackList = hacks.map(h =>
      `<li><strong>${h.hackathon_name}</strong> — starts ${new Date(h.hackathon_start).toLocaleDateString()} — <a href="${h.hackathon_website}">Register →</a></li>`
    ).join('');

    try {
      await resend.emails.send({
        from: 'HackAlert <alerts@yourdomain.com>', // Change this
        to: email,
        subject: `⚡ ${hacks.length} hackathon(s) starting in 3 days!`,
        html: `
          <div style="font-family:monospace;background:#0e0e0e;color:#e5e2e1;padding:32px;border-radius:12px;">
            <h2 style="color:#00f0ff;">Hack/Alert ⚡</h2>
            <p>These hackathons you saved are starting soon:</p>
            <ul style="line-height:2;">${hackList}</ul>
            <p style="color:#64748b;font-size:12px;">You saved these on Hack/Alert. Visit your profile to manage saved hackathons.</p>
          </div>
        `
      });
      console.log(`[CRON] Alert sent to ${email}`);
    } catch (e) {
      console.error(`[CRON] Failed to send to ${email}:`, e.message);
    }
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/realhackito.html');
});
app.get('/api/hackathons', async (req, res) => {
  try {
    const [hackClub, supabaseRes] = await Promise.all([
      fetch('https://hackathons.hackclub.com/api/events/upcoming').then(r => r.json()),
      supabase.from('indian_hackathons').select('*')
    ]);
    const indian = supabaseRes.data || [];
    const all = [...hackClub, ...indian];

    // Remove duplicates by name
    const seen = new Set();
    const unique = all.filter(h => {
      const key = h.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    globalHackathons = unique;
    res.json(unique);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/ask', async (req, res) => {
  const { messages } = req.body; // Expecting an array of messages now
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  // Populate cache lazily if user hits /ask before the dashboard has loaded
  if (globalHackathons.length === 0) {
    try {
      const [hackClub, supabaseRes] = await Promise.all([
        fetch('https://hackathons.hackclub.com/api/events/upcoming').then(r => r.json()),
        supabase.from('indian_hackathons').select('*')
      ]);
      const all = [...hackClub, ...(supabaseRes.data || [])];
      const seen = new Set();
      globalHackathons = all.filter(h => {
        const key = h.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch (e) {
      console.warn('Could not prefetch hackathons for bot context:', e.message);
    }
  }

  // Apply censoring to all messages in the history for robustness
  const censoredMessages = messages.map(msg => ({
    ...msg,
    content: censorMessage(msg.content)
  }));

  const lastUserMessageContent = censoredMessages[censoredMessages.length - 1].content.toLowerCase();
  let action = null;
  let filterType = null;

  if (lastUserMessageContent.includes('offline') || lastUserMessageContent.includes('in person')) {
    action = 'filter'; filterType = 'offline';
  } else if (lastUserMessageContent.includes('online') || lastUserMessageContent.includes('virtual')) {
    action = 'filter'; filterType = 'online';
  } else if (lastUserMessageContent.includes('hybrid')) {
    action = 'filter'; filterType = 'hybrid';
  }

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are HackBot, an AI assistant for HackAlert — a hackathon tracking platform. Help developers find and register for hackathons. Be concise, enthusiastic, and use relevant emojis. Keep responses under 100 words. Here is the current live list of hackathons:\n${JSON.stringify(globalHackathons.map(h => ({ name: h.name, start: h.start, city: h.city, country: h.country, virtual: h.virtual, website: h.website })).slice(0, 50))}`
        },
        ...censoredMessages // Pass the entire (censored) conversation history
      ]
    });

    res.json({
      answer: response.choices[0].message.content,
      action,
      filterType
    });

  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'AI error: ' + err.message });
  }
});

app.post('/api/signup', async (req, res) => {
  const { name, email, pass, mobile, college } = req.body;
  if (!name || !email || !pass) return res.status(400).json({ error: 'Name, Email, and Password are required.' });

  const hashed = await bcrypt.hash(pass, 10);
  const { error } = await supabase
    .from('users')
    .insert([{ name, email, password: hashed, mobile, college }]);

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    return res.status(500).json({ error: error.message });
  }

  const token = jwt.sign({ email, name }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ message: 'Signup successful', token });
});

app.post('/api/login', async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) return res.status(400).json({ error: 'Fields required' });

  const { data, error } = await supabase
    .from('users').select('*').eq('email', email).single();

  if (error || !data) return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(pass, data.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { email: data.email, name: data.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ message: 'Login successful', token, user: { name: data.name, email: data.email } });
});

// ── Get all teams ──
app.get('/api/teams', async (req, res) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Save hackathon server-side (replace localStorage-only approach) ──
app.post('/api/saved', authenticate, async (req, res) => {
  const { hackathon_name, hackathon_start, hackathon_website } = req.body;
  const user_email = req.user.email;

  const { error } = await supabase.from('saved_hackathons')
    .upsert([{ user_email, hackathon_name, hackathon_start, hackathon_website }],
            { onConflict: 'user_email,hackathon_name' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Saved' });
});

app.delete('/api/saved/:name', authenticate, async (req, res) => {
  const user_email = req.user.email;
  const hackathon_name = decodeURIComponent(req.params.name);
  const { error } = await supabase.from('saved_hackathons')
    .delete().eq('user_email', user_email).eq('hackathon_name', hackathon_name);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Removed' });
});

app.get('/api/saved', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('saved_hackathons')
    .select('*').eq('user_email', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Get single team ──
app.get('/api/teams/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Create team ──
app.post('/api/teams/create', authenticate, async (req, res) => {
  const { name, hackathon, skills, size } = req.body;
  const leader_email = req.user.email; // From token, NOT request body
  if (!name) return res.status(400).json({ error: 'Team name required' });
  const { data, error: teamInsertError } = await supabase
    .from('teams')
    .insert([{ name, leader_email, hackathon, skills, size, slots_left: size - 1 }])
    .select().single();
  if (teamInsertError) return res.status(500).json({ error: teamInsertError.message });
  await supabase.from('team_members').insert([{ team_id: data.id, user_email: leader_email }]);
  res.json(data);
});

// ── Join team ──
app.post('/api/teams/join', authenticate, async (req, res) => {
  const { team_id } = req.body;
  const user_email = req.user.email; // From token
  const user_name = req.user.name;

  const { data: team } = await supabase.from('teams').select('*').eq('id', team_id).single();
  if (!team || team.slots_left <= 0) return res.status(400).json({ error: 'Team full' });

  const { error } = await supabase.from('team_members').insert([{ team_id, user_email, user_name }]);
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Already a member' });
    return res.status(500).json({ error: error.message });
  }
  const { data: updated } = await supabase
    .from('teams').update({ slots_left: team.slots_left - 1 })
    .eq('id', team_id).gt('slots_left', 0).select().single();
  if (!updated) {
    await supabase.from('team_members').delete().eq('team_id', team_id).eq('user_email', user_email);
    return res.status(400).json({ error: 'Team just filled up.' });
  }
  res.json({ message: 'Joined successfully' });
});

// ── Get team messages ──
app.get('/api/teams/:id/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('team_messages')
    .select('*')
    .eq('team_id', req.params.id)
    .order('sent_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── SSE Stream for Real-time chat ──
app.get('/api/teams/:id/stream', (req, res) => {
  const { id } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!teamClients[id]) teamClients[id] = [];
  teamClients[id].push(res);

  req.on('close', () => {
    teamClients[id] = teamClients[id].filter(client => client !== res);
  });
});

// ── Send team message ──
app.post('/api/teams/:id/messages', authenticate, async (req, res) => {
  const { message } = req.body;
  const sender_email = req.user.email;
  const sender_name = req.user.name;

  if (!message) return res.status(400).json({ error: 'Empty message' });
  if (bannedWords.some(w => message.toLowerCase().includes(w)))
    return res.status(400).json({ error: 'Message contains inappropriate language' });

  const newMessage = { team_id: req.params.id, sender_email, sender_name, message };
  const { data, error } = await supabase.from('team_messages').insert([newMessage]).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (teamClients[req.params.id]) {
    teamClients[req.params.id].forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));
  }
  res.json({ message: 'Sent' });
});

// ── Kanban API ──
app.get('/api/teams/:id/tasks', async (req, res) => {
  const { data, error } = await supabase
    .from('team_tasks')
    .select('*')
    .eq('team_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/teams/:id/tasks', async (req, res) => {
  const { title, status } = req.body;
  const { data, error } = await supabase
    .from('team_tasks')
    .insert([{ team_id: req.params.id, title, status }])
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/teams/:team_id/tasks/:task_id', async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabase
    .from('team_tasks')
    .update({ status })
    .eq('id', req.params.task_id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/teams/:team_id/tasks/:task_id', async (req, res) => {
  const { error } = await supabase.from('team_tasks').delete().eq('id', req.params.task_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted' });
});

// ── Get team members ──
app.get('/api/teams/:id/members', async (req, res) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', req.params.id);
  if (error) return res.status(500).json({ error: error.message }); // This line was already changed in a previous diff
  res.json(data);
});

// DELETE /api/teams/:team_id/members/:user_email - Leave team
app.delete('/api/teams/:team_id/members/:user_email', authenticate, async (req, res) => {
  const { team_id } = req.params;
  const user_email = req.user.email; // Ignore URL param, use token

  const { data: team, error: teamError } = await supabase
    .from('teams').select('leader_email, slots_left').eq('id', team_id).single();
  if (teamError || !team) return res.status(404).json({ error: 'Team not found' });
  if (team.leader_email === user_email) return res.status(403).json({ error: 'Leader cannot leave. Delete the team instead.' });

  const { error: deleteError } = await supabase
    .from('team_members').delete().eq('team_id', team_id).eq('user_email', user_email);
  if (deleteError) return res.status(500).json({ error: deleteError.message });

  await supabase.from('teams').update({ slots_left: team.slots_left + 1 }).eq('id', team_id);
  res.json({ message: 'Successfully left the team' });
});

// DELETE /api/teams/:team_id - Delete team (leader only)
app.delete('/api/teams/:team_id', authenticate, async (req, res) => {
  const { team_id } = req.params;
  const leader_email = req.user.email; // From token, not query param

  const { data: team, error: teamError } = await supabase.from('teams').select('leader_email').eq('id', team_id).single();
  if (teamError || !team) return res.status(404).json({ error: 'Team not found' });
  if (team.leader_email !== leader_email) return res.status(403).json({ error: 'Only the leader can delete the team.' });

  await supabase.from('team_tasks').delete().eq('team_id', team_id);
  await supabase.from('team_messages').delete().eq('team_id', team_id);
  await supabase.from('team_members').delete().eq('team_id', team_id);
  const { error: deleteErr } = await supabase.from('teams').delete().eq('id', team_id);
  if (deleteErr) return res.status(500).json({ error: deleteErr.message });
  res.json({ message: 'Team deleted successfully' });
});



app.listen(PORT, () => {
  console.log(`✅ HackAlert running → http://localhost:${PORT}/realhackito.html`);
  console.log(`✅ Supabase connected!`);
});