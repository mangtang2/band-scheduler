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

-- Public read access (no authentication required)
CREATE POLICY "Allow public read on rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on rooms" ON rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read on members" ON members FOR SELECT USING (true);
CREATE POLICY "Allow public insert on members" ON members FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on songs" ON songs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on songs" ON songs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on availabilities" ON availabilities FOR SELECT USING (true);
CREATE POLICY "Allow public insert on availabilities" ON availabilities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on availabilities" ON availabilities FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on availabilities" ON availabilities FOR DELETE USING (true);
