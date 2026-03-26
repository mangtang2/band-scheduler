"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface TimeBlock {
  date: Date
  hour: number
  minute: number
  timestamp: number
}

interface AvailabilityGridProps {
  startDate: Date
  endDate: Date
  onSelectionChange: (blocks: { start: Date; end: Date }[]) => void
  initialSelections?: { start: Date; end: Date }[]
  startHour?: number
  endHour?: number
}

export function AvailabilityGrid({
  startDate,
  endDate,
  onSelectionChange,
  initialSelections = [],
  startHour = 9,
  endHour = 23,
}: AvailabilityGridProps) {
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionMode, setSelectionMode] = useState<"add" | "remove">("add")
  const gridRef = useRef<HTMLDivElement>(null)

  const [anchorCell, setAnchorCell] = useState<{ dayIdx: number; timeIdx: number } | null>(null)
  const [dragBaseSelected, setDragBaseSelected] = useState<Set<number> | null>(null)

  // 🚀 핵심 1: 이벤트 리스너 유실 방지를 위한 최신 상태 저장소 (Ref)
  // 렌더링 지연 없이 가장 최신의 상태를 추적하여 손가락을 떼는 순간을 절대 놓치지 않습니다.
  const stateRef = useRef({
    isSelecting,
    selectedBlocks,
    anchorCell,
    dragBaseSelected,
    selectionMode,
  })

  // 성능 최적화: 연속 드래그 시 같은 칸에서 불필요한 계산을 막기 위한 Ref
  const lastHoveredRef = useRef<{ dayIdx: number; timeIdx: number } | null>(null)

  useEffect(() => {
    stateRef.current = {
      isSelecting,
      selectedBlocks,
      anchorCell,
      dragBaseSelected,
      selectionMode,
    }
  }, [isSelecting, selectedBlocks, anchorCell, dragBaseSelected, selectionMode])

  useEffect(() => {
    const blocks = new Set<number>()
    initialSelections.forEach(({ start, end }) => {
      const current = new Date(start)
      while (current < end) {
        blocks.add(current.getTime())
        current.setMinutes(current.getMinutes() + 30)
      }
    })
    setSelectedBlocks(blocks)
  }, [initialSelections])

  const dates: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const timeSlots: { hour: number; minute: number; label: string }[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    timeSlots.push({ hour, minute: 0, label: `${hour}:00` })
    timeSlots.push({ hour, minute: 30, label: `${hour}:30` })
  }

  const allBlocks: TimeBlock[][] = dates.map((date) =>
    timeSlots.map(({ hour, minute }) => {
      const blockDate = new Date(date)
      blockDate.setHours(hour, minute, 0, 0)
      return { date, hour, minute, timestamp: blockDate.getTime() }
    })
  )

  const applyRectangleSelection = useCallback(
    (targetDayIdx: number, targetTimeIdx: number) => {
      const state = stateRef.current
      if (!state.anchorCell || !state.dragBaseSelected) return

      const next = new Set(state.dragBaseSelected)
      const dayStart = Math.min(state.anchorCell.dayIdx, targetDayIdx)
      const dayEnd = Math.max(state.anchorCell.dayIdx, targetDayIdx)
      const timeStart = Math.min(state.anchorCell.timeIdx, targetTimeIdx)
      const timeEnd = Math.max(state.anchorCell.timeIdx, targetTimeIdx)

      for (let d = dayStart; d <= dayEnd; d++) {
        for (let t = timeStart; t <= timeEnd; t++) {
          const ts = allBlocks[d][t].timestamp
          if (state.selectionMode === "add") {
            next.add(ts)
          } else {
            next.delete(ts)
          }
        }
      }
      setSelectedBlocks(next)
    },
    [allBlocks]
  )

  const handlePointerDown = (dayIdx: number, timeIdx: number) => {
    const timestamp = allBlocks[dayIdx][timeIdx].timestamp
    const mode = selectedBlocks.has(timestamp) ? "remove" : "add"
    const newBase = new Set(selectedBlocks)
    const newAnchor = { dayIdx, timeIdx }

    setIsSelecting(true)
    setSelectionMode(mode)
    setAnchorCell(newAnchor)
    setDragBaseSelected(newBase)

    // React 상태 변경을 기다리지 않고 Ref 즉시 업데이트
    stateRef.current = {
      ...stateRef.current,
      isSelecting: true,
      selectionMode: mode,
      anchorCell: newAnchor,
      dragBaseSelected: newBase,
    }

    lastHoveredRef.current = { dayIdx, timeIdx }
    applyRectangleSelection(dayIdx, timeIdx)
  }

  // 🚀 핵심 2: 마우스 및 터치 좌표 추적 공통 로직
  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!stateRef.current.isSelecting) return

      const element = document.elementFromPoint(clientX, clientY)
      if (element) {
        const dayIdxStr = element.getAttribute("data-dayidx")
        const timeIdxStr = element.getAttribute("data-timeidx")

        if (dayIdxStr !== null && timeIdxStr !== null) {
          const dayIdx = parseInt(dayIdxStr, 10)
          const timeIdx = parseInt(timeIdxStr, 10)

          const last = lastHoveredRef.current
          // 다른 칸으로 넘어갈 때만 업데이트 수행 (엄청난 성능 최적화)
          if (!last || last.dayIdx !== dayIdx || last.timeIdx !== timeIdx) {
            lastHoveredRef.current = { dayIdx, timeIdx }
            applyRectangleSelection(dayIdx, timeIdx)
          }
        }
      }
    },
    [applyRectangleSelection]
  )

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return // 모바일 터치는 onTouchMove에 온전히 위임
    handleMove(e.clientX, e.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY)
  }

  // 🚀 핵심 3: 단 한 번만 등록되어 절대 풀리지 않는 안정적인 종료 이벤트
  useEffect(() => {
    const handleGlobalEnd = () => {
      const state = stateRef.current
      if (!state.isSelecting) return

      setIsSelecting(false)
      setAnchorCell(null)
      setDragBaseSelected(null)
      lastHoveredRef.current = null

      // 시간 계산 및 데이터 상위 컴포넌트로 전송
      const sorted = Array.from(state.selectedBlocks).sort((a, b) => a - b)
      const ranges: { start: Date; end: Date }[] = []

      if (sorted.length > 0) {
        let rangeStart = sorted[0]
        let rangeEnd = rangeStart + 30 * 60 * 1000

        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] === rangeEnd) {
            rangeEnd = sorted[i] + 30 * 60 * 1000
          } else {
            ranges.push({
              start: new Date(rangeStart),
              end: new Date(rangeEnd),
            })
            rangeStart = sorted[i]
            rangeEnd = rangeStart + 30 * 60 * 1000
          }
        }
        ranges.push({ start: new Date(rangeStart), end: new Date(rangeEnd) })
      }

      onSelectionChange(ranges)
    }

    window.addEventListener("pointerup", handleGlobalEnd)
    window.addEventListener("pointercancel", handleGlobalEnd)
    window.addEventListener("touchend", handleGlobalEnd)

    return () => {
      window.removeEventListener("pointerup", handleGlobalEnd)
      window.removeEventListener("pointercancel", handleGlobalEnd)
      window.removeEventListener("touchend", handleGlobalEnd)
    }
  }, [onSelectionChange])

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div
        ref={gridRef}
        // touch-none으로 스크롤 방지, 데스크톱/모바일 이동 이벤트 명확히 분리 연결
        className="inline-block min-w-full touch-none select-none"
        onPointerMove={handlePointerMove}
        onTouchMove={handleTouchMove}
      >
        <div className="flex sticky top-0 bg-background z-10 border-b">
          <div className="w-16 flex-shrink-0" />
          {dates.map((date, idx) => (
            <div
              key={idx}
              className="flex-1 min-w-[60px] sm:min-w-[80px] px-2 py-3 text-center border-l bg-background"
            >
              <div className="text-xs font-semibold">
                {format(date, "EEE", { locale: ko })}
              </div>
              <div className="text-sm">{format(date, "M/d")}</div>
            </div>
          ))}
        </div>

        <div className="flex">
          <div className="w-16 flex-shrink-0">
            {timeSlots.map((slot, idx) => (
              <div
                key={idx}
                className="h-8 flex items-center justify-end pr-2 text-xs text-muted-foreground border-b bg-background"
              >
                {slot.minute === 0 ? slot.label : ""}
              </div>
            ))}
          </div>

          {allBlocks.map((dayBlocks, dayIdx) => (
            <div
              key={dayIdx}
              className="flex-1 min-w-[60px] sm:min-w-[80px] border-l"
            >
              {dayBlocks.map((block, timeIdx) => {
                const isSelected = selectedBlocks.has(block.timestamp)
                return (
                  <div
                    key={timeIdx}
                    data-dayidx={dayIdx}
                    data-timeidx={timeIdx}
                    className={cn(
                      "h-8 border-b cursor-pointer transition-colors select-none",
                      isSelected
                        ? "bg-primary/80 hover:bg-primary"
                        : "bg-background hover:bg-primary/20",
                      block.minute === 0 ? "border-t-2 border-t-gray-100" : ""
                    )}
                    // 이벤트 꼬임을 막기 위해 onPointerDown 단일 이벤트로 통일
                    onPointerDown={() => handlePointerDown(dayIdx, timeIdx)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-sm text-muted-foreground text-center">
        💡 드래그하여 가능한 시간대를 선택하세요
      </div>
    </div>
  )
}