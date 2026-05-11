const hackathonsService = require('../services/hackathons.service');
const asyncHandler = require('../utils/asyncHandler');

const getAll = asyncHandler(async (req, res) => {
  const result = await hackathonsService.getAll();
  res.json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await hackathonsService.getById(req.params.id);
  res.json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await hackathonsService.create(req.body);
  res.status(201).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await hackathonsService.update(req.params.id, req.body);
  res.json(result);
});

const deleteHackathon = asyncHandler(async (req, res) => {
  const result = await hackathonsService.deleteHackathon(req.params.id);
  res.json(result);
});

const getSaved = asyncHandler(async (req, res) => {
  const result = await hackathonsService.getSaved(req.user.email);
  res.json(result);
});

const save = asyncHandler(async (req, res) => {
  const result = await hackathonsService.save(req.user.email, req.body.hackathon_id);
  res.json(result);
});

const unsave = asyncHandler(async (req, res) => {
  const result = await hackathonsService.unsave(req.user.email, req.params.hackathon_id);
  res.json(result);
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteHackathon,
  getSaved,
  save,
  unsave
};
