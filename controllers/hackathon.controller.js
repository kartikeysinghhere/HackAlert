const hackathonService = require('../services/hackathon.service');
const asyncHandler = require('../utils/asyncHandler');

exports.getHackathons = asyncHandler(async (req, res) => {
  const hackathons = await hackathonService.getHackathons();
  res.json(hackathons);
});

exports.saveHackathon = asyncHandler(async (req, res) => {
  const result = await hackathonService.saveHackathon(req.user.email, req.body);
  res.json(result);
});

exports.deleteSavedHackathon = asyncHandler(async (req, res) => {
  const result = await hackathonService.deleteSavedHackathon(req.user.email, req.params.name);
  res.json(result);
});

exports.getSavedHackathons = asyncHandler(async (req, res) => {
  const result = await hackathonService.getSavedHackathons(req.user.email);
  res.json(result);
});
