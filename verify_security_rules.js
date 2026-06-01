const express = require('express');
const rateLimit = require('express-rate-limit');
const { slowDown } = require('express-slow-down');
const http = require('http');

// Setup dummy Express app with the exact middlewares we put in server.js
const app = express();

// 1. Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  statusCode: 429,
  message: { error: 'Too many requests. Please try again after 15 minutes.' }
});

// 2. Strict rate limit on AI endpoints: 10 requests per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  statusCode: 429,
  message: { error: 'Too many AI requests. Please try again after 15 minutes.' }
});

// 3. Strict rate limit on email endpoints: 3 requests per hour per IP
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  statusCode: 429,
  message: { error: 'Too many OTP requests. Please try again after an hour.' }
});

// 4. Rate limit on auth endpoints: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  statusCode: 429,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

// 5. Slow down repeated requests using express-slow-down
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5, // Set to 5 for rapid testing in this verification script
  delayMs: (hits) => hits * 100
});

// 6. Add request size limit (max 10kb body)
app.use(express.json({ limit: '10kb' }));

// 7. Block requests with suspicious headers
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

app.use(blockSuspiciousHeaders);
app.use(speedLimiter);
app.use(globalLimiter);

// Specific routes
app.post('/ask', aiLimiter, (req, res) => res.json({ ok: true }));
app.post('/api/ai/ideas', aiLimiter, (req, res) => res.json({ ok: true }));
app.post('/api/ai/analyze', aiLimiter, (req, res) => res.json({ ok: true }));
app.post('/api/send-otp', otpLimiter, (req, res) => res.json({ ok: true }));
app.post('/api/login', authLimiter, (req, res) => res.json({ ok: true }));
app.post('/api/signup', authLimiter, (req, res) => res.json({ ok: true }));
app.post('/api/register', authLimiter, (req, res) => res.json({ ok: true }));
app.post('/api/normal', (req, res) => res.json({ ok: true }));

// Error handler for body size limit
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Body size limit exceeded.' });
  }
  next(err);
});

const server = app.listen(3001, async () => {
  console.log('Test server started on port 3001');
  
  try {
    await testSuspiciousHeaders();
    await testRequestSizeLimit();
    await testRateLimiting();
    console.log('\n✅ All security & rate-limiting middleware checks passed perfectly! 🚀');
  } catch (err) {
    console.error('\n❌ Validation failed:', err.message);
  } finally {
    server.close();
  }
});

// Helper for making requests
function makeRequest(path, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
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
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// Test Suite
async function testSuspiciousHeaders() {
  console.log('\nTesting Suspicious Headers...');
  // Case 1: Scanner UA
  let res = await makeRequest('/api/normal', 'POST', { 'User-Agent': 'sqlmap/1.4' });
  console.log(' - sqlmap UA status:', res.status, '(expected: 400)');
  if (res.status !== 400) throw new Error('Failed to block suspicious UA');

  // Case 2: XSS in header
  res = await makeRequest('/api/normal', 'POST', { 'X-Custom-Header': '<script>alert(1)</script>' });
  console.log(' - XSS header status:', res.status, '(expected: 400)');
  if (res.status !== 400) throw new Error('Failed to block XSS header');

  // Case 3: Normal request
  res = await makeRequest('/api/normal', 'POST', { 'User-Agent': 'Mozilla/5.0' });
  console.log(' - Normal header status:', res.status, '(expected: 200)');
  if (res.status !== 200) throw new Error('Blocked a normal header');
}

async function testRequestSizeLimit() {
  console.log('\nTesting Request Size Limit...');
  // Max limit is 10kb. Let's send a body larger than 10kb (approx 12kb).
  const largeBody = { data: 'a'.repeat(12 * 1024) };
  const res = await makeRequest('/api/normal', 'POST', {}, largeBody);
  console.log(' - Large body (>10kb) status:', res.status, '(expected: 413)');
  if (res.status !== 413) throw new Error('Failed to enforce request size limit');
}

async function testRateLimiting() {
  console.log('\nTesting Rate Limiting...');
  // Test AI Limiter: Limit is 10. Let's make 11 requests.
  console.log(' - Making 11 requests to /ask...');
  let hitLimit = false;
  for (let i = 1; i <= 11; i++) {
    const res = await makeRequest('/ask', 'POST');
    if (res.status === 429) {
      console.log(`   * Request ${i} rate limited (status: 429). Msg:`, res.body);
      hitLimit = true;
      break;
    }
  }
  if (!hitLimit) throw new Error('AI rate limiter failed to trigger at 10 requests');

  // Test OTP Limiter: Limit is 3. Let's make 4 requests.
  console.log(' - Making 4 requests to /api/send-otp...');
  hitLimit = false;
  for (let i = 1; i <= 4; i++) {
    const res = await makeRequest('/api/send-otp', 'POST');
    if (res.status === 429) {
      console.log(`   * Request ${i} rate limited (status: 429). Msg:`, res.body);
      hitLimit = true;
      break;
    }
  }
  if (!hitLimit) throw new Error('OTP rate limiter failed to trigger at 3 requests');
}
