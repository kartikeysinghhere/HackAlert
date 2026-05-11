const express = require('express');
const app = express();
const { globalLimiter } = require('./middleware/security');
const { sanitizeBody } = require('./middleware/sanitize');
const cookieParser = require('cookie-parser');
const cors = require('cors');

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
try {
    app.use(globalLimiter);
    console.log('globalLimiter OK');
} catch(e) { console.error('globalLimiter FAIL:', e.message); }

try {
    app.use(sanitizeBody);
    console.log('sanitizeBody OK');
} catch(e) { console.error('sanitizeBody FAIL:', e.message); }

const authRoutes = require('./routes/auth.routes');
app.use('/api', authRoutes);
console.log('authRoutes OK');

const aiRoutes = require('./routes/ai.routes');
app.use('/api/ai', aiRoutes);
console.log('aiRoutes OK');
