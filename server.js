const bcrypt = require('bcrypt');
require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const { slowDown } = require('express-slow-down');
const cors = require('cors');
const Groq = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const axios = require('axios');
const crypto = require('crypto');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function handleError(res, error, customMsg = 'Internal Server Error', status = 500) {
  console.error('Error Details:', error);
  res.status(status).json({ error: customMsg });
}

function sanitizeInput(text) {
  if (typeof text !== 'string') return text;
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('CRITICAL: JWT_SECRET missing in environment');

const app = express();
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 3000;

// Rate Limiters & Security
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  statusCode: 429,
  message: { error: 'Too many requests. Please try again after 15 minutes.' }
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  statusCode: 429,
  message: { error: 'Too many AI requests. Please try again after 15 minutes.' }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many OTP requests.' }
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  statusCode: 429,
  message: { error: 'Too many OTP requests. Please try again after an hour.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  statusCode: 429,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes, then...
  delayMs: (hits) => hits * 500 // Add 500ms delay per request above 50
});

function blockSuspiciousHeaders(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  const suspiciousUserAgents = /sqlmap|nikto|acunetix|dirbuster|censys|zgrab|nmap|masscan|hydra|w3af|arachni/i;
  
  if (suspiciousUserAgents.test(userAgent)) {
    return res.status(400).json({ error: 'Suspicious request blocked.' });
  }

  const suspiciousPattern = /<script>|union\s+select|select\s+.*\s+from|(\.\.\/|\.\.\\)/i;
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string' && suspiciousPattern.test(value)) {
      return res.status(400).json({ error: 'Malicious payload detected in headers.' });
    }
  }

  next();
}

app.use(cookieParser());

const dmClients = {};
const teamClients = {};

const bannedWords = require('./bannedWords.json');
function censorMessage(text) {
  let censoredText = text;
  bannedWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censoredText = censoredText.replace(regex, '*'.repeat(word.length));
  });
  return censoredText;
}

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function sendEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('Email service not configured');
  }
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { name: 'HackAlert', email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Email send failed');
  }
}
let globalHackathons = [];

function compactText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeEmailHTML(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}


function normalizeHackathon(h) {
  const mode = h.hybrid ? 'hybrid' : h.virtual ? 'online' : 'offline';
  return {
    name: compactText(h.name, 120),
    start: h.start || h.hackathon_start || h.starts_at || null,
    end: h.end || h.ends_at || h.deadline || null,
    city: compactText(h.city, 80),
    state: compactText(h.state, 80),
    country: compactText(h.country, 80),
    mode,
    website: compactText(h.website || h.url || h.hackathon_website, 240),
    tags: [h.category, h.theme, h.track, h.skills].filter(Boolean).map(v => compactText(v, 80))
  };
}

function detectHackathonIntent(text, hackathons) {
  const q = text.toLowerCase();
  const intent = {
    mode: null,
    location: null,
    topic: null,
    wantsUpcoming: /(upcoming|next|nearest|soon|deadline|date|when|recommend|suggest|find|show)/i.test(q)
  };

  if (q.includes('offline') || q.includes('in person') || q.includes('in-person')) intent.mode = 'offline';
  else if (q.includes('online') || q.includes('virtual') || q.includes('remote')) intent.mode = 'online';
  else if (q.includes('hybrid')) intent.mode = 'hybrid';

  const locations = [...new Set(hackathons.flatMap(h => [h.city, h.state, h.country]).filter(Boolean).map(v => String(v).toLowerCase()))];
  intent.location = locations.find(loc => loc.length >= 3 && q.includes(loc)) || null;

  const topicWords = ['ai', 'ml', 'machine learning', 'web3', 'blockchain', 'cybersecurity', 'security', 'climate', 'health', 'fintech', 'edtech', 'open source', 'mobile', 'frontend', 'backend'];
  intent.topic = topicWords.find(topic => q.includes(topic)) || null;

  return intent;
}

function rankHackathonsForQuestion(hackathons, intent, userProfile) {
  const now = Date.now();
  const skills = compactText(userProfile?.skills, 300).toLowerCase().split(/[,/ ]+/).filter(Boolean);

  return hackathons
    .map(normalizeHackathon)
    .filter(h => h.name)
    .map(h => {
      const haystack = [h.name, h.city, h.state, h.country, h.mode, h.tags.join(' ')].join(' ').toLowerCase();
      const startMs = h.start ? new Date(h.start).getTime() : Number.POSITIVE_INFINITY;
      let score = 0;

      if (Number.isFinite(startMs) && startMs >= now) score += 30;
      if (intent.mode && h.mode === intent.mode) score += 35;
      if (intent.location && haystack.includes(intent.location)) score += 30;
      if (intent.topic && haystack.includes(intent.topic)) score += 25;
      score += skills.filter(skill => skill.length > 2 && haystack.includes(skill)).length * 8;
      if (Number.isFinite(startMs)) score += Math.max(0, 20 - Math.floor((startMs - now) / (1000 * 60 * 60 * 24 * 7)));

      return { ...h, score };
    })
    .sort((a, b) => b.score - a.score || new Date(a.start || 8640000000000000) - new Date(b.start || 8640000000000000))
    .slice(0, 12);
}

function authenticate(req, res, next) {
  const token = req.cookies.authToken || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://hackalert-xwpd.onrender.com'
    : 'http://localhost:3000',
  credentials: true
}));
app.use(helmet({ contentSecurityPolicy: false }));

// Block suspicious headers before other processing
app.use(blockSuspiciousHeaders);

// Limit request body size to 10kb
app.use(express.json({ limit: '10kb' }));

app.use(express.static(__dirname));

// Trust proxy setup for accurate client IP detection behind load balancers/proxies
app.set('trust proxy', 1);

// Global Speed Limiter (Throttling)
app.use(speedLimiter);

// Global Rate Limiter
app.use(globalLimiter);

// Specific Route Rate Limiters
app.use('/ask', aiLimiter);
app.use('/api/ai/ideas', aiLimiter);
app.use('/api/ai/analyze', aiLimiter);
app.use('/api/send-otp', otpLimiter);
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);
app.use('/api/register', authLimiter);

// Password Reset Routes
const bugLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many bug reports submitted. Please wait.' }
});

