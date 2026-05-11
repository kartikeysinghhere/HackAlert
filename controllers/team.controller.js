const teamService = require('../services/team.service');
const sseService = require('../sockets/sse');
const asyncHandler = require('../utils/asyncHandler');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

exports.getAllTeams = asyncHandler(async (req, res) => {
  const teams = await teamService.getAllTeams();
  res.json(teams);
});

exports.getTeamById = asyncHandler(async (req, res) => {
  const team = await teamService.getTeamById(req.params.id);
  res.json(team);
});

exports.createTeam = asyncHandler(async (req, res) => {
  const team = await teamService.createTeam(req.user, req.body);
  res.json(team);
});

exports.joinTeam = asyncHandler(async (req, res) => {
  const result = await teamService.joinTeam(req.user, req.body.team_id);
  res.json(result);
});

exports.getMessages = asyncHandler(async (req, res) => {
  const messages = await teamService.getMessages(req.params.id);
  res.json(messages);
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const message = await teamService.sendMessage(req.user, req.params.id, req.body.message);
  res.json(message);
});

exports.streamMessages = (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  const teamId = req.params.id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseService.addTeamClient(teamId, res);

  req.on('close', () => {
    sseService.removeTeamClient(teamId, res);
  });
};

exports.getTasks = asyncHandler(async (req, res) => {
  const tasks = await teamService.getTasks(req.params.id);
  res.json(tasks);
});

exports.createTask = asyncHandler(async (req, res) => {
  const task = await teamService.createTask(req.params.id, req.body);
  res.json(task);
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await teamService.updateTask(req.params.task_id, req.body);
  res.json(task);
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const result = await teamService.deleteTask(req.params.task_id);
  res.json(result);
});

exports.getMembers = asyncHandler(async (req, res) => {
  const members = await teamService.getMembers(req.params.id);
  res.json(members);
});

exports.leaveTeam = asyncHandler(async (req, res) => {
  const result = await teamService.leaveTeam(req.params.team_id, req.params.user_email);
  res.json(result);
});

exports.deleteTeam = asyncHandler(async (req, res) => {
  const result = await teamService.deleteTeam(req.params.team_id, req.user.email);
  res.json(result);
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await teamService.getProject(req.params.id);
  res.json(project);
});

exports.upsertProject = asyncHandler(async (req, res) => {
  const project = await teamService.upsertProject(req.params.id, req.body);
  res.json(project);
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const result = await teamService.deleteProject(req.params.id);
  res.json(result);
});

exports.matchTeams = asyncHandler(async (req, res) => {
    const result = await teamService.matchTeams(req.user.email);
    res.json(result);
});
