const supabase = require('../config/db');
const { ApiError } = require('../utils/errorHandler');

const fallbackHackathons = [
  { name: "Global AI Hack 2026", start: "2026-05-15", city: "San Francisco", country: "USA", virtual: false, hybrid: true, website: "https://example.com/ai-hack" },
  { name: "Web3 Weekend", start: "2026-05-20", city: "", country: "", virtual: true, hybrid: false, website: "https://example.com/web3-weekend" },
  { name: "India HackFest", start: "2026-06-01", city: "Bangalore", country: "India", virtual: false, hybrid: false, website: "https://example.com/india-hackfest" },
  { name: "ML Marathon", start: "2026-06-10", city: "New York", country: "USA", virtual: true, hybrid: false, website: "https://example.com/ml-marathon" },
  { name: "Code4Climate", start: "2026-06-14", city: "Berlin", country: "Germany", virtual: false, hybrid: true, website: "https://example.com/code4climate" },
  { name: "HealthTech Sprint", start: "2026-06-18", city: "London", country: "United Kingdom", virtual: true, hybrid: false, website: "https://example.com/healthtech-sprint" },
  { name: "FinHack Global", start: "2026-06-24", city: "Singapore", country: "Singapore", virtual: false, hybrid: true, website: "https://example.com/finhack-global" },
  { name: "Campus Buildathon", start: "2026-07-02", city: "Delhi", country: "India", virtual: false, hybrid: false, website: "https://example.com/campus-buildathon" },
  { name: "Open Source Jam", start: "2026-07-08", city: "", country: "", virtual: true, hybrid: false, website: "https://example.com/oss-jam" },
  { name: "Cyber Defense CTF", start: "2026-07-15", city: "Tel Aviv", country: "Israel", virtual: true, hybrid: false, website: "https://example.com/cyber-ctf" },
  { name: "EdTech Innovate", start: "2026-07-22", city: "Toronto", country: "Canada", virtual: false, hybrid: true, website: "https://example.com/edtech-innovate" },
  { name: "Smart Cities Hack", start: "2026-08-01", city: "Dubai", country: "United Arab Emirates", virtual: false, hybrid: true, website: "https://example.com/smart-cities" }
];

const getAll = async () => {
  const { data, error } = await supabase.from('hackathons').select('*');
  if (error) {
    console.warn('[hackathons] DB fetch failed, using fallback data:', error.message);
    return fallbackHackathons;
  }
  if (!data || data.length === 0) return fallbackHackathons;
  return data;
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
