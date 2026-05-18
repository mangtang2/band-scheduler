'use client'

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Calendar, Users, Activity } from "lucide-react"
import { verifyAdminPassword, checkAdminSession, logoutAdmin, deleteRoom } from "@/app/actions"

type RoomRow = {
  id: string
  name: string
  created_at: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [authed, setAuthed] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)

  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAdminSession().then((isValid) => {
      if (isValid) setAuthed(true)
      setCheckingAuth(false)
    })
  }, [])

  const [stats, setStats] = useState({
    totalRooms: 0,
    totalMembers: 0,
    totalSongs: 0,
    todayRooms: 0,
    todayMembers: 0,
    todayActiveUsers: 0,
  })

  const canSubmit = useMemo(() => password.length > 0, [password])

  useEffect(() => {
    if (!authed) return

    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayMidnight = today.toISOString()

        // 7개의 통계 쿼리를 병렬로 실행하여 응답 성능 극대화
        const [
          roomsRes,
          totalRoomsRes,
          totalMembersRes,
          totalSongsRes,
          todayRoomsRes,
          todayMembersRes,
          todayActiveRes,
        ] = await Promise.all([
          supabase
            .from("rooms")
            .select("id,name,created_at")
            .order("created_at", { ascending: false }),
          supabase.from("rooms").select("*", { count: "exact", head: true }),
          supabase.from("members").select("*", { count: "exact", head: true }),
          supabase.from("songs").select("*", { count: "exact", head: true }),
          supabase.from("rooms").select("*", { count: "exact", head: true }).gte("created_at", todayMidnight),
          supabase.from("members").select("*", { count: "exact", head: true }).gte("created_at", todayMidnight),
          supabase.from("availabilities").select("member_id").gte("created_at", todayMidnight),
        ])

        if (roomsRes.error) throw roomsRes.error
        if (totalRoomsRes.error) throw totalRoomsRes.error
        if (totalMembersRes.error) throw totalMembersRes.error
        if (totalSongsRes.error) throw totalSongsRes.error
        if (todayRoomsRes.error) throw todayRoomsRes.error
        if (todayMembersRes.error) throw todayMembersRes.error
        if (todayActiveRes.error) throw todayActiveRes.error

        if (cancelled) return

        setRooms((roomsRes.data ?? []) as RoomRow[])

        const activeMemberIds = todayActiveRes.data
          ? new Set(todayActiveRes.data.map((a: any) => a.member_id))
          : new Set()

        setStats({
          totalRooms: totalRoomsRes.count ?? 0,
          totalMembers: totalMembersRes.count ?? 0,
          totalSongs: totalSongsRes.count ?? 0,
          todayRooms: todayRoomsRes.count ?? 0,
          todayMembers: todayMembersRes.count ?? 0,
          todayActiveUsers: activeMemberIds.size,
        })
      } catch (e) {
        const message =
          typeof e === "object" && e !== null && "message" in e
            ? String((e as any).message)
            : "데이터를 불러오지 못했습니다."
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [authed, reloadNonce])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-sm text-muted-foreground">
        세션 확인 중...
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border bg-card shadow-sm p-6">
          <div className="text-lg font-semibold">관리자 비밀번호 입력</div>
          <p className="mt-1 text-sm text-muted-foreground">
            비밀번호가 맞으면 대시보드가 열립니다.
          </p>

          <form
            className="mt-6 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const { success } = await verifyAdminPassword(password)
              if (success) {
                setAuthed(true)
                return
              }
              alert("비밀번호가 올바르지 않습니다.")
            }}
          >
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="관리자 비밀번호"
              autoFocus
            />

            <button
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              type="submit"
              disabled={!canSubmit}
            >
              열기
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">관리자 대시보드</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              방 목록을 최신순으로 확인합니다.
            </p>
          </div>
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={async () => {
              await logoutAdmin()
              setAuthed(false)
              setPassword("")
              setRooms([])
              setError(null)
            }}
          >
            잠금
          </button>
        </div>

        {/* 통계 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">누적 개설된 방</div>
              <div className="text-3xl font-bold mt-2">{stats.totalRooms}개</div>
              <div className="text-xs text-primary mt-1.5 flex items-center gap-1">
                오늘 <span className="font-semibold">+{stats.todayRooms}개</span> 생성됨
              </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">누적 사용자 (멤버)</div>
              <div className="text-3xl font-bold mt-2">{stats.totalMembers}명</div>
              <div className="text-xs text-primary mt-1.5 flex items-center gap-1">
                오늘 <span className="font-semibold">+{stats.todayMembers}명</span> 등록됨
              </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">오늘 활성 사용자 (DAU)</div>
              <div className="text-3xl font-bold mt-2">{stats.todayActiveUsers}명</div>
              <div className="text-xs text-muted-foreground mt-1.5">
                오늘 시간표를 제출/수정한 사용자
              </div>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-medium">Rooms</div>
            <div className="text-xs text-muted-foreground">
              총 {rooms.length}개
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="font-medium text-destructive">에러</div>
                <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {error}
                </div>
                <button
                  className="mt-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  onClick={() => setReloadNonce((n) => n + 1)}
                >
                  다시 시도
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">방 이름</th>
                    <th className="px-4 py-3 font-medium">생성일자</th>
                    <th className="px-4 py-3 font-medium">고유 ID</th>
                    <th className="px-4 py-3 font-medium text-right">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rooms.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        방이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">
                          <Link
                            className="hover:underline underline-offset-4"
                            href={`/room/${r.id}/results`}
                          >
                            {r.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.id}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                            disabled={deletingRoomId === r.id}
                            onClick={async () => {
                              const ok = confirm(
                                `정말로 이 방을 삭제할까요?\n\n- ${r.name}\n- ${r.id}\n\n삭제하면 멤버/곡/가능시간도 함께 삭제됩니다.`
                              )
                              if (!ok) return

                              setDeletingRoomId(r.id)
                              try {
                                const { success, error } = await deleteRoom(r.id)
                                if (!success) throw new Error(error || "삭제에 실패했습니다.")
                                setRooms((prev) => prev.filter((x) => x.id !== r.id))
                              } catch (e) {
                                const message =
                                  typeof e === "object" &&
                                  e !== null &&
                                  "message" in e
                                    ? String((e as any).message)
                                    : "삭제에 실패했습니다."
                                alert(
                                  `방 삭제에 실패했습니다.\n\n${message}\n\n(참고) Supabase RLS에서 rooms 테이블 DELETE 정책이 없으면 삭제가 거부될 수 있습니다.`
                                )
                              } finally {
                                setDeletingRoomId(null)
                              }
                            }}
                          >
                            {deletingRoomId === r.id ? "삭제 중..." : "삭제"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

