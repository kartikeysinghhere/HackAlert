const supabase = require('../config/db');
const realtimeService = require('./realtime.service');
const { ApiError } = require('../utils/errorHandler');

const getConversations = async (email) => {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`from_email.eq.${email},to_email.eq.${email}`)
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(500, error.message);

  const conversations = {};
  (data || []).forEach(msg => {
    const partner = msg.from_email === email ? msg.to_email : msg.from_email;
    if (!conversations[partner]) {
      conversations[partner] = {
        partner_email: partner,
        last_message: msg.message,
        last_time: msg.created_at,
        unread: 0
      };
    }
    if (msg.to_email === email && !msg.seen) {
      conversations[partner].unread++;
    }
  });

  const partnerEmails = Object.keys(conversations);
  if (!partnerEmails.length) return [];

  const { data: users } = await supabase
    .from('users')
    .select('name, email, username, gender')
    .in('email', partnerEmails);

  return Object.values(conversations).map(conv => ({
    ...conv,
    partner: users?.find(u => u.email === conv.partner_email) || { email: conv.partner_email, name: conv.partner_email }
  }));
};

const getMessages = async (email, partner) => {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`and(from_email.eq.${email},to_email.eq.${partner}),and(from_email.eq.${partner},to_email.eq.${email})`)
    .order('created_at', { ascending: true });

  if (error) throw new ApiError(500, error.message);

  await supabase
    .from('direct_messages')
    .update({ seen: true })
    .eq('to_email', email)
    .eq('from_email', partner)
    .eq('seen', false);

  return data || [];
};

const sendMessage = async (from_email, to_email, message) => {
  if (!message) throw new ApiError(400, 'Message required');

  const { data: friendship } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user1_email.eq.${from_email},user2_email.eq.${to_email}),and(user1_email.eq.${to_email},user2_email.eq.${from_email})`)
    .single();

  if (!friendship) throw new ApiError(403, 'You can only DM friends');

  const { data, error } = await supabase
    .from('direct_messages')
    .insert([{ from_email, to_email, message, seen: false }])
    .select().single();

  if (error) throw new ApiError(500, error.message);

  const dmKey = [from_email, to_email].sort().join('::');
  realtimeService.broadcastToKey(dmKey, data);

  return data;
};

const markSeen = async (email, partner) => {
  await supabase
    .from('direct_messages')
    .update({ seen: true })
    .eq('to_email', email)
    .eq('from_email', partner);

  const dmKey = [email, partner].sort().join('::');
  realtimeService.broadcastToKey(dmKey, { type: 'seen', from: email });

  return { message: 'Marked seen' };
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markSeen
};
