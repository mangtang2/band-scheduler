'use client'

import KakaoAdFit from '@/components/KakaoAdFit';
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase, Room, Member, Song, Availability } from "@/lib/supabase"
import { ResultsHeatmap } from "@/components/results-heatmap"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  generateHeatmap,
  generateRecommendations,
  formatDuration,
  SongRecommendation,
} from "@/lib/utils/schedule"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar, Clock, Users } from "lucide-react"

export default function ResultsPage() {
  const params = useParams<{ id: string }>()
  const roomId = params.id

  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [minDuration, setMinDuration] = useState(60) // minutes
  const [recommendations, setRecommendations] = useState<SongRecommendation[]>([])
  const [requiredFilters, setRequiredFilters] = useState<Record<string, string[]>>({})
  const [selectedHeatmapTs, setSelectedHeatmapTs] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    if (!roomId) return
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

      const { data: availData, error: availError } = await supabase
        .from("availabilities")
        .select("*")
        .eq("room_id", roomId)

      if (availError || !availData) throw availError
      setAvailabilities(availData)

      const initialFilters: Record<string, string[]> = {}
      songsData.forEach((song) => {
        initialFilters[song.id] = song.required_member_ids
      })
      setRequiredFilters(initialFilters)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  const calculateRecommendations = useCallback(() => {
    if (!room) return

    const recs = generateRecommendations(
      songs,
      availabilities,
      members,
      new Date(room.start_date),
      new Date(room.end_date),
      minDuration,
      requiredFilters
    )
    setRecommendations(recs)
  }, [room, songs, availabilities, members, minDuration, requiredFilters])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (room && members.length > 0 && songs.length > 0) {
      calculateRecommendations()
    }
  }, [calculateRecommendations, room, members.length, songs.length])

  const toggleRequiredMember = (songId: string, memberId: string) => {
    setRequiredFilters((prev) => {
      const current =
        prev[songId] ??
        songs.find((s) => s.id === songId)?.required_member_ids ??
        []
      const next = current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
      return { ...prev, [songId]: next }
    })
  }

  const getMemberName = (memberId: string): string => {
    return members.find((m) => m.id === memberId)?.name || "알 수 없음"
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

  const heatmapData = generateHeatmap(
    availabilities,
    new Date(room.start_date),
    new Date(room.end_date),
    room.daily_start_hour ?? 9,
    room.daily_end_hour ?? 23
  )

  const maxCount = Math.max(...heatmapData.map((d) => d.count), 1)
  const memberNames = new Map(members.map((m) => [m.id, m.name]))
  const allMemberIds = members.map((m) => m.id)
  const selectedCell =
    selectedHeatmapTs != null
      ? heatmapData.find((c) => c.timestamp === selectedHeatmapTs) ?? null
      : null
  
  // 1. Identify members who have EVER marked their time (have any records in availabilities)
  const memberIdsWithAnyData = new Set(availabilities.map((a) => a.member_id))
  
  const availableIds = new Set(selectedCell?.memberIds ?? [])
  
  // 2. Not Participating: Marked time but not available at this cell
  const unavailableIds = allMemberIds.filter(
    (id) => !availableIds.has(id) && memberIdsWithAnyData.has(id)
  )
  
  // 3. Haven't Marked Time: No records at all
  const notRespondedIds = allMemberIds.filter((id) => !memberIdsWithAnyData.has(id))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
          <p className="text-muted-foreground">연습 일정 추천 결과</p>
        </div>

        {/* Heatmap Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">전체 가능 시간 현황</h2>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Left heatmap (3/4) */}
              <div className="md:w-3/4 w-full">
                <ResultsHeatmap
                  heatmapData={heatmapData}
                  startDate={new Date(room.start_date)}
                  endDate={new Date(room.end_date)}
                  maxCount={maxCount}
                  memberNames={memberNames}
                  startHour={room.daily_start_hour ?? 9}
                  endHour={room.daily_end_hour ?? 23}
                  selectedTimestamp={selectedHeatmapTs}
                  onSelectTimestamp={(ts) => setSelectedHeatmapTs(ts)}
                  onHoverTimestamp={(ts) => {
                    if (ts == null) return
                    setSelectedHeatmapTs(ts)
                  }}
                />
              </div>

              {/* Right sidebar (1/4) - 명단 및 광고 영역 */}
              <div className="md:w-1/4 w-full flex flex-col gap-4">
                {/* 기존: 참여 현황 박스 */}
                <div className="rounded-lg border bg-background p-4 flex-1">
                  <div className="font-semibold">참여 현황</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    히트맵에 커서를 올리면 해당 시간 기준으로 자동 분류됩니다.
                  </p>

                  <div className="mt-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      현재 시간
                    </div>
                    <div className="mt-1 text-sm">
                      {selectedCell
                        ? format(new Date(selectedCell.timestamp), "M/d (EEE) HH:mm", {
                            locale: ko,
                          })
                        : "히트맵에 커서를 올려주세요"}
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    <div>
                      <div className="text-sm font-semibold text-primary">
                        참여 가능 ({selectedCell ? selectedCell.memberIds.length : 0})
                      </div>
                      <div className="mt-2 space-y-1">
                        {selectedCell && selectedCell.memberIds.length > 0 ? (
                          selectedCell.memberIds
                            .map((id) => memberNames.get(id) || "알 수 없음")
                            .map((name) => (
                              <div key={name} className="text-sm">
                                {name}
                              </div>
                            ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {selectedCell ? "없음" : "-"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-muted-foreground">
                        참여 불가능 ({selectedCell ? unavailableIds.length : 0})
                      </div>
                      <div className="mt-2 space-y-1">
                        {selectedCell ? (
                          unavailableIds.length > 0 ? (
                            unavailableIds
                              .map((id) => memberNames.get(id) || "알 수 없음")
                              .map((name) => (
                                <div key={name} className="text-sm text-muted-foreground">
                                  {name}
                                </div>
                              ))
                          ) : (
                            <div className="text-sm text-muted-foreground">없음</div>
                          )
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-orange-500">
                        표시하지 않은 인원 ({selectedCell ? notRespondedIds.length : 0})
                      </div>
                      <div className="mt-2 space-y-1">
                        {selectedCell ? (
                          notRespondedIds.length > 0 ? (
                            notRespondedIds
                              .map((id) => memberNames.get(id) || "알 수 없음")
                              .map((name) => (
                                <div key={name} className="text-sm text-orange-500/70">
                                  {name}
                                </div>
                              ))
                          ) : (
                            <div className="text-sm text-muted-foreground">없음</div>
                          )
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🔴 신규: 광고 박스 (명단 바로 아래에 착 붙습니다!) */}
                <div className="rounded-lg border bg-background p-4 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground mb-2">스폰서 광고</span>
                  <KakaoAdFit />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Duration Filter */}
        <div className="mb-8 bg-card border rounded-lg p-6">
          <Label className="text-base mb-4 block">최소 연습 시간 필터</Label>
          <div className="flex items-center gap-6">
            <Slider
              value={[minDuration]}
              onValueChange={([value]) => setMinDuration(value)}
              min={30}
              max={240}
              step={30}
              className="flex-1"
            />
            <div className="text-lg font-semibold min-w-[100px]">
              {formatDuration(minDuration)}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="text-2xl font-semibold mb-6">곡별 추천 연습 시간</h2>

          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              아직 입력된 가능 시간이 없습니다.
            </div>
          ) : (
            <div className="space-y-6">
              {recommendations.map((rec) => (
                <div
                  key={rec.songId}
                  className="bg-card border rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {rec.songTitle}
                      </h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>필요 멤버 (체크된 멤버 전원 참석 시 추천):</span>
                        </div>
                        {rec.requiredMemberIds.map((memberId) => {
                          const checked = (
                            requiredFilters[rec.songId] ??
                            rec.requiredMemberIds
                          ).includes(memberId)
                          return (
                            <label
                              key={memberId}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={checked}
                                onChange={() =>
                                  toggleRequiredMember(rec.songId, memberId)
                                }
                              />
                              <span>{getMemberName(memberId)}</span>
                            </label>
                          )
                        })}
                        <p className="text-xs text-muted-foreground mt-1">
                          체크 해제된 멤버는 빠져도 되는 인원으로 간주합니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {rec.slots.length === 0 ? (
                    <div className="text-muted-foreground py-4">
                      조건을 만족하는 시간대가 없습니다. 최소 시간을 줄여보세요.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rec.slots.slice(0, 5).map((slot, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-medium">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {format(slot.start, "M월 d일 (EEE)", {
                                  locale: ko,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {format(slot.start, "HH:mm")} -{" "}
                                {format(slot.end, "HH:mm")} (
                                {formatDuration(slot.durationMinutes)})
                              </span>
                            </div>
                            {slot.missingMemberIds.length > 0 && (
                              <div className="mt-1 text-xs text-red-500">
                                빠지는 멤버:{" "}
                                {slot.missingMemberIds
                                  .map(getMemberName)
                                  .join(", ")}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {slot.memberCount}/{rec.requiredMemberIds.length}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              참석 가능
                            </div>
                          </div>
                        </div>
                      ))}

                      {rec.slots.length > 5 && (
                        <div className="text-sm text-muted-foreground text-center pt-2">
                          외 {rec.slots.length - 5}개의 시간대가 더 있습니다
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share link */}
        <div className="mt-12 bg-muted/50 border rounded-lg p-6">
          <h3 className="font-semibold mb-2">멤버들에게 공유하기</h3>
          <p className="text-sm text-muted-foreground mb-3">
            아래 링크를 복사하여 밴드 멤버들에게 공유하세요
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/room/${roomId}`
                  : ""
              }
              className="flex-1 px-3 py-2 bg-background border rounded-md text-sm"
            />
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  const url = `${window.location.origin}/room/${roomId}`
                  navigator.clipboard.writeText(url)
                  alert("링크가 복사되었습니다!")
                }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              복사
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}