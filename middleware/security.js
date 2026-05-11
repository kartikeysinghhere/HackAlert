const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

/**
 * Enterprise-grade Security Middleware for Hack/Alert
 * This file centralizes all rate limiting, abuse prevention, and anti-bot logic.
 */

// 1. Global DDoS Protection & IP Throttling
// Limits total requests from a single IP to prevent infrastructure saturation.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes',
        code: 429
    }
});

// 2. Strict Auth Protection (Login/Signup)
// Prevents brute-force attacks on authentication endpoints.
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10, // Start blocking after 10 failed attempts
    skipSuccessfulRequests: true, // Only count failures (depends on res.status)
    message: {
        error: 'Too many failed login attempts. Please try again in an hour.',
        code: 429
    },
    handler: (req, res, next, options) => {
        // Log brute force attempts here if needed
        res.status(options.statusCode).send(options.message);
    }
});

// 3. AI Endpoint Abuse Protection
// Prevents spamming expensive AI models (Groq) and API cost spikes.
const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Limit to 5 AI requests per minute
    message: {
        error: 'AI request limit reached. Please wait a minute before asking again.',
        code: 429
    }
});

// 4. Progressive Slow-down (Anti-Abuse)
// Instead of blocking, we slow down the response time for suspicious users.
// This frustrates scrapers and bots while being less intrusive for real users.
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: (hits) => hits * 100, // add 100ms of delay per hit after 50
});

// 5. Anti-Bot Protection
// Basic check for common headless browsers and scrapers.
const botProtection = (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    const botPatterns = [
        'curl', 'python', 'postman', 'insomnia', 'headless', 'selenium',
        'puppeteer', 'scraper', 'spider', 'bot'
    ];

    if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
        return res.status(403).json({
            error: 'Automated access is restricted for this endpoint.',
            code: 403
        });
    }
    next();
};

// 6. AI Prompt Abuse Prevention Middleware
// Checks for excessively long or repeated prompts.
const aiPromptSanityCheck = (req, res, next) => {
    const { messages, theme, details } = req.body;

    // Check for message length (prevent token-exhaustion attacks)
    const content = messages ? JSON.stringify(messages) : (theme || details || '');
    if (content.length > 2000) {
        return res.status(400).json({
            error: 'Prompt exceeds maximum allowed length of 2000 characters.',
            code: 400
        });
    }

    // Check for repeated patterns (simple spam detection)
    if (messages && messages.length > 1) {
        const lastTwo = messages.slice(-2);
        if (lastTwo.length === 2 && lastTwo[0].content === lastTwo[1].content) {
            return res.status(400).json({
                error: 'Repeated prompts detected. Please vary your input.',
                code: 400
            });
        }
    }

    next();
};

const { authenticate } = require("./auth");

module.exports = {
    authenticate,
    globalLimiter,
    authLimiter,
    aiLimiter,
    speedLimiter,
    botProtection,
    aiPromptSanityCheck
};
