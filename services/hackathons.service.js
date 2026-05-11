const supabase = require('../config/db');
const { ApiError } = require('../utils/errorHandler');

const getAll = async () => {
  const { data, error } = await supabase.from('hackathons').select('*');
  if (error) throw new ApiError(500, error.message);
  return data || [];
};

const getById = async (id) => {
  const { data, error } = await supabase.from('hackathons').select('*').eq('id', id).single();
  if (error) throw new ApiError(500, error.message);
  return data;
};

const create = async (hackathon) => {
  const { data, error } = await supabase.from('hackathons').insert([hackathon]).select().single();
  if (error) throw new ApiError(500, error.message);
  return data;
};

const update = async (id, hackathon) => {
  const { data, error } = await supabase.from('hackathons').update(hackathon).eq('id', id).select().single();
  if (error) throw new ApiError(500, error.message);
  return data;
};

const deleteHackathon = async (id) => {
  const { error } = await supabase.from('hackathons').delete().eq('id', id);
  if (error) throw new ApiError(500, error.message);
  return { message: 'Hackathon deleted' };
};

const getSaved = async (email) => {
  const { data, error } = await supabase.from('saved_hackathons').select('hackathon_id').eq('user_email', email);
  if (error) throw new ApiError(500, error.message);

  const ids = (data || []).map(s => s.hackathon_id);
  if (!ids.length) return [];

  const { data: hackathons } = await supabase.from('hackathons').select('*').in('id', ids);
  return hackathons || [];
};

const save = async (email, hackathon_id) => {
  const { error } = await supabase.from('saved_hackathons').insert([{ user_email: email, hackathon_id }]);
  if (error) throw new ApiError(500, error.message);
  return { message: 'Hackathon saved' };
};

const unsave = async (email, hackathon_id) => {
  const { error } = await supabase.from('saved_hackathons').delete().eq('user_email', email).eq('hackathon_id', hackathon_id);
  if (error) throw new ApiError(500, error.message);
  return { message: 'Hackathon unsaved' };
};

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
