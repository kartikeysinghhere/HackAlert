const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const { JWT_SECRET } = require('../config/env');
const { ApiError } = require('../utils/errorHandler');

const register = async ({ email, pass, name, username, gender, college }) => {
  const { data: existing } = await supabase.from('users').select('*').eq('email', email).single();
  if (existing) throw new ApiError(400, 'User already exists');

  const hashed_password = await bcrypt.hash(pass, 10);
  const { data, error } = await supabase
    .from('users')
    .insert([{ email, hashed_password, name, username, gender, college }])
    .select().single();

  if (error) throw new ApiError(500, error.message);

  const token = jwt.sign({ email: data.email, username: data.username }, JWT_SECRET);
  return { user: data, token };
};

const login = async ({ email, pass }) => {
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (!user || error) throw new ApiError(401, 'Invalid credentials');

  const match = await bcrypt.compare(pass, user.hashed_password);
  if (!match) throw new ApiError(401, 'Invalid credentials');

  const token = jwt.sign({ email: user.email, username: user.username }, JWT_SECRET);
  return { user, token };
};

module.exports = {
  register,
  login
};
