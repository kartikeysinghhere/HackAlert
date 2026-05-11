const express = require('express');
const router = express.Router();
const teamsController = require('../controllers/teams.controller');
const authenticate = require('../middleware/security').authenticate;
const validate = require('../middleware/validate');
const { teamSchema, teamRequestSchema, handleRequestSchema } = require('../schemas/team.schema');

router.use(authenticate);

router.get('/requests', teamsController.getRequests);
router.post('/requests', validate(teamRequestSchema), teamsController.sendRequest);
router.put('/requests/:id', validate(handleRequestSchema), teamsController.handleRequest);
router.get('/:hackathon_id', teamsController.getTeams);
router.post('/', validate(teamSchema), teamsController.createTeam);
router.post('/:team_id/join', teamsController.joinTeam);

module.exports = router;
