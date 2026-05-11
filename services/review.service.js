const supabase = require('../config/db');

class ReviewService {
  async getReviews(hackathonName) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('hackathon_name', hackathonName)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async addReview(user, reviewData) {
    const { hackathon_name, rating, comment } = reviewData;
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        hackathon_name,
        user_email: user.email,
        user_name: user.name,
        rating,
        comment
      }])
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteReview(userEmail, hackathonName) {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('hackathon_name', hackathonName)
      .eq('user_email', userEmail);
    if (error) throw new Error(error.message);
    return { message: 'Review deleted' };
  }
}

module.exports = new ReviewService();
