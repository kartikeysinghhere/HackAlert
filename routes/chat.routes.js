const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/security');
const hackathonsService = require('../services/hackathons.service');

router.post('/ask', authenticate, async (req, res, next) => {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const latest = (messages[messages.length - 1]?.content || '').toLowerCase();
    const hacks = await hackathonsService.getAll();

    if (!hacks.length) {
      return res.json({ answer: "I couldn't find hackathons right now. Please try again shortly." });
    }

    const includes = (text) => latest.includes(text);
    let filtered = hacks;

    if (includes('india')) filtered = hacks.filter(h => (h.country || '').toLowerCase().includes('india'));
    else if (includes('online')) filtered = hacks.filter(h => h.virtual);
    else if (includes('hybrid')) filtered = hacks.filter(h => h.hybrid);
    else if (includes('offline') || includes('in-person')) filtered = hacks.filter(h => !h.virtual && !h.hybrid);

    const upcoming = (filtered.length ? filtered : hacks)
      .slice()
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5);

    const summary = upcoming
      .map((h, i) => `${i + 1}. ${h.name} (${h.start})${h.country ? ` - ${h.country}` : ''}`)
      .join('\n');

    const hint = includes('online') ? 'Showing online-focused results.\n' : '';
    return res.json({
      answer: `${hint}Here are upcoming hackathons:\n${summary}`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
