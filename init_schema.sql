-- 1. Enable RLS on existing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_reviews ENABLE ROW LEVEL SECURITY;

-- 2. Create Chat Memory Tables
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT,
    tool_calls JSONB,
    tool_call_id TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Define basic policies
-- Users can only read public fields or their own private fields (simplified for this migration)
CREATE POLICY "Users can read all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update themselves" ON users FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Chat policies (only the owner can see their threads)
CREATE POLICY "Users can manage their threads" ON chat_threads 
  FOR ALL USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can manage their messages" ON chat_messages 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_threads 
      WHERE id = chat_messages.thread_id 
      AND user_email = auth.jwt() ->> 'email'
    )
  );

-- Function to handle timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_threads_updated_at
    BEFORE UPDATE ON chat_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
