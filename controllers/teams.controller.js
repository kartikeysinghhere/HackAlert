const teamsService = require('../services/teams.service');
const asyncHandler = require('../utils/asyncHandler');

const getTeams = asyncHandler(async (req, res) => {
  const result = await teamsService.getTeams(req.params.hackathon_id);
  res.json(result);
});

const createTeam = asyncHandler(async (req, res) => {
  const result = await teamsService.createTeam(req.user.email, req.body);
  res.status(201).json(result);
});

const joinTeam = asyncHandler(async (req, res) => {
  const result = await teamsService.joinTeam(req.user.email, req.params.team_id);
  res.json(result);
});

const getRequests = asyncHandler(async (req, res) => {
  const result = await teamsService.getRequests(req.user.email);
  res.json(result);
});

const sendRequest = asyncHandler(async (req, res) => {
  const result = await teamsService.sendRequest(req.user.email, req.body);
  res.json(result);
});

const handleRequest = asyncHandler(async (req, res) => {
  const result = await teamsService.handleRequest(req.user.email, req.params.id, req.body);
  res.json(result);
});

module.exports = {
  getTeams,
  createTeam,
  joinTeam,
  getRequests,
  sendRequest,
  handleRequest
};