// Bug Report Routes
app.post('/api/bug-reports', authenticate, bugLimiter, async (req, res) => {
  const { title, description, severity, screenshot_url } = req.body;
  if (!title || !description || !severity) return res.status(400).json({ error: 'Required fields missing' });

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(severity)) return res.status(400).json({ error: 'Invalid severity' });

  try {
    const report = {
      reporter_email: req.user.email,
      title: sanitizeInput(title),
      description: sanitizeInput(description),
      severity,
      screenshot_url: screenshot_url ? sanitizeInput(screenshot_url) : null,
      user_agent: req.headers['user-agent'] || 'Unknown'
    };

    const { data, error } = await supabase.from('bug_reports').insert([report]).select().single();
    if (error) return handleError(res, error);

    res.status(201).json({ message: 'Bug report submitted successfully. Thank you!' });
  } catch (err) {
    handleError(res, err, 'Failed to submit bug report');
  }
});

app.get('/api/bug-reports', authenticate, async (req, res) => {
  // Simple admin check: Only the main developer or authorized emails can view reports
  const adminEmails = [process.env.ADMIN_EMAIL].filter(Boolean);
  if (!adminEmails.includes(req.user.email)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { data, error } = await supabase.from('bug_reports').select('*').order('created_at', { ascending: false });
    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err, 'Failed to fetch bug reports');
  }
});

// Teammates Routes (MVP)
const teammateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, slow down.' }
});

app.post('/api/teammates', authenticate, teammateLimiter, async (req, res) => {
  const { hackathon_name, required_role, tech_stack, experience_level, team_size_remaining, mode, description } = req.body;
  if (!hackathon_name || !required_role || !tech_stack || !experience_level || !team_size_remaining || !mode || !description) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const listing = {
      creator_email: req.user.email,
      hackathon_name: sanitizeInput(hackathon_name),
      required_role: sanitizeInput(required_role),
      tech_stack: sanitizeInput(tech_stack),
      experience_level: sanitizeInput(experience_level),
      team_size_remaining: parseInt(team_size_remaining, 10),
      mode: sanitizeInput(mode),
      description: sanitizeInput(description),
      active: true
    };

    const { data, error } = await supabase.from('teammate_listings').insert([listing]).select().single();
    if (error) return handleError(res, error);
    res.status(201).json(data);
  } catch (err) {
    handleError(res, err, 'Failed to create listing');
  }
});

app.get('/api/teammates', async (req, res) => {
  const { skill, hackathon } = req.query;
  try {
    let query = supabase.from('teammate_listings').select('*').eq('active', true).order('created_at', { ascending: false });

    if (skill) {
      query = query.ilike('tech_stack', `%${sanitizeInput(skill)}%`);
    }
    if (hackathon) {
      query = query.ilike('hackathon_name', `%${sanitizeInput(hackathon)}%`);
    }

    const { data, error } = await query;
    if (error) return handleError(res, error);
    res.json(data);
  } catch (err) {
    handleError(res, err, 'Failed to fetch listings');
  }
});

app.delete('/api/teammates/:id', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.from('teammate_listings')
      .delete()
      .eq('id', req.params.id)
      .eq('creator_email', req.user.email);
    if (error) return handleError(res, error);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    handleError(res, err, 'Failed to delete listing');
  }
});

app.patch('/api/teammates/:id', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.from('teammate_listings')
      .update({ active: false })
      .eq('id', req.params.id)
      .eq('creator_email', req.user.email);
    if (error) return handleError(res, error);
    res.json({ message: 'Listing marked as filled' });
  } catch (err) {
    handleError(res, err, 'Failed to update listing');
  }
});

app.post('/api/forgot-password', emailLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Valid email required' });

  const normalizedEmail = normalizeEmail(email);

  try {
    // 1. Check if user exists (quietly)
    const { data: user } = await supabase.from('users').select('id, name').eq('email', normalizedEmail).single();

    if (user) {
      // 2. Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

      // 3. Store hashed token (Invalidate old ones)
      await supabase.from('password_reset_tokens').delete().eq('user_email', normalizedEmail);
      const { error: dbError } = await supabase.from('password_reset_tokens').insert([{
        user_email: normalizedEmail,
        token_hash: hash,
        expires_at: expiresAt
      }]);

      if (!dbError) {
        // 4. Send email
        const resetLink = `http://${req.get('host')}/realhackito.html?reset_token=${token}`;
        await sendEmail({
          to: normalizedEmail,
          subject: 'Password Reset Request 🔐',
          html: `
            <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2>Password Reset</h2>
              <p>Hi ${user.name},</p>
              <p>You requested to reset your password. Click the button below to proceed. This link expires in 15 minutes.</p>
              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #00f0ff; color: #050508; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Reset Password</a>
              <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee;">
              <p style="font-size: 11px; color: #999;">Link: ${resetLink}</p>
            </div>
          `
        });
      }
    }
  } catch (err) {
    console.error('Forgot password error:', err);
  }

  // Always return the same message to prevent enumeration
  res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Token and a password of at least 8 characters required' });
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    // 1. Find and validate token
    const { data: resetEntry, error: findError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (findError || !resetEntry) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', resetEntry.user_email);

    if (updateError) throw updateError;

    // 4. Delete the used token
    await supabase.from('password_reset_tokens').delete().eq('token_hash', hash);

    res.json({ message: 'Password has been successfully reset' });
  } catch (err) {
    handleError(res, err, 'Failed to reset password');
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/realhackito.html');
});

