const express = require('express');
const router = express.Router();
const hackathonsController = require('../controllers/hackathons.controller');
const authenticate = require('../middleware/security').authenticate;
const validate = require('../middleware/validate');
const { hackathonSchema } = require('../schemas/hackathon.schema');

router.use(authenticate);

router.get('/', hackathonsController.getAll);
router.get('/saved', hackathonsController.getSaved);
router.post('/save', hackathonsController.save);
router.delete('/save/:hackathon_id', hackathonsController.unsave);
router.get('/:id', hackathonsController.getById);
router.post('/', validate(hackathonSchema), hackathonsController.create);
router.put('/:id', validate(hackathonSchema), hackathonsController.update);
router.delete('/:id', hackathonsController.deleteHackathon);

module.exports = router;
