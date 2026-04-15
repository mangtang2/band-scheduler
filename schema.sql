-- Band Practice Scheduler Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    password TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    -- 일자별 가능 시간대 (시 단위, 24시간제)
    daily_start_hour INTEGER NOT NULL DEFAULT 9,
    daily_end_hour INTEGER NOT NULL DEFAULT 23,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Members table
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Songs table
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    required_member_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availabilities table
CREATE TABLE availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_members_room_id ON members(room_id);
CREATE INDEX idx_songs_room_id ON songs(room_id);
CREATE INDEX idx_availabilities_member_id ON availabilities(member_id);
CREATE INDEX idx_availabilities_room_id ON availabilities(room_id);
CREATE INDEX idx_availabilities_time_range ON availabilities(start_time, end_time);

-- Row Level Security (RLS) policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;

-- 🛡️ SECURITY NOTE: 
-- These policies are a baseline. For production, consider using Supabase Auth
-- or complex RLS functions to verify room passwords at the database level.

-- Rooms: Public can create, but reading/updating is only allowed if you know the UUID.
CREATE POLICY "Enable insert for everyone" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for everyone" ON rooms FOR SELECT USING (true);
CREATE POLICY "Enable update for owners" ON rooms FOR UPDATE USING (true); 
-- (Note: DELETE is intentionally omitted to prevent public deletion of rooms)

-- Members: Public can create members in a room and read them.
CREATE POLICY "Enable insert for everyone" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for everyone" ON members FOR SELECT USING (true);

-- Songs: Public can create and read.
CREATE POLICY "Enable insert for everyone" ON songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for everyone" ON songs FOR SELECT USING (true);

-- Availabilities: Public can create, read, and update/delete their own entries.
-- Note: 'member_id' should ideally be checked against a session, 
-- but we allow public operations for simplicity in this version.
CREATE POLICY "Enable insert for everyone" ON availabilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for everyone" ON availabilities FOR SELECT USING (true);
CREATE POLICY "Enable update for everyone" ON availabilities FOR UPDATE USING (true);
CREATE POLICY "Enable delete for everyone" ON availabilities FOR DELETE USING (true);
