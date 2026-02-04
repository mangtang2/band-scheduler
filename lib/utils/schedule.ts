import { Availability, Member, Song } from "@/lib/supabase"

export interface HeatmapCell {
  timestamp: number
  count: number
  memberIds: string[]
}

export interface SongSlot {
  start: Date
  end: Date
  durationMinutes: number
  memberCount: number
  availableMemberIds: string[]
  missingMemberIds: string[]
}

export interface SongRecommendation {
  songId: string
  songTitle: string
  requiredMemberIds: string[]
  slots: SongSlot[]
}

const SLOT_MINUTES = 30

export function generateHeatmap(
  availabilities: Availability[],
  startDate: Date,
  endDate: Date,
  startHour = 9,
  endHour = 23
): HeatmapCell[] {
  const cellsMap = new Map<number, Set<string>>()

  // 1) 실제 가능 시간들을 슬롯별로 집계
  for (const avail of availabilities) {
    const start = new Date(avail.start_time)
    const end = new Date(avail.end_time)

    const current = new Date(start)
    while (current < end) {
      const ts = current.getTime()
      if (!cellsMap.has(ts)) {
        cellsMap.set(ts, new Set())
      }
      cellsMap.get(ts)!.add(avail.member_id)
      current.setMinutes(current.getMinutes() + SLOT_MINUTES)
    }
  }

  // 2) 기간 전체(시작일~종료일, 9~23시 / 30분 간격)에 대해
  //    모든 슬롯을 만들어서, 한 명도 없으면 count=0으로 채워줌
  const result: HeatmapCell[] = []

  const dayCursor = new Date(startDate)
  dayCursor.setHours(0, 0, 0, 0)
  const endDay = new Date(endDate)
  endDay.setHours(0, 0, 0, 0)

  while (dayCursor <= endDay) {
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const slotDate = new Date(dayCursor)
        slotDate.setHours(hour, minute, 0, 0)
        const ts = slotDate.getTime()
        const members = cellsMap.get(ts) ?? new Set<string>()
        result.push({
          timestamp: ts,
          count: members.size,
          memberIds: Array.from(members),
        })
      }
    }

    dayCursor.setDate(dayCursor.getDate() + 1)
  }

  return result
}

