import { create } from 'zustand'
import { Member, Song } from '@/lib/supabase'

interface TimeBlock {
  startTime: Date
  endTime: Date
}

interface ScheduleStore {
  selectedMember: Member | null
  setSelectedMember: (member: Member | null) => void
  
  selectedSongs: string[]
  toggleSong: (songId: string) => void
  setSongs: (songIds: string[]) => void
  
  availabilities: TimeBlock[]
  addAvailability: (block: TimeBlock) => void
  removeAvailability: (index: number) => void
  clearAvailabilities: () => void
  setAvailabilities: (blocks: TimeBlock[]) => void
  
  minimumDuration: number
  setMinimumDuration: (duration: number) => void
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  selectedMember: null,
  setSelectedMember: (member) => set({ selectedMember: member }),
  
  selectedSongs: [],
  toggleSong: (songId) =>
    set((state) => ({
      selectedSongs: state.selectedSongs.includes(songId)
        ? state.selectedSongs.filter((id) => id !== songId)
        : [...state.selectedSongs, songId],
    })),
  setSongs: (songIds) => set({ selectedSongs: songIds }),
  
  availabilities: [],
  addAvailability: (block) =>
    set((state) => ({
      availabilities: [...state.availabilities, block],
    })),
  removeAvailability: (index) =>
    set((state) => ({
      availabilities: state.availabilities.filter((_, i) => i !== index),
    })),
  clearAvailabilities: () => set({ availabilities: [] }),
  setAvailabilities: (blocks) => set({ availabilities: blocks }),
  
  minimumDuration: 60, // Default 1 hour in minutes
  setMinimumDuration: (duration) => set({ minimumDuration: duration }),
}))
