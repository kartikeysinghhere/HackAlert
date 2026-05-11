const express = require('express');
const router = express.Router();
const teamController = require('../controllers/team.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createTeamSchema } = require('../schemas/team.schema');

router.get('/', teamController.getAllTeams);
router.post('/match', authenticate, teamController.matchTeams);
router.get('/:id', teamController.getTeamById);
router.post('/create', authenticate, validate(createTeamSchema), teamController.createTeam);
router.post('/join', authenticate, teamController.joinTeam);

// Messages
router.get('/:id/messages', teamController.getMessages);
router.post('/:id/messages', authenticate, teamController.sendMessage);
router.get('/:id/stream', teamController.streamMessages);

// Tasks
router.get('/:id/tasks', teamController.getTasks);
router.post('/:id/tasks', authenticate, teamController.createTask);
router.put('/:team_id/tasks/:task_id', authenticate, teamController.updateTask);
router.delete('/:team_id/tasks/:task_id', authenticate, teamController.deleteTask);

// Members
router.get('/:id/members', teamController.getMembers);
router.delete('/:team_id/members/:user_email', authenticate, teamController.leaveTeam);
router.delete('/:team_id', authenticate, teamController.deleteTeam);

// Projects
router.get('/:id/project', teamController.getProject);
router.post('/:id/project', authenticate, teamController.upsertProject);
router.delete('/:id/project', authenticate, teamController.deleteProject);

module.exports = router;
