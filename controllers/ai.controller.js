const aiService = require('../services/ai.service');
const asyncHandler = require('../utils/asyncHandler');

exports.askBot = asyncHandler(async (req, res) => {
  const result = await aiService.askBot(req.body.messages);
  res.json(result);
});

exports.generateIdeas = asyncHandler(async (req, res) => {
  const ideas = await aiService.generateIdeas(req.body);
  res.json({ ideas });
});

exports.analyzeHackathon = asyncHandler(async (req, res) => {
  const analysis = await aiService.analyzeHackathon(req.body);
  res.json({ analysis });
});
