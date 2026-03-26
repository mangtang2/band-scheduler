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

  // 초기 선택값 세팅
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

  // 날짜 배열 생성
  const dates: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // 시간 슬롯 생성
  const timeSlots: { hour: number; minute: number; label: string }[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    timeSlots.push({ hour, minute: 0, label: `${hour}:00` })
    timeSlots.push({ hour, minute: 30, label: `${hour}:30` })
  }

  // 전체 시간 블록 데이터 생성
  const allBlocks: TimeBlock[][] = dates.map((date) =>
    timeSlots.map(({ hour, minute }) => {
      const blockDate = new Date(date)
      blockDate.setHours(hour, minute, 0, 0)
      return {
        date,
        hour,
        minute,
        timestamp: blockDate.getTime(),
      }
    })
  )

  // 💡 [수정됨] React 상태 지연 문제 해결을 위해 최신 값들을 매개변수로 직접 받도록 개선
  const applyRectangleSelection = useCallback(
    (
      targetDayIdx: number,
      targetTimeIdx: number,
      currentAnchor: { dayIdx: number; timeIdx: number },
      baseBlocks: Set<number>,
      currentMode: "add" | "remove"
    ) => {
      const next = new Set(baseBlocks)

      const dayStart = Math.min(currentAnchor.dayIdx, targetDayIdx)
      const dayEnd = Math.max(currentAnchor.dayIdx, targetDayIdx)
      const timeStart = Math.min(currentAnchor.timeIdx, targetTimeIdx)
      const timeEnd = Math.max(currentAnchor.timeIdx, targetTimeIdx)

      for (let d = dayStart; d <= dayEnd; d++) {
        for (let t = timeStart; t <= timeEnd; t++) {
          const ts = allBlocks[d][t].timestamp
          if (currentMode === "add") {
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
    
    const newAnchor = { dayIdx, timeIdx }
    const base = new Set(selectedBlocks)

    setSelectionMode(mode)
    setIsSelecting(true)
    setAnchorCell(newAnchor)
    setDragBaseSelected(base)
    
    // 상태 업데이트를 기다리지 않고 최신 값을 바로 넘겨 즉각 반응하도록 처리
    applyRectangleSelection(dayIdx, timeIdx, newAnchor, base, mode)
  }

  const handlePointerEnter = (dayIdx: number, timeIdx: number) => {
    if (isSelecting && anchorCell && dragBaseSelected) {
      applyRectangleSelection(dayIdx, timeIdx, anchorCell, dragBaseSelected, selectionMode)
    }
  }

  // 📱 [핵심 추가] 모바일 환경 터치 이동 이벤트 핸들러
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSelecting || !anchorCell || !dragBaseSelected) return

      const touch = e.touches[0]
      // 손가락 위치(물리적 픽셀)의 DOM 엘리먼트 추적
      const element = document.elementFromPoint(touch.clientX, touch.clientY)

      if (element) {
        const dayIdxStr = element.getAttribute("data-dayidx")
        const timeIdxStr = element.getAttribute("data-timeidx")

        if (dayIdxStr !== null && timeIdxStr !== null) {
          const dayIdx = parseInt(dayIdxStr, 10)
          const timeIdx = parseInt(timeIdxStr, 10)
          applyRectangleSelection(dayIdx, timeIdx, anchorCell, dragBaseSelected, selectionMode)
        }
      }
    },
    [isSelecting, anchorCell, dragBaseSelected, selectionMode, applyRectangleSelection]
  )

  const handlePointerUp = useCallback(() => {
    if (!isSelecting) return
    setIsSelecting(false)
    setAnchorCell(null)
    setDragBaseSelected(null)

    const sorted = Array.from(selectedBlocks).sort((a, b) => a - b)
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

      ranges.push({
        start: new Date(rangeStart),
        end: new Date(rangeEnd),
      })
    }

    onSelectionChange(ranges)
  }, [isSelecting, selectedBlocks, onSelectionChange])

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isSelecting) {
        handlePointerUp()
      }
    }

    window.addEventListener("pointerup", handleGlobalPointerUp)
    window.addEventListener("touchend", handleGlobalPointerUp)

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp)
      window.removeEventListener("touchend", handleGlobalPointerUp)
    }
  }, [isSelecting, handlePointerUp])

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div
        ref={gridRef}
        // 🚀 touch-none 클래스로 모바일 스와이프/스크롤 완벽 차단, onTouchMove 연결
        className="inline-block min-w-full touch-none select-none"
        onTouchMove={handleTouchMove}
      >
        {/* Header - Dates */}
        <div className="flex sticky top-0 bg-background z-10 border-b">
          <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
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

        {/* Grid */}
        <div className="flex">
          {/* Time labels */}
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

          {/* Time blocks */}
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
                    // 🎯 data 속성을 부여하여 모바일 onTouchMove 시 요소 좌표 추적에 활용
                    data-dayidx={dayIdx}
                    data-timeidx={timeIdx}
                    className={cn(
                      "h-8 border-b cursor-pointer transition-colors select-none touch-none",
                      isSelected
                        ? "bg-primary/80 hover:bg-primary"
                        : "bg-background hover:bg-primary/20",
                      block.minute === 0 ? "border-t-2 border-t-gray-100" : ""
                    )}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      handlePointerDown(dayIdx, timeIdx)
                    }}
                    onPointerEnter={() => handlePointerEnter(dayIdx, timeIdx)}
                    onTouchStart={(e) => {
                      // 기본 이벤트를 방지하여 불필요한 스크롤 및 더블클릭 방지
                      e.preventDefault() 
                      handlePointerDown(dayIdx, timeIdx)
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        💡 드래그하여 가능한 시간대를 선택하세요
      </div>
    </div>
  )
}