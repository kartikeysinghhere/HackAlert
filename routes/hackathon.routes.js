const express = require('express');
const router = express.Router();
const hackathonController = require('../controllers/hackathon.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { saveHackathonSchema } = require('../schemas/hackathon.schema');

router.get('/hackathons', hackathonController.getHackathons);
router.post('/saved', authenticate, validate(saveHackathonSchema), hackathonController.saveHackathon);
router.delete('/saved/:name', authenticate, hackathonController.deleteSavedHackathon);
router.get('/saved', authenticate, hackathonController.getSavedHackathons);

module.exports = router;
