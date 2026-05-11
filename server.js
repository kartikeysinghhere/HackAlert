const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { globalLimiter } = require('./middleware/security');
const { sanitizeBody } = require('./middleware/sanitize');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');
const hackathonsRoutes = require('./routes/hackathons.routes');
const messagingRoutes = require('./routes/messaging.routes');
const teamsRoutes = require('./routes/teams.routes');
const usersRoutes = require('./routes/users.routes');

// Import Jobs
const initAlertJobs = require('./jobs/alerts.job');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // In production, replace with actual origin
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);
app.use(sanitizeBody);
app.use(express.static('.'));

// Routes mapping for frontend compatibility
app.use('/api', authRoutes);      // /api/register, /api/login
app.use('/api/ai', aiRoutes);    // /api/ai/ideas, /api/ai/analyze
app.use('/api/hackathons', hackathonsRoutes); // /api/hackathons, /api/hackathons/saved, etc.
app.use('/api/dm', messagingRoutes); // /api/dm/conversations, /api/dm/:email, etc.
app.use('/api/teams', teamsRoutes);   // /api/teams/:id, /api/teams/requests, etc.
app.use('/api', usersRoutes);     // /api/profile, /api/friends, /api/users/online, /api/ping

// Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode} - ${message}`);
  if (err.stack && env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize Background Jobs
initAlertJobs();

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`✅ HackAlert running → http://localhost:${PORT}/realhackito.html`);
  console.log(`✅ Supabase connected!`);
});
