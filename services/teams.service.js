const supabase = require('../config/db');
const { ApiError } = require('../utils/errorHandler');

const getTeams = async (hackathon_id) => {
  const { data, error } = await supabase.from('teams').select('*').eq('hackathon_id', hackathon_id);
  if (error) throw new ApiError(500, error.message);

  const teamIds = (data || []).map(t => t.id);
  const { data: members } = await supabase.from('team_members').select('*').in('team_id', teamIds);

  return (data || []).map(team => ({
    ...team,
    members: members?.filter(m => m.team_id === team.id) || []
  }));
};

const createTeam = async (email, { hackathon_id, name, description, max_members, skills_needed }) => {
  const { data: team, error } = await supabase
    .from('teams')
    .insert([{ hackathon_id, name, description, leader_email: email, max_members, skills_needed }])
    .select().single();

  if (error) throw new ApiError(500, error.message);

  await supabase.from('team_members').insert([{ team_id: team.id, user_email: email, role: 'Leader' }]);
  return team;
};

const joinTeam = async (email, team_id) => {
  const { data: team } = await supabase.from('teams').select('*').eq('id', team_id).single();
  const { data: members } = await supabase.from('team_members').select('*').eq('team_id', team_id);

  if (members && members.length >= (team?.max_members || 4)) {
    throw new ApiError(400, 'Team is full');
  }

  const { error } = await supabase.from('team_members').insert([{ team_id, user_email: email, role: 'Member' }]);
  if (error) throw new ApiError(500, error.message);

  return { message: 'Joined team' };
};

const getRequests = async (email) => {
  const { data, error } = await supabase.from('team_requests').select('*').eq('receiver_email', email).eq('status', 'pending');
  if (error) throw new ApiError(500, error.message);
  return data || [];
};

const sendRequest = async (email, { team_id, receiver_email, message }) => {
  const { error } = await supabase.from('team_requests').insert([{ team_id, sender_email: email, receiver_email, message, status: 'pending' }]);
  if (error) throw new ApiError(500, error.message);
  return { message: 'Request sent' };
};

const handleRequest = async (email, requestId, { status }) => {
  const { data: req } = await supabase.from('team_requests').update({ status }).eq('id', requestId).select().single();

  if (status === 'accepted' && req) {
    await supabase.from('team_members').insert([{ team_id: req.team_id, user_email: req.sender_email, role: 'Member' }]);

    const { data: team } = await supabase.from('teams').select('hackathon_id').eq('id', req.team_id).single();
    if (team) {
      await supabase.from('saved_hackathons').upsert([{ user_email: req.sender_email, hackathon_id: team.hackathon_id }], { onConflict: 'user1_email,user2_email' });
    }
  }
  return { message: `Request ${status}` };
};

module.exports = {
  getTeams,
  createTeam,
  joinTeam,
  getRequests,
  sendRequest,
  handleRequest
};
