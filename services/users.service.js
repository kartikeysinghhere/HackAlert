const supabase = require('../config/db');
const { ApiError } = require('../utils/errorHandler');

const getProfile = async (email) => {
  const { data, error } = await supabase.from('users').select('name, email, username, gender, bio, skills, college, last_seen').eq('email', email).single();
  if (error) throw new ApiError(404, 'User not found');
  return data;
};

const updateProfile = async (email, profile) => {
  const { data, error } = await supabase.from('users').update(profile).eq('email', email).select().single();
  if (error) throw new ApiError(500, error.message);
  return data;
};

const getFriends = async (email) => {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user1_email.eq.${email},user2_email.eq.${email}`);

  if (error) throw new ApiError(500, error.message);

  const friendEmails = (data || []).map(f =>
    f.user1_email === email ? f.user2_email : f.user1_email
  );

  if (!friendEmails.length) return [];

  const { data: friends } = await supabase
    .from('users')
    .select('name, email, username, gender, bio, skills, college')
    .in('email', friendEmails);

  return friends || [];
};

const removeFriend = async (email, friend_email) => {
  await supabase.from('friendships').delete()
    .or(`and(user1_email.eq.${email},user2_email.eq.${friend_email}),and(user1_email.eq.${friend_email},user2_email.eq.${email})`);
  return { message: 'Friend removed' };
};

const ping = async (email) => {
  await supabase
    .from('users')
    .update({ last_seen: new Date().toISOString() })
    .eq('email', email);
  return { ok: true };
};

const getOnline = async () => {
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('users')
    .select('email, last_seen')
    .gte('last_seen', twoMinsAgo);
  return (data || []).map(u => u.email);
};

module.exports = {
  getProfile,
  updateProfile,
  getFriends,
  removeFriend,
  ping,
  getOnline
};
