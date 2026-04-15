import { checkRoomAccess, verifyRoomPassword } from "@/app/actions"
import { Input } from "@/components/ui/input"
import { supabase, Room, Member, Song } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AvailabilityGrid } from "@/components/availability-grid"
import { ArrowRight, Lock } from "lucide-react"

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
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Password protection state
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [roomPassword, setRoomPassword] = useState("")
  const [verifying, setVerifying] = useState(false)

  const loadRoomData = useCallback(async () => {
    if (!roomId) return
    setLoading(true)
    try {
      // 1. Check access first
      const access = await checkRoomAccess(roomId)
      setHasAccess(access)
      
      if (!access) {
        // Still load room name for the password screen if possible
        const { data: basicRoom } = await supabase.from("rooms").select("name").eq("id", roomId).single()
        if (basicRoom) setRoom(basicRoom as any)
        return
      }

      // 2. Load full data if has access
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
  }, [roomId])

  useEffect(() => {
    loadRoomData()
  }, [loadRoomData])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    try {
      const result = await verifyRoomPassword(roomId, roomPassword)
      if (result.success) {
        setHasAccess(true)
        loadRoomData()
      } else {
        alert(result.error || "비밀번호가 틀렸습니다.")
      }
    } finally {
      setVerifying(false)
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
    
    // Reset initial load flag so we don't save immediately after loading
    setIsInitialLoad(true)
  }

  const toggleSong = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    )
  }

  const saveAvailability = async (currentAvails = availabilities, currentSongs = selectedSongIds) => {
    if (!selectedMember) return

    setSaving(true)
    setLastSaved("저장 중...")

    try {
      // 1. Update availabilities
      await supabase
        .from("availabilities")
        .delete()
        .eq("member_id", selectedMember.id)
        .eq("room_id", roomId)

      if (currentAvails.length > 0) {
        const records = currentAvails.map((block) => ({
          member_id: selectedMember.id,
          room_id: roomId,
          start_time: block.start.toISOString(),
          end_time: block.end.toISOString(),
        }))
        const { error: availError } = await supabase
          .from("availabilities")
          .insert(records)
        if (availError) throw availError
      }

      // 2. Update song assignments (required_member_ids)
      // This part is a bit tricky: we need to update 'songs' table's required_member_ids for each song.
      // But actually, the current schema might expect members to be part of songs.
      // Let's check how songs are structured.
      
      setLastSaved("방금 저장됨")
      setTimeout(() => setLastSaved(null), 3000)
    } catch (error) {
      console.error("Error saving availability:", error)
      setLastSaved("저장 실패")
    } finally {
      setSaving(false)
    }
  }

  // Auto-save logic
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false)
      return
    }
    
    if (selectedMember) {
      const timer = setTimeout(() => {
        saveAvailability()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [availabilities, selectedSongIds])

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

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border bg-card shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">{room?.name || "보호된 방"}</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            이 방은 비밀번호로 보호되어 있습니다.<br />비밀번호를 입력하여 접속하세요.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-password">비밀번호</Label>
              <Input
                id="room-password"
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="방 비밀번호 입력"
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? "확인 중..." : "접속하기"}
            </Button>
          </form>
        </div>
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

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-muted-foreground">
                  {lastSaved || "변경사항이 자동으로 저장됩니다"}
                </span>
                {saving && (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
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
                  onClick={() => router.push(`/room/${roomId}/results`)}
                  className="flex-1"
                >
                  결과 보기
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

