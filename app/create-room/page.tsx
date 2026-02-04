'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { X, Plus } from "lucide-react"

interface Member {
  name: string
}

interface Song {
  title: string
  memberIndices: number[]
}

export default function CreateRoomPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Room details
  const [roomName, setRoomName] = useState("")
  const [password, setPassword] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [dailyStartHour, setDailyStartHour] = useState(9)
  const [dailyEndHour, setDailyEndHour] = useState(23)

  // Step 2: Members
  const [members, setMembers] = useState<Member[]>([{ name: "" }])

  // Step 3: Songs
  const [songs, setSongs] = useState<Song[]>([{ title: "", memberIndices: [] }])

  const addMember = () => {
    setMembers([...members, { name: "" }])
  }

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  const updateMember = (index: number, name: string) => {
    const updated = [...members]
    updated[index].name = name
    setMembers(updated)
  }

  const addSong = () => {
    setSongs([...songs, { title: "", memberIndices: [] }])
  }

  const removeSong = (index: number) => {
    setSongs(songs.filter((_, i) => i !== index))
  }

  const updateSongTitle = (index: number, title: string) => {
    const updated = [...songs]
    updated[index].title = title
    setSongs(updated)
  }

  const toggleSongMember = (songIndex: number, memberIndex: number) => {
    const updated = [...songs]
    const song = updated[songIndex]

    if (song.memberIndices.includes(memberIndex)) {
      song.memberIndices = song.memberIndices.filter((i) => i !== memberIndex)
    } else {
      song.memberIndices = [...song.memberIndices, memberIndex]
    }

    setSongs(updated)
  }

  const createRoom = async () => {
    setLoading(true)

    try {
      // Create room
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .insert({
          name: roomName,
          password: password || null,
          start_date: startDate,
          end_date: endDate,
          daily_start_hour: dailyStartHour,
          daily_end_hour: dailyEndHour,
        })
        .select()
        .single()

      if (roomError || !room) throw roomError

      // Create members
      const memberRecords = members
        .filter((m) => m.name.trim())
        .map((m) => ({
          room_id: room.id,
          name: m.name.trim(),
        }))

      const { data: createdMembers, error: membersError } = await supabase
        .from("members")
        .insert(memberRecords)
        .select()

      if (membersError || !createdMembers) throw membersError

      // Create songs with member IDs
      const songRecords = songs
        .filter((s) => s.title.trim())
        .map((s) => ({
          room_id: room.id,
          title: s.title.trim(),
          required_member_ids: s.memberIndices.map((idx) => createdMembers[idx].id),
        }))

      const { error: songsError } = await supabase
        .from("songs")
        .insert(songRecords)

      if (songsError) throw songsError

      // Redirect to room page
      router.push(`/room/${room.id}`)
    } catch (error) {
      console.error("Error creating room:", error)
      alert("방 생성 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (!roomName || !startDate || !endDate) {
        alert("모든 필수 항목을 입력해주세요.")
        return
      }
      if (new Date(startDate) > new Date(endDate)) {
        alert("종료일은 시작일보다 늦어야 합니다.")
        return
      }
      if (dailyStartHour >= dailyEndHour) {
        alert("하루 시작 시각은 종료 시각보다 이른 시간이어야 합니다.")
        return
      }
    }

    if (step === 2) {
      if (members.filter((m) => m.name.trim()).length === 0) {
        alert("최소 1명의 멤버를 추가해주세요.")
        return
      }
    }

    setStep(step + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">새 방 만들기</h1>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="text-sm text-center text-muted-foreground">
            {step === 1 && "방 정보"}
            {step === 2 && "멤버 등록"}
            {step === 3 && "곡 등록"}
          </div>
        </div>

        {/* Step 1: Room Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="roomName">방 이름 *</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="예: 2월 연습 일정"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">비밀번호 (선택)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비워두면 누구나 접근 가능"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">시작일 *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">종료일 *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dailyStart">하루 시작 시각 *</Label>
                <select
                  id="dailyStart"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={dailyStartHour}
                  onChange={(e) => setDailyStartHour(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dailyEnd">하루 종료 시각 *</Label>
                <select
                  id="dailyEnd"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={dailyEndHour}
                  onChange={(e) => setDailyEndHour(Number(e.target.value))}
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button onClick={handleNext} className="w-full">
              다음
            </Button>
          </div>
        )}

        {/* Step 2: Members */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label>멤버 목록 *</Label>
              <div className="mt-2 space-y-3">
                {members.map((member, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={member.name}
                      onChange={(e) => updateMember(idx, e.target.value)}
                      placeholder={`멤버 ${idx + 1} 이름`}
                    />
                    {members.length > 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeMember(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={addMember}
                className="w-full mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                멤버 추가
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                이전
              </Button>
              <Button onClick={handleNext} className="flex-1">
                다음
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Songs */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <Label>곡 목록 및 필요 멤버</Label>
              <div className="mt-2 space-y-4">
                {songs.map((song, songIdx) => (
                  <div key={songIdx} className="border rounded-lg p-4">
                    <div className="flex gap-2 mb-3">
                      <Input
                        value={song.title}
                        onChange={(e) => updateSongTitle(songIdx, e.target.value)}
                        placeholder={`곡 ${songIdx + 1} 제목`}
                      />
                      {songs.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeSong(songIdx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">필요한 멤버:</div>
                      {members
                        .filter((m) => m.name.trim())
                        .map((member, memberIdx) => (
                          <div key={memberIdx} className="flex items-center gap-2">
                            <Checkbox
                              checked={song.memberIndices.includes(memberIdx)}
                              onCheckedChange={() =>
                                toggleSongMember(songIdx, memberIdx)
                              }
                            />
                            <span className="text-sm">{member.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={addSong}
                className="w-full mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                곡 추가
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                이전
              </Button>
              <Button onClick={createRoom} disabled={loading} className="flex-1">
                {loading ? "생성 중..." : "방 만들기"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

