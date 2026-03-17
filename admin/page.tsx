'use client'

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

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
  const ADMIN_PASSWORD = "minjun_admin_1234"

  const [password, setPassword] = useState("")
  const [authed, setAuthed] = useState(false)

  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => password.length > 0, [password])

  useEffect(() => {
    if (!authed) return

    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("id,name,created_at")
          .order("created_at", { ascending: false })

        if (error) throw error
        if (cancelled) return
        setRooms((data ?? []) as RoomRow[])
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
  }, [authed])

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
            onSubmit={(e) => {
              e.preventDefault()
              if (password === ADMIN_PASSWORD) {
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
            onClick={() => {
              setAuthed(false)
              setPassword("")
              setRooms([])
              setError(null)
            }}
          >
            잠금
          </button>
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
                  onClick={() => setAuthed(true)}
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rooms.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        방이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{r.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.id}
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

