'use client'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase, Room, Member, Song } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AvailabilityGrid } from "@/components/availability-grid"
import { ArrowRight } from "lucide-react"

export default function RoomPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const roomId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([])
  const [availabilities, setAvailabilities] = useState<
    { start: Date; end: Date }[]
  >([])

  useEffect(() => {
    if (!roomId) return
    loadRoomData()
  }, [roomId])

  const loadRoomData = async () => {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single()

      if (roomError) throw roomError
      setRoom(roomData)

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("room_id", roomId)

      if (membersError || !membersData) throw membersError
      setMembers(membersData)

      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select("*")
        .eq("room_id", roomId)

      if (songsError || !songsData) throw songsError
      setSongs(songsData)
    } catch (error) {
      console.error("Error loading room:", error)
      alert("방 정보를 불러올 수 없습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleMemberSelect = async (member: Member) => {
    setSelectedMember(member)

    // Load existing availabilities
    const { data, error } = await supabase
      .from("availabilities")
      .select("*")
      .eq("member_id", member.id)
      .eq("room_id", roomId)

    if (!error && data) {
      const blocks = data.map((a) => ({
        start: new Date(a.start_time),
        end: new Date(a.end_time),
      }))
      setAvailabilities(blocks)
    }

    // Auto-select songs this member is assigned to
    const memberSongs = songs.filter((song) =>
      song.required_member_ids.includes(member.id)
    )
    setSelectedSongIds(memberSongs.map((s) => s.id))
  }

  const toggleSong = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    )
  }

  const saveAvailability = async () => {
    if (!selectedMember) {
      alert("멤버를 선택해주세요.")
      return
    }

    if (availabilities.length === 0) {
      alert("가능한 시간을 선택해주세요.")
      return
    }

    setSaving(true)

    try {
      // Delete existing availabilities
      await supabase
        .from("availabilities")
        .delete()
        .eq("member_id", selectedMember.id)
        .eq("room_id", roomId)

      // Insert new availabilities
      const records = availabilities.map((block) => ({
        member_id: selectedMember.id,
        room_id: roomId,
        start_time: block.start.toISOString(),
        end_time: block.end.toISOString(),
      }))

      const { error } = await supabase
        .from("availabilities")
        .insert(records)

      if (error) throw error

      alert("가능 시간이 저장되었습니다!")
      router.push(`/room/${roomId}/results`)
    } catch (error) {
      console.error("Error saving availability:", error)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">방을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
          <p className="text-muted-foreground">
            {room.start_date} ~ {room.end_date}
          </p>
        </div>

        {!selectedMember ? (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">당신의 이름을 선택하세요</h2>
            <div className="space-y-2">
              {members.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => handleMemberSelect(member)}
                >
                  <span className="text-lg">{member.name}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                안녕하세요, {selectedMember.name}님!
              </h2>

              <div className="mb-6">
                <Label className="text-base mb-3 block">참여할 곡을 선택하세요:</Label>
                <div className="space-y-2">
                  {songs.map((song) => {
                    const isRequired = song.required_member_ids.includes(
                      selectedMember.id
                    )
                    return (
                      <div key={song.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedSongIds.includes(song.id)}
                          onCheckedChange={() => toggleSong(song.id)}
                        />
                        <span className="text-sm">
                          {song.title}
                          {isRequired && (
                            <span className="ml-2 text-xs text-primary">(필수)</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                가능한 시간을 선택하세요
              </h3>
              <AvailabilityGrid
                startDate={new Date(room.start_date)}
                endDate={new Date(room.end_date)}
                startHour={room.daily_start_hour ?? 9}
                endHour={room.daily_end_hour ?? 23}
                onSelectionChange={setAvailabilities}
                initialSelections={availabilities}
              />
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedMember(null)
                  setAvailabilities([])
                }}
                className="flex-1"
              >
                멤버 다시 선택
              </Button>
              <Button
                onClick={saveAvailability}
                disabled={saving || availabilities.length === 0}
                className="flex-1"
              >
                {saving ? "저장 중..." : "저장하고 결과 보기"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

