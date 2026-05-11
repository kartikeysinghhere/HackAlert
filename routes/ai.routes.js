const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { askBotSchema, aiIdeasSchema, aiAnalyzeSchema } = require('../schemas/ai.schema');
const { aiLimiter, botProtection, aiPromptSanityCheck } = require('../middleware/security');
const { aiSecurityCheck } = require('../validators/ai.validator');
const profanity = require('../validators/profanity.validator');

router.post('/ask', validate(askBotSchema), aiLimiter, botProtection, aiPromptSanityCheck, aiSecurityCheck, profanity.middleware, aiController.askBot);
router.post('/ideas', authenticate, validate(aiIdeasSchema), aiLimiter, botProtection, aiPromptSanityCheck, aiSecurityCheck, aiController.generateIdeas);
router.post('/analyze', authenticate, validate(aiAnalyzeSchema), aiLimiter, botProtection, aiPromptSanityCheck, aiSecurityCheck, aiController.analyzeHackathon);

module.exports = router;
