const reviewService = require('../services/review.service');
const asyncHandler = require('../utils/asyncHandler');

exports.getReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getReviews(req.params.hackathon_name);
  res.json(result);
});

exports.addReview = asyncHandler(async (req, res) => {
  const result = await reviewService.addReview(req.user, req.body);
  res.json(result);
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const result = await reviewService.deleteReview(req.user.email, req.params.hackathon_name);
  res.json(result);
});
