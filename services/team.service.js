const supabase = require('../config/db');
const sseService = require('../sockets/sse');

class TeamService {
  async getAllTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(count)');
    if (error) throw new Error(error.message);
    return data || [];
  }

  async getTeamById(id) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async createTeam(user, teamData) {
    const { name, hackathon_name, description, max_members, skills_needed } = teamData;
    const { data: team, error } = await supabase
      .from('teams')
      .insert([{
        name,
        hackathon_name,
        description,
        max_members,
        skills_needed,
        leader_email: user.email,
        leader_name: user.name
      }])
      .select().single();

    if (error) throw new Error(error.message);

    // Auto-join leader
    await supabase.from('team_members').insert([{
      team_id: team.id,
      user_email: user.email,
      user_name: user.name
    }]);

    return team;
  }

  async joinTeam(user, teamId) {
    const { data: team } = await supabase.from('teams').select('*').eq('id', teamId).single();
    if (!team) throw new Error('Team not found');

    const { count } = await supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', teamId);
    if (count >= team.max_members) throw new Error('Team full');

    const { error } = await supabase.from('team_members').insert([{
      team_id: teamId,
      user_email: user.email,
      user_name: user.name
    }]);

    if (error) throw new Error('Already in team or failed to join');
    return { message: 'Joined' };
  }

  async getMessages(teamId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async sendMessage(user, teamId, message) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ team_id: teamId, user_email: user.email, user_name: user.name, message }])
      .select().single();

    if (error) throw new Error(error.message);

    // Broadcast via SSE
    sseService.broadcastToTeam(teamId, data);

    return data;
  }

  async getTasks(teamId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async createTask(teamId, taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ team_id: teamId, ...taskData }])
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTask(taskId, updateData) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteTask(taskId) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw new Error(error.message);
    return { message: 'Task deleted' };
  }

  async getMembers(teamId) {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
    if (error) throw new Error(error.message);
    return data || [];
  }

  async leaveTeam(teamId, userEmail) {
    const { data: team } = await supabase.from('teams').select('leader_email').eq('id', teamId).single();
    if (team?.leader_email === userEmail) throw new Error('Leader cannot leave. Delete team instead.');

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_email', userEmail);
    if (error) throw new Error(error.message);
    return { message: 'Left team' };
  }

  async deleteTeam(teamId, userEmail) {
    const { data: team } = await supabase.from('teams').select('leader_email').eq('id', teamId).single();
    if (team?.leader_email !== userEmail) throw new Error('Only leader can delete');

    await supabase.from('teams').delete().eq('id', teamId);
    return { message: 'Team deleted' };
  }

  async getProject(teamId) {
    const { data, error } = await supabase.from('projects').select('*').eq('team_id', teamId).single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
  }

  async upsertProject(teamId, projectData) {
    const { data, error } = await supabase
      .from('projects')
      .upsert({ team_id: teamId, ...projectData }, { onConflict: 'team_id' })
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteProject(teamId) {
    const { error } = await supabase.from('projects').delete().eq('id', teamId);
    if (error) throw new Error(error.message);
    return { message: 'Project deleted' };
  }

  async matchTeams(userEmail) {
    const { data: user } = await supabase.from('users').select('skills').eq('email', userEmail).single();
    const skills = user.skills ? user.skills.toLowerCase().split(',').map(s => s.trim()) : [];

    const { data: teams } = await supabase.from('teams').select('*');
    const scored = teams.map(t => {
      const needed = t.skills_needed ? t.skills_needed.toLowerCase().split(',').map(s => s.trim()) : [];
      const matchCount = skills.filter(s => needed.includes(s)).length;
      return { ...t, matchScore: matchCount };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return scored;
  }
}

module.exports = new TeamService();
