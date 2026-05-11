const supabase = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

exports.getAllProjects = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('team_projects')
    .select('*, teams(name, hackathon)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  res.json(data || []);
});
