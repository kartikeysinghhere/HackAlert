require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

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
    res.json([...hackClub, ...indian]);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/ask', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const text = message.toLowerCase();
  let action = null;
  let filterType = null;

  if (text.includes('offline') || text.includes('in person')) {
    action = 'filter'; filterType = 'offline';
  } else if (text.includes('online') || text.includes('virtual')) {
    action = 'filter'; filterType = 'online';
  } else if (text.includes('hybrid')) {
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
        { role: 'user', content: message }
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
  const { name, email, pass } = req.body;
  if (!name || !email || !pass) return res.status(400).json({ error: 'All fields required' });

  const { error } = await supabase
    .from('users')
    .insert([{ name, email, password: pass }]);

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
    .eq('password', pass)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ message: 'Login successful', user: { name: data.name, email: data.email } });
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

// ── Create team ──
app.post('/api/teams/create', async (req, res) => {
  const { name, leader_email, hackathon, skills, size } = req.body;
  if (!name || !leader_email) return res.status(400).json({ error: 'Missing fields' });
  const { data, error } = await supabase
    .from('teams')
    .insert([{ name, leader_email, hackathon, skills, size, slots_left: size - 1 }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await supabase.from('team_members').insert([{ team_id: data.id, user_email: leader_email }]);
  res.json(data);
});

// ── Join team ──
app.post('/api/teams/join', async (req, res) => {
  const { team_id, user_email, user_name } = req.body;
  const { data: team } = await supabase.from('teams').select('*').eq('id', team_id).single();
  if (!team || team.slots_left <= 0) return res.status(400).json({ error: 'Team full' });
  const { error } = await supabase.from('team_members').insert([{ team_id, user_email, user_name }]);
  if (error) return res.status(500).json({ error: error.message });
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
  const banned = ['fuck','shit','ass','bastard','bitch','damn','crap'];
  if (banned.some(w => message.toLowerCase().includes(w)))
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
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`✅ HackAlert running → http://localhost:${PORT}/realhackito.html`);
  console.log(`✅ Supabase connected!`);
});

function getIndianHackathons() {
  return [
    { name:"Smart India Hackathon 2026", start:"2026-08-01", city:"Multiple Cities", country:"India", virtual:false, hybrid:false, website:"https://sih.gov.in" },
    { name:"HackWithInfy", start:"2026-06-15", city:"Bengaluru", country:"India", virtual:false, hybrid:true, website:"https://hackwithinfy.in" },
    { name:"Hack This Fall", start:"2026-07-01", city:"", country:"India", virtual:true, hybrid:false, website:"https://hackthisfall.tech" },
    { name:"HackBout", start:"2026-06-20", city:"Delhi", country:"India", virtual:false, hybrid:false, website:"https://hackbout.tech" },
    { name:"HackNITR", start:"2026-07-10", city:"Rourkela", country:"India", virtual:false, hybrid:false, website:"https://hacknitr.tech" },
    { name:"HackCBS", start:"2026-09-01", city:"Delhi", country:"India", virtual:false, hybrid:false, website:"https://hackcbs.tech" },
    { name:"HackBVP", start:"2026-08-15", city:"Delhi", country:"India", virtual:false, hybrid:false, website:"https://hackbvp.com" },
    { name:"Hackstreet Boys", start:"2026-07-20", city:"Mumbai", country:"India", virtual:false, hybrid:false, website:"https://hackstreet.in" }
  ];
}