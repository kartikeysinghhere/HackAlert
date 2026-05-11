const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate } = require('../middleware/auth');

router.get('/:hackathon_name', reviewController.getReviews);
router.post('/', authenticate, reviewController.addReview);
router.delete('/:hackathon_name', authenticate, reviewController.deleteReview);

module.exports = router;
