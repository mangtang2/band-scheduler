import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for database tables
export interface Room {
  id: string
  name: string
  password: string | null
  start_date: string
  end_date: string
  daily_start_hour?: number
  daily_end_hour?: number
  created_at: string
}

export interface Member {
  id: string
  room_id: string
  name: string
  created_at: string
}

export interface Song {
  id: string
  room_id: string
  title: string
  required_member_ids: string[]
  created_at: string
}

export interface Availability {
  id: string
  member_id: string
  room_id: string
  start_time: string
  end_time: string
  created_at: string
}

