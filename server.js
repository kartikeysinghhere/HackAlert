require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendWelcomeEmail(name, email) {
  await sgMail.send({
    to: email,
    from: 'kartikey97999@gmail.com', // verify this in SendGrid
    subject: '🚀 Welcome to HackAlert!',
    html: ` <div style="font-family: monospace; background: #080810; color: #e2e8f0; padding: 40px; border-radius: 12px; max-width: 600px;">
    <h1 style="color: #00ff88;">Hack/Alert</h1>
    <h2>Hey ${name}! 👋</h2>
    <p>You're now part of 18,000+ developers who never miss a hackathon.</p>
    <p style="color: #94a3b8;">Here's what you can do:</p>
    <ul style="color: #94a3b8;">
      <li>Browse 240+ upcoming hackathons</li>
      <li>Ask HackBot anything</li>
      <li>Filter by online, offline, or hybrid</li>
    </ul>
    <a href="https://hackalert-m2hg.onrender.com" style="background: #00ff88; color: #080810; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px;">Browse Hackathons →</a>
    <p style="color: #475569; margin-top: 40px; font-size: 12px;">© 2025 HackAlert — Built for hackers, by hackers</p>
  </div>`
  });
}
 
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
 
// ── Signup with Supabase + Welcome Email ──
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
 
  try {
    await sendWelcomeEmail(name, email);
  } catch (err) {
    console.error('Email error:', err.message);
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

 
// ── EMAIL: New Hackathon Alert ──
async function sendHackathonAlert(userEmail, userName, hackathon) {
  await resend.emails.send({
    from: 'HackAlert <onboarding@resend.dev>',
    to: userEmail,
    subject: `🔔 New Hackathon: ${hackathon.name}`,
    html: `
      <div style="font-family: monospace; background: #080810; color: #e2e8f0; padding: 40px; border-radius: 12px; max-width: 600px;">
        <h1 style="color: #00ff88;">Hack/Alert</h1>
        <h2>New Hackathon Alert! 🚨</h2>
        <p>Hey ${userName}, a new hackathon just dropped:</p>
        <div style="background: #13131f; border: 1px solid rgba(0,255,136,0.2); border-radius: 12px; padding: 24px; margin: 20px 0;">
          <h3 style="color: #00ff88; margin: 0 0 12px;">${hackathon.name}</h3>
          <p style="color: #94a3b8; margin: 4px 0;">📅 Date: ${hackathon.date}</p>
          <p style="color: #94a3b8; margin: 4px 0;">💻 Mode: ${hackathon.mode}</p>
          <p style="color: #94a3b8; margin: 4px 0;">🏆 Prize: ${hackathon.prize || 'TBA'}</p>
          <p style="color: #94a3b8; margin: 4px 0;">📍 Location: ${hackathon.location || 'Online'}</p>
        </div>
        <a href="${hackathon.website}" style="background: #00ff88; color: #080810; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Register Now →</a>
        <p style="color: #475569; margin-top: 40px; font-size: 12px;">© 2025 HackAlert</p>
      </div>
    `
  });
}
 
// ── EMAIL: Deadline Reminder ──
async function sendDeadlineReminder(userEmail, userName, hackathon) {
  await resend.emails.send({
    from: 'HackAlert <onboarding@resend.dev>',
    to: userEmail,
    subject: `⏰ 48hrs left to register: ${hackathon.name}`,
    html: `
      <div style="font-family: monospace; background: #080810; color: #e2e8f0; padding: 40px; border-radius: 12px; max-width: 600px;">
        <h1 style="color: #00ff88;">Hack/Alert</h1>
        <h2>⚡ Last 48 Hours!</h2>
        <p>Hey ${userName}, registration is closing soon for:</p>
        <div style="background: #13131f; border: 1px solid rgba(239,68,68,0.4); border-radius: 12px; padding: 24px; margin: 20px 0;">
          <h3 style="color: #ef4444; margin: 0 0 12px;">${hackathon.name}</h3>
          <p style="color: #94a3b8; margin: 4px 0;">⏰ Deadline: ${hackathon.deadline}</p>
          <p style="color: #94a3b8; margin: 4px 0;">💻 Mode: ${hackathon.mode}</p>
          <p style="color: #94a3b8; margin: 4px 0;">🏆 Prize: ${hackathon.prize || 'TBA'}</p>
        </div>
        <a href="${hackathon.website}" style="background: #ef4444; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Register Before It's Too Late →</a>
        <p style="color: #475569; margin-top: 40px; font-size: 12px;">© 2025 HackAlert</p>
      </div>
    `
  });
}