// ── DAILY DIGEST — runs every day at 10 AM ──
cron.schedule('0 10 * * *', async () => {
  console.log('Running daily hackathon digest...');
  if (!process.env.BREVO_API_KEY) return;

  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const upcoming = [];

  // Also get from HackClub
  let hackClubUpcoming = [];
  try {
    const hc = await fetch('https://hackathons.hackclub.com/api/events/upcoming').then(r => r.json());
    hackClubUpcoming = hc.filter(h => {
      const start = new Date(h.start);
      return start >= new Date() && start <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }).slice(0, 10);
  } catch (e) { }

  const allUpcoming = [...hackClubUpcoming];
  if (!allUpcoming.length) return;

  // Get all users
  const { data: users } = await supabase.from('users').select('email, name');
  if (!users?.length) return;

  const hackList = allUpcoming.slice(0, 15).map(h => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #1a1a2e;">
        <strong style="color:#00f0ff;">${escapeEmailHTML(h.name || '')}</strong><br>
        <span style="color:#b9cacb;font-size:12px;">📅 ${new Date(h.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        ${h.city ? `<span style="color:#b9cacb;font-size:12px;"> · 📍 ${escapeEmailHTML(h.city)}</span>` : ''}
      </td>
      <td style="padding:12px;border-bottom:1px solid #1a1a2e;text-align:right;">
        <a href="${escapeEmailHTML(h.website || h.url || '#')}" 
           style="background:#00f0ff;color:#050508;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700;">
          Register →
        </a>
      </td>
    </tr>
  `).join('');

  // Send to each user
  for (const user of users) {
    try {
      await sendEmail({
        to: user.email,
        subject: `⚡ ${allUpcoming.length} Hackathons Coming Up — Daily Digest`,
        html: `
          <div style="font-family:monospace;background:#0e0e0e;color:#e5e2e1;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;">
            <h2 style="color:#00f0ff;margin-bottom:4px;">Hack/Alert ⚡</h2>
            <p style="color:#b9cacb;font-size:13px;margin-bottom:24px;">Daily digest for ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h3 style="color:#fff;margin-bottom:16px;">🚀 ${allUpcoming.length} Hackathons in the next 30 days</h3>
            <table style="width:100%;border-collapse:collapse;">
              ${hackList}
            </table>
            <div style="margin-top:32px;text-align:center;">
              <a href="https://hackalert-xwpd.onrender.com" 
                 style="background:#00f0ff;color:#050508;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
                View All Hackathons →
              </a>
            </div>
            <p style="color:#555;font-size:11px;margin-top:24px;text-align:center;">
              You're receiving this because you have a Hack/Alert account.<br>
              <a href="https://hackalert-xwpd.onrender.com" style="color:#555;">Manage preferences</a>
            </p>
          </div>
        `
      });
    } catch (e) {
      console.error(`Digest email failed for ${user.email}:`, e.message);
    }
  }
  console.log(`Digest sent to ${users.length} users`);
});

// ── NEW HACKATHON ALERT — runs every hour ──
cron.schedule('0 * * * *', async () => {
  if (!process.env.BREVO_API_KEY) return;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Check for hackathons added in last hour
  const { data: newHacks } = await supabase
    .from('indian_hackathons')
    .select('*')
    .gte('created_at', oneHourAgo);

  if (!newHacks?.length) return;

  const { data: users } = await supabase.from('users').select('email, name');
  if (!users?.length) return;

  const hackList = newHacks.map(h => `
    <div style="background:#0a0a1a;border:1px solid #00f0ff33;border-radius:10px;padding:16px;margin-bottom:12px;">
      <h4 style="color:#00f0ff;margin:0 0 8px;">${escapeEmailHTML(h.name || '')}</h4>
      <p style="color:#b9cacb;font-size:13px;margin:4px 0;">📅 ${new Date(h.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      ${h.city ? `<p style="color:#b9cacb;font-size:13px;margin:4px 0;">📍 ${escapeEmailHTML(h.city)}, ${escapeEmailHTML(h.country || '')}</p>` : ''}
      <a href="${escapeEmailHTML(h.website || '#')}" style="display:inline-block;margin-top:10px;background:#00f0ff;color:#050508;padding:6px 16px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:700;">Register →</a>
    </div>
  `).join('');

  for (const user of users) {
    try {
      await sendEmail({
        to: user.email,
        subject: `🆕 ${newHacks.length} New Hackathon${newHacks.length > 1 ? 's' : ''} Just Listed on Hack/Alert!`,
        html: `
          <div style="font-family:monospace;background:#0e0e0e;color:#e5e2e1;padding:40px;border-radius:12px;max-width:600px;margin:0 auto;">
            <h2 style="color:#00f0ff;margin-bottom:4px;">Hack/Alert ⚡</h2>
            <p style="color:#b9cacb;font-size:13px;margin-bottom:24px;">New hackathons just dropped!</p>
            <h3 style="color:#fff;margin-bottom:16px;">🆕 ${newHacks.length} New Hackathon${newHacks.length > 1 ? 's' : ''}</h3>
            ${hackList}
            <div style="margin-top:24px;text-align:center;">
              <a href="https://hackalert-xwpd.onrender.com" 
                 style="background:#00f0ff;color:#050508;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
                View All →
              </a>
            </div>
          </div>
        `
      });
    } catch (e) {
      console.error(`New hack alert failed for ${user.email}:`, e.message);
    }
  }
  console.log(`New hackathon alert sent to ${users.length} users`);
});

// ── HACKATHON SYNC — runs every 4 hours ──
async function syncHackathons() {
  console.log('🔄 Syncing hackathons to cache...');
  try {
    const hackClubRes = await fetch('https://hackathons.hackclub.com/api/events/upcoming');
    const hackClub = await hackClubRes.json();

    const myCustomHackathons = [
      { name: "Smart Horizon 2026 International Hackathon", start: "2026-09-03", city: "Bengaluru", country: "India", virtual: false, hybrid: false, website: "https://newhorizonindia.edu/" },
      { name: "PSB's Cybersecurity, Fraud & AI Hackathon", start: "2026-08-27", city: "Hyderabad", country: "India", virtual: false, hybrid: true, website: "https://boihackathon.cse.iith.ac.in/hackathon2026/" },
      { name: "India Food Systems Transformation Hackathon 2026", start: "2026-08-01", city: "Bengaluru", country: "India", virtual: false, hybrid: true, website: "https://www.tdu.edu.in/outreach/india-food-systems-transformation-hackathon-2026" },
      { name: "Ocean Hackathon® 2026 (India Edition)", start: "2026-10-16", city: "Chennai", country: "India", virtual: false, hybrid: false, website: "https://www.campusmer.fr/ocean-hackathon" },
      { name: "2026 Data, AI & Policy APAC Hackathon", start: "2026-09-26", city: "", country: "India", virtual: true, hybrid: false, website: "https://www.apru.org/event/2026-hackathon-financial-health-frontiers/" },
      { name: "Tech Horizon 2.0 National Hackathon", start: "2026-11-13", city: "Hyderabad", country: "India", virtual: false, hybrid: false, website: "https://www.gniindia.org/" },
      { name: "Great Indian Hackathon 2026", start: "2026-11-01", city: "", country: "India", virtual: true, hybrid: false, website: "https://sahrdaya.ac.in/" },
      { name: "CODEX 2026 AI Hackathon", start: "2026-06-13", city: "", country: "India", virtual: true, hybrid: false, website: "https://www.codexbitblaze.in/" },
      { name: "MLH Global Hack Week: Build 2026", start: "2026-06-12", city: "", country: "India", virtual: true, hybrid: false, website: "https://ghw.mlh.io/" },
      { name: "MLH Agents Hack Week", start: "2026-08-07", city: "", country: "India", virtual: true, hybrid: false, website: "https://ghw.mlh.io/" },
      { name: "Solution Challenge 2026", start: "2026-06-20", city: "", country: "India", virtual: true, hybrid: false, website: "https://developers.google.com/community/gdsc-solution-challenge" },
      { name: "Build with AI: PromptWars", start: "2026-10-10", city: "New Delhi", country: "India", virtual: false, hybrid: false, website: "https://hack2skill.com/" },
      { name: "Gen AI Academy APAC Hackathon", start: "2026-05-28", city: "Bengaluru", country: "India", virtual: false, hybrid: true, website: "https://hack2skill.com/" },
      { name: "Robotics Innovation Hackathon 2026", start: "2026-11-05", city: "Hyderabad", country: "India", virtual: false, hybrid: false, website: "https://icmacc.org/" },
      { name: "Agri-Excellence Hackathon 2026", start: "2026-07-01", city: "Kolkata", country: "India", virtual: false, hybrid: true, website: "https://agriexcellence.in/hackathon" },
      { name: "Tata Steel AI Hackathon 2026", start: "2026-06-01", city: "", country: "India", virtual: true, hybrid: false, website: "https://www.hackerearth.com/community/challenges/competitive/tata-steel-ai-hackathon/" },
      { name: "Flying Wings 2026: National Level Hackathon", start: "2026-07-17", city: "Jodhpur", country: "India", virtual: false, hybrid: false, website: "https://www.iitj.ac.in/flying-wings" },
      { name: "PSBs National Hackathon on Cyber Security", start: "2026-07-17", city: "Allahabad", country: "India", virtual: false, hybrid: false, website: "https://www.mnnit.ac.in/hackathon2026/" },
      { name: "Health Hackathon 2026", start: "2026-10-15", city: "Bhopal", country: "India", virtual: false, hybrid: false, website: "https://vitbhopal.ac.in/ibcd2026/" },
      { name: "5G Innovation Hackathon 2026", start: "2026-09-14", city: "New Delhi", country: "India", virtual: false, hybrid: true, website: "https://www.preprodeservices.dot.gov.in/5ghackathon/" }
    ];

    const supabaseRes = await supabase.from('indian_hackathons').select('*');
    const indianDb = supabaseRes.data || [];

    const all = [...hackClub, ...indianDb, ...myCustomHackathons];
    const seen = new Set();
    const unique = all.filter(h => {
      if (!h || !h.name) return false;
      const key = h.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Cache in global variable for immediate use
    globalHackathons = unique;

    // Optional: Sync to a 'hackathon_cache' table if you want persistence across restarts
    // await supabase.from('hackathon_cache').delete().neq('id', 0);
    // await supabase.from('hackathon_cache').insert(unique);

    console.log(`✅ Cached ${unique.length} hackathons`);
  } catch (err) {
    console.error("Hackathon sync error:", err);
  }
}

cron.schedule('0 */4 * * *', syncHackathons);
// Run on startup
syncHackathons();

app.get('/api/hackathons', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hackathons_cache')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) throw error;

    const mapped = (data || []).map(h => ({
      name: h.name,
      start: h.start_date,
      end: h.end_date,
      city: h.city,
      country: h.country,
      website: h.website,
      virtual: h.virtual,
      hybrid: h.hybrid,
      banner: h.banner,
      logo: h.logo
    }));

    globalHackathons = mapped;
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hackathons' });
  }
});

app.post('/ask', async (req, res) => {
  const { messages, user_profile } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  const censoredMessages = messages
    .filter(msg => msg && ['user', 'assistant'].includes(msg.role) && typeof msg.content === 'string')
    .slice(-12)
    .map(msg => ({
      role: msg.role,
      content: censorMessage(compactText(msg.content, 1200))
    }));

  if (!censoredMessages.length) {
    return res.status(400).json({ error: 'No valid messages provided' });
  }

  const lastMsg = censoredMessages[censoredMessages.length - 1].content.toLowerCase();
  let action = null, payload = null;

  if (globalHackathons.length === 0) {
    try {
      const [hackClub, supabaseRes] = await Promise.all([
        fetch('https://hackathons.hackclub.com/api/events/upcoming').then(r => r.json()),
        supabase.from('indian_hackathons').select('*')
      ]);
      const all = [...hackClub, ...(supabaseRes.data || [])];
      const seen = new Set();
      globalHackathons = all.filter(h => { const key = h.name.toLowerCase().trim(); if (seen.has(key)) return false; seen.add(key); return true; });
    } catch (e) { console.warn('Could not prefetch hackathons:', e.message); }
  }

  const profile = {
    name: compactText(user_profile?.name, 80) || 'Not provided',
    skills: compactText(user_profile?.skills, 300) || 'Not specified',
    college: compactText(user_profile?.college, 160) || 'Not specified',
    bio: compactText(user_profile?.bio, 300) || 'Not specified'
  };
  const intent = detectHackathonIntent(lastMsg, globalHackathons);
  const relevantHackathons = rankHackathonsForQuestion(globalHackathons, intent, profile);
  const upcomingHackathons = globalHackathons
    .map(normalizeHackathon)
    .filter(h => h.name && h.start && new Date(h.start).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 8);

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.45,
      max_tokens: 420,
      tools: [
        {
          type: "function",
          function: {
            name: "trigger_ui_action",
            description: "ONLY call this when the user explicitly asks to be navigated to a different page (e.g., 'take me to the dashboard'). Do NOT call this for searching, filtering, or asking about hackathons.",
            parameters: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["navigate", "filter"], description: "navigate = go to a page, filter = filter by mode" },
                payload: { type: "string", description: "Target page. Must be one of: dashboard, teams, projects, profile, saved, online, offline, hybrid" }
              },
              required: ["action", "payload"]
            }
          }
        }
      ],
      tool_choice: "auto",
      messages: [
        {
          role: 'system', content: `You are HackBot, the AI assistant inside HackAlert.
Goals:
- Help users discover hackathons, form teams, and answer cybersecurity/tech questions.
- For conversational greetings (like "hello", "how are you"), ALWAYS reply warmly in plain text WITHOUT using any tools.
- If the user asks about hackathons (e.g. "Hackathons in India", "AI hackathons"), provide the details directly in your text response using the <context_data>. Do NOT call trigger_ui_action for this.
- ONLY call trigger_ui_action if the user issues a direct navigation command like "take me to the dashboard".
- If you call a tool, do NOT output conversational text announcing it. Let the UI handle it.
- Keep answers concise (under 50 words) unless asked for details.

<user_profile>
${JSON.stringify(profile)}
</user_profile>

<context_data>
Intent: ${JSON.stringify(intent)}
Relevant Hackathons: ${JSON.stringify(relevantHackathons).substring(0, 1000)}
Upcoming Fallback: ${JSON.stringify(upcomingHackathons).substring(0, 1000)}
</context_data>`
        },
        ...censoredMessages
      ]
    });

    const msgObj = response.choices[0].message;
    if (msgObj.tool_calls && msgObj.tool_calls.length > 0) {
      const toolCall = msgObj.tool_calls[0];
      if (toolCall.function.name === 'trigger_ui_action') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          action = args.action;
          payload = args.payload;
        } catch (e) { }
      }
    }

    const reply = msgObj.content || (action === 'navigate' ? `Taking you to ${payload}!` : (action === 'filter' ? `Filtering by ${payload}!` : "Done."));
    res.json({ answer: reply, action, payload });
  } catch (err) {
    res.status(500).json({ error: 'AI error: ' + err.message });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        text,
        model_id: 'eleven_multilingual_v2'
      },
      responseType: 'arraybuffer'
    });

    res.set({
      'Content-Type': 'audio/mpeg'
    });

    res.send(response.data);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

app.post('/api/send-otp', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
  if (!process.env.BREVO_API_KEY) return res.status(500).json({ error: 'Email service not configured' });

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000);

  await supabase.from('email_otps').delete().eq('email', email);

  const { error } = await supabase.from('email_otps').insert([{
    email,
    otp,
    expires_at: expires_at.toISOString(),
    used: false
  }]);

  if (error) return res.status(500).json({ error: 'Failed to generate OTP' });

  try {
    await sendEmail({
      to: email,
      subject: 'Your HackAlert verification code',
      html: `
        <div style="font-family:monospace;background:#0e0e0e;color:#e5e2e1;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
          <h2 style="color:#00f0ff;margin-bottom:8px;">Hack/Alert ⚡</h2>
          <p style="color:#b9cacb;margin-bottom:24px;">Your verification code:</p>
          <div style="font-size:48px;font-weight:700;color:#00f0ff;letter-spacing:12px;margin-bottom:24px;">${otp}</div>
          <p style="color:#b9cacb;font-size:13px;">Expires in 10 minutes. Don't share this with anyone.</p>
        </div>
      `
    });
    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('Brevo email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || '').trim();
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Invalid OTP' });

  const { data, error } = await supabase
    .from('email_otps')
    .select('*')
    .eq('email', email)
    .eq('otp', otp)
    .eq('used', false)
    .single();

  if (error || !data) return res.status(400).json({ error: 'Invalid OTP' });

  if (new Date(data.expires_at) < new Date()) {
    return res.status(400).json({ error: 'OTP expired. Request a new one.' });
  }

  await supabase.from('email_otps').update({ used: true }).eq('id', data.id);

  res.json({ verified: true });
});

app.post('/api/signup', async (req, res) => {
  const { pass, gender } = req.body;

  const name = sanitizeInput(req.body.name);
  const mobile = sanitizeInput(req.body.mobile);
  const college = sanitizeInput(req.body.college);
  const username = sanitizeInput(req.body.username);
  const bio = sanitizeInput(req.body.bio);
  const skills = sanitizeInput(req.body.skills);

  const email = normalizeEmail(req.body.email);
  if (!name || !email || !pass || !username) return res.status(400).json({ error: 'Name, Email, Password and Username are required.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email' });
  const { data: verifiedOtp } = await supabase
    .from('email_otps')
    .select('id, expires_at')
    .eq('email', email)
    .eq('used', true)
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!verifiedOtp) return res.status(403).json({ error: 'Please verify your email before signup.' });
  const { data: existing } = await supabase.from('users').select('username').eq('username', username).single();
  if (existing) return res.status(400).json({ error: 'Username already taken.' });
  const hashed = await bcrypt.hash(pass, 10);
  const { error } = await supabase.from('users').insert([{ name, email, password: hashed, mobile, college, username, gender, bio, skills }]);
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    return handleError(res, error);
  }
  await supabase.from('email_otps').delete().eq('email', email);
  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to Hack/Alert ⚡',
      html: `
        <div style="font-family:monospace;background:#0e0e0e;color:#e5e2e1;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
          <h2 style="color:#00f0ff;">Welcome, ${escapeEmailHTML(name)}! ⚡</h2>
          <p style="color:#b9cacb;">You're now part of 18,000+ devs tracking hackathons.</p>
          <a href="https://hackalert-xwpd.onrender.com" style="display:inline-block;margin-top:24px;background:#00f0ff;color:#050508;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Browse Hackathons →</a>
        </div>
      `
    });
  } catch (e) {
    console.error('Welcome email failed:', e.message);
  }
  const token = jwt.sign({ email, name, username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.status(201).json({ message: 'Signup successful' });
});

app.post('/api/login', async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) return res.status(400).json({ error: 'Fields required' });
  const { data, error } = await supabase.from('users').select('id, name, email, password, mobile, college, username, gender, bio, skills').eq('email', email).single();
  if (error || !data) return res.status(401).json({ error: 'Invalid email or password' });
  const match = await bcrypt.compare(pass, data.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ email: data.email, name: data.name, username: data.username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.json({ message: 'Login successful', user: { name: data.name, email: data.email, username: data.username, gender: data.gender, bio: data.bio, skills: data.skills, mobile: data.mobile, college: data.college } });
});

app.get('/api/teams', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) return handleError(res, error);
  res.json(data);
});

app.get('/api/teams/:id', async (req, res) => {
  const { data, error } = await supabase.from('teams').select('*').eq('id', req.params.id).single();
  if (error) return handleError(res, error);
  res.json(data);
});

app.post('/api/teams', authenticate, async (req, res) => {
  const { name, hackathon, skills, size } = req.body;
  const leader_email = req.user.email;
  if (!name) return res.status(400).json({ error: 'Team name required' });
  const { data, error } = await supabase.rpc('create_team_with_leader', {
    p_name: name,
    p_leader_email: leader_email,
    p_hackathon: hackathon || null,
    p_skills: skills || null,
    p_size: size || 4
  });
  if (error) return handleError(res, error);
  res.json(data);
});

app.post('/api/teams/:id/members', authenticate, async (req, res) => {
  const { error } = await supabase.rpc('join_team', {
    team_id_input: parseInt(req.params.id),
    user_email_input: req.user.email,
    user_name_input: req.user.name
  });
  if (error) {
    if (error.message.includes('Team is full')) return res.status(400).json({ error: 'Team full' });
    return res.status(400).json({ error: error.message });
  }
  res.json({ message: 'Joined successfully' });
});

app.get('/api/teams/:id/messages', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  const { data, error } = await supabase.from('team_messages').select('*').eq('team_id', id).order('sent_at', { ascending: true });
  if (error) return handleError(res, error);
  res.json(data);
});

app.get('/api/teams/:id/stream', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  if (!teamClients[id]) teamClients[id] = [];
  teamClients[id].push(res);
  req.on('close', () => { teamClients[id] = teamClients[id].filter(c => c !== res); });
});

app.post('/api/teams/:id/messages', authenticate, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const sender_email = req.user.email;
  const sender_name = req.user.name;

  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', id).eq('user_email', sender_email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  if (!message) return res.status(400).json({ error: 'Empty message' });

  const sanitizedMessage = sanitizeInput(message);

  if (bannedWords.some(w => sanitizedMessage.toLowerCase().includes(w))) return res.status(400).json({ error: 'Message contains inappropriate language' });
  const newMessage = { team_id: id, sender_email, sender_name, message: sanitizedMessage };
  const { data, error } = await supabase.from('team_messages').insert([newMessage]).select().single();
  if (error) return handleError(res, error);
  if (teamClients[id]) teamClients[id].forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));
  res.json({ message: 'Sent' });
});

app.get('/api/teams/:id/tasks', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  const { data, error } = await supabase.from('team_tasks').select('*').eq('team_id', id).order('created_at', { ascending: true });
  if (error) return handleError(res, error);
  res.json(data || []);
});

app.post('/api/teams/:id/tasks', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, status } = req.body;
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });
  const { data, error } = await supabase.from('team_tasks').insert([{ team_id: id, title, status }]).select().single();
  if (error) return handleError(res, error);
  res.json(data);
});

app.put('/api/teams/:team_id/tasks/:task_id', authenticate, async (req, res) => {
  const { status } = req.body;
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', req.params.team_id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });
  const { data, error } = await supabase.from('team_tasks').update({ status }).eq('id', req.params.task_id).eq('team_id', req.params.team_id).select().single();
  if (error || !data) return res.status(404).json({ error: 'Task not found in this team' });
  res.json(data);
});

app.delete('/api/teams/:team_id/tasks/:task_id', authenticate, async (req, res) => {
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', req.params.team_id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });
  const { data: task } = await supabase.from('team_tasks').select('id').eq('id', req.params.task_id).eq('team_id', req.params.team_id).single();
  if (!task) return res.status(404).json({ error: 'Task not found in this team' });
  const { error } = await supabase.from('team_tasks').delete().eq('id', req.params.task_id);
  if (error) return handleError(res, error);
  res.json({ message: 'Deleted' });
});

app.get('/api/teams/:id/members', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  const { data, error } = await supabase.from('team_members').select('*').eq('team_id', id);
  if (error) return handleError(res, error);
  res.json(data);
});

app.delete('/api/teams/:team_id/members/:user_email', authenticate, async (req, res) => {
  const { team_id } = req.params;
  const user_email = req.user.email;
  const { data: team, error: teamError } = await supabase.from('teams').select('leader_email, slots_left').eq('id', team_id).single();
  if (teamError || !team) return res.status(404).json({ error: 'Team not found' });
  if (team.leader_email === user_email) return res.status(403).json({ error: 'Leader cannot leave. Delete the team instead.' });
  const { error: deleteError } = await supabase.from('team_members').delete().eq('team_id', team_id).eq('user_email', user_email);
  if (deleteError) return res.status(500).json({ error: deleteError.message });
  await supabase.from('teams').update({ slots_left: team.slots_left + 1 }).eq('id', team_id);
  res.json({ message: 'Successfully left the team' });
});

app.delete('/api/teams/:team_id', authenticate, async (req, res) => {
  const { team_id } = req.params;
  const leader_email = req.user.email;
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

app.get('/api/projects', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const { data, error } = await supabase
    .from('team_projects')
    .select('*, teams(name, hackathon)')
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) return handleError(res, error);
  res.json(data || []);
});

app.get('/api/teams/:id/project', authenticate, async (req, res) => {
  const { id } = req.params;
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', id).eq('user_email', req.user.email).single();
  if (!member) return res.status(403).json({ error: 'Not a team member' });

  const { data, error } = await supabase.from('team_projects').select('*').eq('team_id', id).single();
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
  res.json(data || null);
});

app.post('/api/teams/:id/project', authenticate, async (req, res) => {
  const title = sanitizeInput(req.body.title);
  const description = sanitizeInput(req.body.description);
  const github_link = sanitizeInput(req.body.github_link);
  const demo_link = sanitizeInput(req.body.demo_link);
  const tech_stack = sanitizeInput(req.body.tech_stack);

  const team_id = req.params.id;
  const submitted_by = req.user.email;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const { data: member } = await supabase.from('team_members').select('*').eq('team_id', team_id).eq('user_email', submitted_by).single();
  if (!member) return res.status(403).json({ error: 'Only team members can submit a project' });
  const { data, error } = await supabase.from('team_projects').upsert([{ team_id, title, description, github_link, demo_link, tech_stack, submitted_by }], { onConflict: 'team_id' }).select().single();
  if (error) return handleError(res, error);
  res.json(data);
});

app.delete('/api/teams/:id/project', authenticate, async (req, res) => {
  const team_id = req.params.id;
  const user_email = req.user.email;
  const { data: team } = await supabase.from('teams').select('leader_email').eq('id', team_id).single();
  if (!team || team.leader_email !== user_email) return res.status(403).json({ error: 'Only team leader can delete the project' });
  const { error } = await supabase.from('team_projects').delete().eq('team_id', team_id);
  if (error) return handleError(res, error);
  res.json({ message: 'Project deleted' });
});

app.get('/api/reviews/:hackathon_name', async (req, res) => {
  const name = decodeURIComponent(req.params.hackathon_name);
  const { data, error } = await supabase.from('hackathon_reviews').select('*').eq('hackathon_name', name).order('created_at', { ascending: false });
  if (error) return handleError(res, error);
  res.json(data || []);
});

app.post('/api/reviews', authenticate, async (req, res) => {
  const { hackathon_name, rating, review } = req.body;
  const user_email = req.user.email;
  if (!hackathon_name || !rating) return res.status(400).json({ error: 'Name and rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
  const { data, error } = await supabase.from('hackathon_reviews').upsert([{ hackathon_name, user_email, rating, review }], { onConflict: 'hackathon_name,user_email' }).select().single();
  if (error) return handleError(res, error);
  res.json(data);
});

app.delete('/api/reviews/:hackathon_name', authenticate, async (req, res) => {
  const name = decodeURIComponent(req.params.hackathon_name);
  const user_email = req.user.email;
  const { error } = await supabase.from('hackathon_reviews').delete().eq('hackathon_name', name).eq('user_email', user_email);
  if (error) return handleError(res, error);
  res.json({ message: 'Review deleted' });
});

app.post('/api/saved', authenticate, async (req, res) => {
  const { hackathon_name, hackathon_start, hackathon_website } = req.body;
  const user_email = req.user.email;
  const { error } = await supabase.from('saved_hackathons').upsert([{ user_email, hackathon_name, hackathon_start, hackathon_website }], { onConflict: 'user_email,hackathon_name' });
  if (error) return handleError(res, error);
  res.json({ message: 'Saved' });
});

app.delete('/api/saved/:name', authenticate, async (req, res) => {
  const user_email = req.user.email;
  const hackathon_name = decodeURIComponent(req.params.name);
  const { error } = await supabase.from('saved_hackathons').delete().eq('user_email', user_email).eq('hackathon_name', hackathon_name);
  if (error) return handleError(res, error);
  res.json({ message: 'Removed' });
});

app.get('/api/saved', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('saved_hackathons').select('*').eq('user_email', req.user.email);
  if (error) return handleError(res, error);
  res.json(data);
});

app.get('/api/users/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  const { data, error } = await supabase.from('users').select('name, email, username, gender, bio, skills, college').ilike('username', `%${q}%`).neq('email', req.user.email).limit(10);
  if (error) return handleError(res, error);
  res.json(data || []);
});

app.post('/api/friends/request', authenticate, async (req, res) => {
  const { to_email } = req.body;
  const from_email = req.user.email;
  if (!to_email) return res.status(400).json({ error: 'to_email required' });
  if (to_email === from_email) return res.status(400).json({ error: 'Cannot add yourself' });
  const { data: existing } = await supabase.from('friendships').select('*').or(`and(user1_email.eq.${from_email},user2_email.eq.${to_email}),and(user1_email.eq.${to_email},user2_email.eq.${from_email})`).single();
  if (existing) return res.status(400).json({ error: 'Already friends' });
  const { error } = await supabase.from('friend_requests').upsert([{ from_email, to_email, status: 'pending' }], { onConflict: 'from_email,to_email' });
  if (error) return handleError(res, error);
  res.json({ message: 'Friend request sent' });
});

app.get('/api/friends/requests', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('friend_requests').select('*').eq('to_email', req.user.email).eq('status', 'pending');
  if (error) return handleError(res, error);
  res.json(data || []);
});

app.put('/api/friends/requests/:id', authenticate, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  const { data: request } = await supabase.from('friend_requests').select('*').eq('id', id).eq('to_email', req.user.email).single();
  if (!request) return res.status(404).json({ error: 'Request not found' });
  await supabase.from('friend_requests').update({ status }).eq('id', id);
  if (status === 'accepted') {
    await supabase.from('friendships').upsert([{ user1_email: request.from_email, user2_email: request.to_email }], { onConflict: 'user1_email,user2_email' });
  }
  res.json({ message: `Request ${status}` });
});

app.get('/api/friends', authenticate, async (req, res) => {
  const email = req.user.email;
  const { data, error } = await supabase.from('friendships').select('*').or(`user1_email.eq.${email},user2_email.eq.${email}`);
  if (error) return handleError(res, error);
  const friendEmails = (data || []).map(f => f.user1_email === email ? f.user2_email : f.user1_email);
  if (!friendEmails.length) return res.json([]);
  const { data: friends } = await supabase.from('users').select('name, email, username, gender, bio, skills, college').in('email', friendEmails);
  res.json(friends || []);
});

app.delete('/api/friends/:friend_email', authenticate, async (req, res) => {
  const email = req.user.email;
  const friend_email = decodeURIComponent(req.params.friend_email);
  await supabase.from('friendships').delete().or(`and(user1_email.eq.${email},user2_email.eq.${friend_email}),and(user1_email.eq.${friend_email},user2_email.eq.${email})`);
  res.json({ message: 'Friend removed' });
});

app.get('/api/dm/conversations', authenticate, async (req, res) => {
  const email = req.user.email;
  const { data, error } = await supabase.from('direct_messages').select('*').or(`from_email.eq.${email},to_email.eq.${email}`).order('created_at', { ascending: false });
  if (error) return handleError(res, error);
  const conversations = {};
  (data || []).forEach(msg => {
    const partner = msg.from_email === email ? msg.to_email : msg.from_email;
    if (!conversations[partner]) conversations[partner] = { partner_email: partner, last_message: msg.message, last_time: msg.created_at, unread: 0 };
    if (msg.to_email === email && !msg.seen) conversations[partner].unread++;
  });
  const partnerEmails = Object.keys(conversations);
  if (!partnerEmails.length) return res.json([]);
  const { data: users } = await supabase.from('users').select('name, email, username, gender').in('email', partnerEmails);
  const result = Object.values(conversations).map(conv => ({ ...conv, partner: users?.find(u => u.email === conv.partner_email) || { email: conv.partner_email, name: conv.partner_email } }));
  res.json(result);
});

app.get('/api/dm/:partner_email', authenticate, async (req, res) => {
  const email = req.user.email;
  const partner = decodeURIComponent(req.params.partner_email);
  const { data, error } = await supabase.from('direct_messages').select('*').or(`and(from_email.eq.${email},to_email.eq.${partner}),and(from_email.eq.${partner},to_email.eq.${email})`).order('created_at', { ascending: true });
  if (error) return handleError(res, error);
  await supabase.from('direct_messages').update({ seen: true }).eq('to_email', email).eq('from_email', partner).eq('seen', false);
  res.json(data || []);
});

app.post('/api/dm/:partner_email', authenticate, async (req, res) => {
  const from_email = req.user.email;
  const to_email = decodeURIComponent(req.params.partner_email);
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const { data: friendship } = await supabase.from('friendships').select('*').or(`and(user1_email.eq.${from_email},user2_email.eq.${to_email}),and(user1_email.eq.${to_email},user2_email.eq.${from_email})`).single();
  if (!friendship) return res.status(403).json({ error: 'You can only DM friends' });
  const { data, error } = await supabase.from('direct_messages').insert([{ from_email, to_email, message, seen: false }]).select().single();
  if (error) return handleError(res, error);
  const dmKey = [from_email, to_email].sort().join('::');
  if (dmClients[dmKey]) dmClients[dmKey].forEach(c => c.write(`data: ${JSON.stringify(data)}\n\n`));
  res.json(data);
});

app.put('/api/dm/:partner_email/seen', authenticate, async (req, res) => {
  const email = req.user.email;
  const partner = decodeURIComponent(req.params.partner_email);
  await supabase.from('direct_messages').update({ seen: true }).eq('to_email', email).eq('from_email', partner);
  const dmKey = [email, partner].sort().join('::');
  if (dmClients[dmKey]) dmClients[dmKey].forEach(c => c.write(`data: ${JSON.stringify({ type: 'seen', from: email })}\n\n`));
  res.json({ message: 'Marked seen' });
});

app.get('/api/dm/:partner_email/stream', authenticate, (req, res) => {
  const email = req.user.email;
  const partner = decodeURIComponent(req.params.partner_email);
  const dmKey = [email, partner].sort().join('::');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  if (!dmClients[dmKey]) dmClients[dmKey] = [];
  dmClients[dmKey].push(res);
  req.on('close', () => { dmClients[dmKey] = dmClients[dmKey].filter(c => c !== res); });
});

app.post('/api/ai/ideas', authenticate, async (req, res) => {
  const { theme, problem, level, duration, skills } = req.body;
  if (!theme) return res.status(400).json({ error: 'Theme is required' });
  try {
    const prompt = `You are an expert hackathon mentor. Generate exactly 5 unique project ideas for a hackathon.\n\nHackathon Theme: ${theme}\nProblem Statement: ${problem || 'Not specified'}\nDifficulty Level: ${level}\nDuration: ${duration} hours\nTeam Skills: ${skills || 'General programming'}\n\nReturn ONLY a valid JSON object with an "ideas" array:\n{\n  "ideas": [\n    {\n      "title": "Project Name",\n      "tagline": "One line description",\n      "description": "2-3 sentence description",\n      "tech_stack": ["Tech1", "Tech2"],\n      "winning_potential": 85,\n      "innovation_score": 90,\n      "feasibility_score": 75,\n      "wow_factor": "What makes judges love this",\n      "mvp_features": ["Feature 1", "Feature 2"]\n    }\n  ]\n}`;
    const response = await client.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, max_tokens: 2000, temperature: 0.8 });
    const raw = response.choices[0].message.content;
    res.json({ ideas: JSON.parse(raw).ideas });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate ideas: ' + err.message });
  }
});

app.post('/api/ai/analyze', authenticate, async (req, res) => {
  const { name, details, skills } = req.body;
  if (!details) return res.status(400).json({ error: 'Hackathon details required' });
  try {
    const prompt = `You are an expert hackathon analyst. Analyze this hackathon.\n\nName: ${name || 'Unknown'}\nDetails: ${details}\nUser Skills: ${skills || 'Not specified'}\n\nReturn ONLY a valid JSON object with an "analysis" key containing the following structure:\n{\n  "analysis": {\n    "overall_difficulty": "Easy/Medium/Hard/Expert",\n    "difficulty_score": 75,\n    "required_skills": ["Skill 1"],\n    "skill_match_percentage": 60,\n    "preparation_time_days": 7,\n    "winning_chances": "Medium",\n    "winning_percentage": 35,\n    "key_challenges": ["Challenge 1"],\n    "advantages": ["Advantage 1"],\n    "recommended_stack": ["Tech 1"],\n    "preparation_plan": ["Day 1-2: ..."],\n    "verdict": "2-3 sentence verdict"\n  }\n}`;
    const response = await client.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, max_tokens: 1500, temperature: 0.3 });
    const raw = response.choices[0].message.content;
    res.json({ analysis: JSON.parse(raw).analysis });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze: ' + err.message });
  }
});

app.post('/api/teams/match', authenticate, async (req, res) => {
  const { user_skills } = req.body;
  if (!user_skills?.trim()) return res.status(400).json({ error: 'Provide your skills.' });
  const { data: teams } = await supabase.from('teams').select('id, name, hackathon, skills, slots_left, size, leader_email').gt('slots_left', 0);
  if (!teams?.length) return res.status(200).json({ matches: [], message: 'No open teams found.' });
  try {
    const prompt = `You are a team matchmaking engine.\n\nUser skills: "${user_skills}"\n\nOpen teams: ${JSON.stringify(teams.map(t => ({ id: t.id, name: t.name, hackathon: t.hackathon, looking_for: t.skills, slots_left: t.slots_left })))}\n\nReturn ONLY a JSON array of top 3 matches:\n[\n  {\n    "id": <team_id>,\n    "name": "<team_name>",\n    "match_score": <0-100>,\n    "reason": "<one sentence why>"\n  }\n]`;
    const response = await client.chat.completions.create({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 500, temperature: 0.3 });
    const raw = response.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const matches = JSON.parse(raw);
    const enriched = matches.map(m => ({ ...m, ...teams.find(t => t.id === m.id) }));
    res.json({ matches: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Matchmaking failed: ' + err.message });
  }
});

app.post('/api/ping', authenticate, async (req, res) => {
  await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('email', req.user.email);
  res.json({ ok: true });
});

app.get('/api/users/online', authenticate, async (req, res) => {
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await supabase.from('users').select('email, last_seen').gte('last_seen', twoMinsAgo);
  res.json((data || []).map(u => u.email));
});

app.get('/debug-env', (req, res) => {
  res.json({ has_groq: !!process.env.GROQ_API_KEY, has_jwt: !!process.env.JWT_SECRET, has_supabase_url: !!process.env.SUPABASE_URL, has_supabase_key: !!process.env.SUPABASE_KEY });
});

// ── Public Profile ──
app.get('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  const { data, error } = await supabase
    .from('users')
    .select('name, username, gender, bio, skills, college, created_at')
    .eq('username', username)
    .single();
  if (error || !data) return res.status(404).json({ error: 'User not found' });

  // Get their teams
  const { data: teams } = await supabase
    .from('team_members')
    .select('team_id, teams(name, hackathon)')
    .eq('user_email', data.email || '')
    .limit(5);

  // Get their projects
  const { data: projects } = await supabase
    .from('team_projects')
    .select('title, description, github_link, demo_link, tech_stack')
    .eq('submitted_by', data.email || '')
    .limit(5);

  res.json({ ...data, teams: teams || [], projects: projects || [] });
});

app.listen(PORT, () => {
  console.log(`✅ HackAlert running → http://localhost:${PORT}/realhackito.html`);
  console.log(`✅ Supabase connected!`);
});
