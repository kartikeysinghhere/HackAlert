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

// ── Proxy hackathons API ──
app.get('/api/hackathons', async (req, res) => {
  try {
    const response = await fetch('https://hackathons.hackclub.com/api/events/upcoming');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hackathons' });
  }
});

// ── HackBot AI endpoint ──
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

// ── Signup with Supabase ──
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

// ── Login with Supabase ──
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

app.listen(PORT, () => {
  console.log(`✅ HackAlert running → http://localhost:${PORT}/realhackito.html`);
  console.log(`✅ Supabase connected!`);
});