export function generateRecommendations(
  songs: Song[],
  availabilities: Availability[],
  members: Member[],
  startDate: Date,
  endDate: Date,
  minDurationMinutes: number,
  perSongMandatoryMembers?: Record<string, string[]>
): SongRecommendation[] {
  const result: SongRecommendation[] = []

  // Pre-group availabilities by member
  const memberAvailMap = new Map<string, Availability[]>()
  for (const avail of availabilities) {
    if (!memberAvailMap.has(avail.member_id)) {
      memberAvailMap.set(avail.member_id, [])
    }
    memberAvailMap.get(avail.member_id)!.push(avail)
  }

  for (const song of songs) {
    const requiredMembers = song.required_member_ids
    if (requiredMembers.length === 0) continue

    const mandatoryMembers =
      perSongMandatoryMembers?.[song.id] && perSongMandatoryMembers[song.id].length > 0
        ? perSongMandatoryMembers[song.id]
        : requiredMembers

    const slots: SongSlot[] = []

    // Build availability heat per slot specifically for required members
    const slotMap = new Map<number, Set<string>>()

    for (const memberId of requiredMembers) {
      const memberAvails = memberAvailMap.get(memberId) || []

      for (const avail of memberAvails) {
        const start = new Date(avail.start_time)
        const end = new Date(avail.end_time)

        const current = new Date(start)
        while (current < end) {
          const ts = current.getTime()
          if (!slotMap.has(ts)) {
            slotMap.set(ts, new Set())
          }
          slotMap.get(ts)!.add(memberId)
          current.setMinutes(current.getMinutes() + SLOT_MINUTES)
        }
      }
    }

    const sortedSlots = Array.from(slotMap.entries())
      .map(([timestamp, membersSet]) => ({
        timestamp,
        memberIds: Array.from(membersSet),
      }))
      .sort((a, b) => a.timestamp - b.timestamp)

    // Merge consecutive slots with full attendance into ranges
    let rangeStart: number | null = null
    let rangeEnd: number | null = null
    let rangeMembersPresentAllSlots: Set<string> | null = null

    const requiredCount = mandatoryMembers.length

    for (let i = 0; i < sortedSlots.length; i++) {
      const { timestamp, memberIds } = sortedSlots[i]
      const hasMandatory =
        mandatoryMembers.every((id) => memberIds.includes(id))

      if (hasMandatory) {
        if (rangeStart === null) {
          rangeStart = timestamp
          rangeEnd = timestamp + SLOT_MINUTES * 60 * 1000
          rangeMembersPresentAllSlots = new Set(memberIds)
        } else if (timestamp === rangeEnd) {
          rangeEnd = timestamp + SLOT_MINUTES * 60 * 1000
          if (rangeMembersPresentAllSlots) {
            const currentSet = new Set(memberIds)
            rangeMembersPresentAllSlots = new Set(
              Array.from(rangeMembersPresentAllSlots).filter((id) =>
                currentSet.has(id as string)
              )
            )
          }
        } else {
          // Gap: close previous range
          const durationMinutes = (rangeEnd! - rangeStart) / (60 * 1000)
          if (durationMinutes >= minDurationMinutes) {
            const availableAllRequired =
              rangeMembersPresentAllSlots
                ? Array.from(rangeMembersPresentAllSlots).filter((id) =>
                    requiredMembers.includes(id)
                  )
                : []
            const missing = requiredMembers.filter(
              (id) => !availableAllRequired.includes(id)
            )
            slots.push({
              start: new Date(rangeStart),
              end: new Date(rangeEnd!),
              durationMinutes,
              memberCount: availableAllRequired.length,
              availableMemberIds: availableAllRequired,
              missingMemberIds: missing,
            })
          }
          rangeStart = timestamp
          rangeEnd = timestamp + SLOT_MINUTES * 60 * 1000
          rangeMembersPresentAllSlots = new Set(memberIds)
        }
      } else {
        // Close range if currently open
        if (rangeStart !== null && rangeEnd !== null) {
          const durationMinutes = (rangeEnd - rangeStart) / (60 * 1000)
          if (durationMinutes >= minDurationMinutes) {
            const availableAllRequired =
              rangeMembersPresentAllSlots
                ? Array.from(rangeMembersPresentAllSlots).filter((id) =>
                    requiredMembers.includes(id)
                  )
                : []
            const missing = requiredMembers.filter(
              (id) => !availableAllRequired.includes(id)
            )
            slots.push({
              start: new Date(rangeStart),
              end: new Date(rangeEnd),
              durationMinutes,
              memberCount: availableAllRequired.length,
              availableMemberIds: availableAllRequired,
              missingMemberIds: missing,
            })
          }
        }
        rangeStart = null
        rangeEnd = null
        rangeMembersPresentAllSlots = null
      }
    }

    // Finalize last range
    if (rangeStart !== null && rangeEnd !== null) {
      const durationMinutes = (rangeEnd - rangeStart) / (60 * 1000)
      if (durationMinutes >= minDurationMinutes) {
      const availableAllRequired =
        rangeMembersPresentAllSlots
          ? Array.from(rangeMembersPresentAllSlots).filter((id) =>
              requiredMembers.includes(id)
            )
          : []
      const missing = requiredMembers.filter(
        (id) => !availableAllRequired.includes(id)
      )
        slots.push({
          start: new Date(rangeStart),
          end: new Date(rangeEnd),
          durationMinutes,
        memberCount: availableAllRequired.length,
        availableMemberIds: availableAllRequired,
        missingMemberIds: missing,
        })
      }
    }

    // Sort slots by member count (desc) then duration (desc)
    slots.sort((a, b) => {
      if (b.memberCount !== a.memberCount) {
        return b.memberCount - a.memberCount
      }
      return b.durationMinutes - a.durationMinutes
    })

    result.push({
      songId: song.id,
      songTitle: song.title,
      requiredMemberIds: requiredMembers,
      slots,
    })
  }

  // Sort songs by best slot (most participants, longest duration)
  result.sort((a, b) => {
    const aBest = a.slots[0]
    const bBest = b.slots[0]
    if (!aBest && !bBest) return 0
    if (!aBest) return 1
    if (!bBest) return -1

    if (bBest.memberCount !== aBest.memberCount) {
      return bBest.memberCount - aBest.memberCount
    }
    return bBest.durationMinutes - aBest.durationMinutes
  })

  return result
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}분`
  if (mins === 0) return `${hours}시간`
  return `${hours}시간 ${mins}분`
}

