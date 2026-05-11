const aiService = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');

const generateIdeas = asyncHandler(async (req, res) => {
  const ideas = await aiService.generateIdeas(req.body);
  res.json({ ideas });
});

const analyzeDifficulty = asyncHandler(async (req, res) => {
  const analysis = await aiService.analyzeDifficulty(req.body);
  res.json({ analysis });
});

module.exports = {
  generateIdeas,
  analyzeDifficulty
};
