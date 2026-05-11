const supabase = require('../config/db');

class UserService {
  async searchUsers(query) {
    const { data, error } = await supabase
      .from('users')
      .select('name, email, username, skills, college')
      .or(`name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async sendFriendRequest(fromEmail, toEmail) {
    if (fromEmail === toEmail) throw new Error('Cannot add self');
    const { error } = await supabase
      .from('friend_requests')
      .insert([{ from_email: fromEmail, to_email: toEmail, status: 'pending' }]);
    if (error) throw new Error('Request already sent or failed');
    return { message: 'Request sent' };
  }

  async getFriendRequests(email) {
    const { data, error } = await supabase
      .from('friend_requests')
      .select('*, sender:users!from_email(name, username)')
      .eq('to_email', email)
      .eq('status', 'pending');
    if (error) throw new Error(error.message);
    return data || [];
  }

  async respondToFriendRequest(requestId, status, userEmail) {
    const { data: request } = await supabase.from('friend_requests').select('*').eq('id', requestId).single();
    if (!request || request.to_email !== userEmail) throw new Error('Unauthorized');

    await supabase.from('friend_requests').update({ status }).eq('id', requestId);

    if (status === 'accepted') {
      await supabase.from('friendships').upsert([
        { user1_email: request.from_email, user2_email: request.to_email }
      ], { onConflict: 'user1_email,user2_email' });
    }
    return { message: `Request ${status}` };
  }

  async getFriends(email) {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user1_email.eq.${email},user2_email.eq.${email}`);

    if (error) throw new Error(error.message);

    const friendEmails = (data || []).map(f =>
      f.user1_email === email ? f.user2_email : f.user1_email
    );

    if (!friendEmails.length) return [];

    const { data: friends } = await supabase
      .from('users')
      .select('name, email, username, gender, bio, skills, college')
      .in('email', friendEmails);

    return friends || [];
  }

  async removeFriend(email, friendEmail) {
    await supabase.from('friendships').delete()
      .or(`and(user1_email.eq.${email},user2_email.eq.${friendEmail}),and(user1_email.eq.${friendEmail},user2_email.eq.${email})`);
    return { message: 'Friend removed' };
  }

  async ping(email) {
    await supabase
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('email', email);
    return { ok: true };
  }

  async getOnlineUsers() {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('users')
      .select('email, last_seen')
      .gte('last_seen', twoMinsAgo);
    return (data || []).map(u => u.email);
  }
}

module.exports = new UserService();
