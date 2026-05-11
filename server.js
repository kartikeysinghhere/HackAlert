const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { ALLOWED_ORIGIN, PORT } = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./utils/errorHandler');
const { sanitizeBody } = require('./middleware/sanitize');
const { globalLimiter, speedLimiter } = require('./middleware/security');
const initCron = require('./config/cron');

const app = express();

// Trust proxy for Render/Vercel IP detection
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: ALLOWED_ORIGIN
}));

// Body Parser
app.use(express.json({ limit: '10kb' }));
app.use(sanitizeBody);

// Static files
app.use(express.static(__dirname));

// API Rate Limiting & Throttling
app.use('/api/', globalLimiter);
app.use('/api/', speedLimiter);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'realhackito.html'));
});

app.use('/api', routes);

// Centralized Error Handling
app.use(errorHandler);

// Initialize Cron Jobs
initCron();

app.listen(PORT, () => {
  console.log(`✅ HackAlert running → http://localhost:${PORT}/realhackito.html`);
  console.log(`✅ Modular architecture initialized!`);
});

// Root-level /ask for frontend compatibility
const aiController = require('./controllers/ai.controller');
const { validate } = require('./middleware/validate');
const { askBotSchema } = require('./schemas/ai.schema');
const { aiLimiter, botProtection, aiPromptSanityCheck } = require('./middleware/security');
const { aiSecurityCheck } = require('./validators/ai.validator');
const profanity = require('./validators/profanity.validator');

app.post('/ask', validate(askBotSchema), aiLimiter, botProtection, aiPromptSanityCheck, aiSecurityCheck, profanity.middleware, aiController.askBot);
