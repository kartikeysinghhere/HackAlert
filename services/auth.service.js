const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const { JWT_SECRET } = require('../config/env');

class AuthService {
  async signup(userData) {
    const { email, password, name, username, gender, college, skills, bio } = userData;

    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      const error = new Error('User already exists');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
        name,
        username,
        gender,
        college,
        skills,
        bio,
        last_seen: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const token = jwt.sign({ email, name, username }, JWT_SECRET, { expiresIn: '7d' });
    return { token, user: { email, name, username } };
  }

  async login(email, password) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      { email: user.email, name: user.name, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: { email: user.email, name: user.name, username: user.username }
    };
  }
}

module.exports = new AuthService();
