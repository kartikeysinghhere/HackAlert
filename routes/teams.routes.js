const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teams.controller');
const { authenticate, teamManagementLimiter } = require('../middleware/security');
const { validate } = require('../middleware/validate');
const { teamSchema, teamRequestSchema, handleRequestSchema } = require('../schemas/team.schema');

router.use(authenticate);

router.get('/', teamsController.getTeams); // Compatibility: list teams without hackathon filter
router.get('/requests', teamsController.getRequests);
router.post('/requests', teamManagementLimiter, validate(teamRequestSchema), teamsController.sendRequest);
router.put('/requests/:id', validate(handleRequestSchema), teamsController.handleRequest);
router.get('/:hackathon_id', teamsController.getTeams);
router.post('/', teamManagementLimiter, validate(teamSchema), teamsController.createTeam);
router.post('/create', teamManagementLimiter, teamsController.createTeam); // Compatibility alias for older frontend
router.post('/:team_id/join', teamManagementLimiter, teamsController.joinTeam);
router.post('/join', teamManagementLimiter, (req, res, next) => {
  req.params.team_id = req.body.team_id;
  return teamsController.joinTeam(req, res, next);
}); // Compatibility alias for older frontend

module.exports = router;
