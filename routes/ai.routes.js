const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/security');
const { validate } = require('../middleware/validate');
const { aiIdeasSchema, aiAnalyzeSchema } = require('../schemas/ai.schema');
const { aiLimiter, botProtection, aiPromptSanityCheck } = require('../middleware/security');
const { aiSecurityCheck } = require('../validators/ai.validator');

router.use(authenticate);

router.post('/ideas',
  validate(aiIdeasSchema),
  aiLimiter,
  botProtection,
  aiPromptSanityCheck,
  aiSecurityCheck,
  aiController.generateIdeas
);

router.post('/analyze',
  validate(aiAnalyzeSchema),
  aiLimiter,
  botProtection,
  aiPromptSanityCheck,
  aiSecurityCheck,
  aiController.analyzeDifficulty
);

module.exports = router;
