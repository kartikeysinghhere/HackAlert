const bcrypt = require('bcrypt');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');

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

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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
          content: 'You are HackBot, an AI assistant for HackAlert — a hackathon tracking platform. Help developers find and register for hackathons. Be concise, enthusiastic, and use relevant emojis. Keep responses under 100 words.'
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
  if (!name || !email || !pass) return res.status(400).json({ error: 'Name, Email, and Password are required.' }); // This line was already changed in a previous diff

  const hashed = await bcrypt.hash(pass, 10);
  const { error } = await supabase
    .from('users')
    .insert([{ name, email, password: hashed, mobile, college }]);

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: 'Signup successful' });
});

app.post('/api/login', async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) return res.status(400).json({ error: 'Fields required' });

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(pass, data.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ message: 'Login successful', user: { name: data.name, email: data.email } });
});

// ── Get all teams ──
app.get('/api/teams', async (req, res) => {
  const { data, error } = await supabase // This line was already changed in a previous diff
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });
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
app.post('/api/teams/create', async (req, res) => {
  const { name, leader_email, hackathon, skills, size } = req.body;
  if (!name || !leader_email) return res.status(400).json({ error: 'Missing fields' });
  const { data, error: teamInsertError } = await supabase
    .from('teams')
    .insert([{ name, leader_email, hackathon, skills, size, slots_left: size - 1 }])
    .select()
    .single();
  if (teamInsertError) return res.status(500).json({ error: teamInsertError.message });
  await supabase.from('team_members').insert([{ team_id: data.id, user_email: leader_email }]);
  res.json(data);
});

// ── Join team ──
app.post('/api/teams/join', async (req, res) => {
  const { team_id, user_email, user_name } = req.body;
  const { data: team } = await supabase.from('teams').select('*').eq('id', team_id).single(); // This line was already changed in a previous diff
  if (!team || team.slots_left <= 0) return res.status(400).json({ error: 'Team full' });
  const { error } = await supabase.from('team_members').insert([{ team_id, user_email, user_name }]);
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'You are already a member of this team.' });
    return res.status(500).json({ error: error.message });
  }
  await supabase.from('teams').update({ slots_left: team.slots_left - 1 }).eq('id', team_id);
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

// ── Send team message ──
app.post('/api/teams/:id/messages', async (req, res) => {
  const { sender_email, sender_name, message } = req.body;
  if (bannedWords.some(w => message.toLowerCase().includes(w)))
    return res.status(400).json({ error: 'Message contains inappropriate language' });
  const { error } = await supabase.from('team_messages').insert([{
    team_id: req.params.id, sender_email, sender_name, message
  }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Sent' });
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
app.delete('/api/teams/:team_id/members/:user_email', async (req, res) => {
  const { team_id, user_email } = req.params;

  // Check if the user trying to leave is the leader
  const { data: team, error: teamError } = await supabase
    .from('teams') // This line was already changed in a previous diff
    .select('leader_email, slots_left')
    .eq('id', team_id)
    .single();

  if (teamError || !team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.leader_email === user_email) {
    return res.status(403).json({ error: 'Team leader cannot leave the team. Please delete the team instead.' });
  }
  // This line was already changed in a previous diff
  const { error: deleteError } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', team_id)
    .eq('user_email', user_email);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  // Increment slots_left
  const { error: updateError } = await supabase // This line was already changed in a previous diff
    .from('teams')
    .update({ slots_left: team.slots_left + 1 })
    .eq('id', team_id);

  if (updateError) {
    console.error('Error updating slots_left after member left:', updateError.message);
  }

  res.json({ message: 'Successfully left the team' });
});

// DELETE /api/teams/:team_id - Delete team (leader only)
app.delete('/api/teams/:team_id', async (req, res) => {
  const { team_id } = req.params;
  const { user_email } = req.body; // Expecting user_email for leader verification
  // This line was already changed in a previous diff
  const { data: team, error: teamError } = await supabase.from('teams').select('leader_email').eq('id', team_id).single(); // This line was already changed in a previous diff
  if (teamError || !team) return res.status(404).json({ error: 'Team not found' });
  if (team.leader_email !== user_email) return res.status(403).json({ error: 'Only the team leader can delete the team.' }); // This line was already changed in a previous diff

  await supabase.from('team_messages').delete().eq('team_id', team_id);
  await supabase.from('team_members').delete().eq('team_id', team_id);
  const { error: deleteTeamError } = await supabase.from('teams').delete().eq('id', team_id);
  if (deleteTeamError) return res.status(500).json({ error: deleteTeamError.message });
  res.json({ message: 'Team deleted successfully' });
});

app.delete('/api/teams/:id', async (req, res) => {
  const { leader_email } = req.body;
  const { data: team } = await supabase.from('teams').select('*').eq('id', req.params.id).single();
  if (!team || team.leader_email !== leader_email) return res.status(403).json({ error: 'Not authorized' });
  await supabase.from('teams').delete().eq('id', req.params.id);
  res.json({ message: 'Deleted' });
});

app.listen(PORT, () => {
  console.log(`✅ HackAlert running → http://localhost:${PORT}/realhackito.html`);
  console.log(`✅ Supabase connected!`);
});