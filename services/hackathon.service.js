const supabase = require('../config/db');

class HackathonService {
  constructor() {
    this.globalHackathons = [];
  }

  async getHackathons() {
    try {
      const [hackClub, supabaseRes] = await Promise.all([
        fetch('https://hackathons.hackclub.com/api/events/upcoming').then(r => r.json()),
        supabase.from('indian_hackathons').select('*')
      ]);
      const indian = supabaseRes.data || [];
      const all = [...hackClub, ...indian];

      const seen = new Set();
      const unique = all.filter(h => {
        const key = h.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      this.globalHackathons = unique;
      return unique;
    } catch (err) {
      console.error('Error fetching hackathons:', err);
      throw new Error('Failed to fetch hackathons');
    }
  }

  getGlobalHackathons() {
    return this.globalHackathons;
  }

  async setGlobalHackathons(hacks) {
      this.globalHackathons = hacks;
  }

  async saveHackathon(userEmail, hackathonData) {
    const { data, error } = await supabase
      .from('saved_hackathons')
      .insert([{
        user_email: userEmail,
        ...hackathonData
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteSavedHackathon(userEmail, name) {
    const { error } = await supabase
      .from('saved_hackathons')
      .delete()
      .eq('user_email', userEmail)
      .eq('hackathon_name', name);

    if (error) throw new Error(error.message);
    return { message: 'Removed' };
  }

  async getSavedHackathons(userEmail) {
    const { data, error } = await supabase
      .from('saved_hackathons')
      .select('*')
      .eq('user_email', userEmail);

    if (error) throw new Error(error.message);
    return data || [];
  }
}

module.exports = new HackathonService();
