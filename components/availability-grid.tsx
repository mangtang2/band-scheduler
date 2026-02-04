'use client'

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
  const [anchorCell, setAnchorCell] = useState<{
    dayIdx: number
    timeIdx: number
  } | null>(null)
  const [dragBaseSelected, setDragBaseSelected] = useState<Set<number> | null>(
    null
  )

  // Initialize from initial selections
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

  // Generate date range
  const dates: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // Generate time slots (30-minute intervals between configured hours)
  const timeSlots: { hour: number; minute: number; label: string }[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    timeSlots.push({ hour, minute: 0, label: `${hour}:00` })
    timeSlots.push({ hour, minute: 30, label: `${hour}:30` })
  }

  // Create all time blocks
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

  const applyRectangleSelection = useCallback(
    (dayIdx: number, timeIdx: number, mode?: "add" | "remove") => {
      if (!anchorCell) return
      const actualMode = mode || selectionMode

      const base = dragBaseSelected ?? selectedBlocks
      const next = new Set(base)

      const dayStart = Math.min(anchorCell.dayIdx, dayIdx)
      const dayEnd = Math.max(anchorCell.dayIdx, dayIdx)
      const timeStart = Math.min(anchorCell.timeIdx, timeIdx)
      const timeEnd = Math.max(anchorCell.timeIdx, timeIdx)

      for (let d = dayStart; d <= dayEnd; d++) {
        for (let t = timeStart; t <= timeEnd; t++) {
          const ts = allBlocks[d][t].timestamp
          if (actualMode === "add") {
            next.add(ts)
          } else {
            next.delete(ts)
          }
        }
      }

      setSelectedBlocks(next)
    },
    [anchorCell, selectionMode, dragBaseSelected, selectedBlocks, allBlocks]
  )

  const handlePointerDown = (dayIdx: number, timeIdx: number) => {
    const timestamp = allBlocks[dayIdx][timeIdx].timestamp
    const mode = selectedBlocks.has(timestamp) ? "remove" : "add"
    setSelectionMode(mode)
    setIsSelecting(true)
    setAnchorCell({ dayIdx, timeIdx })
    setDragBaseSelected(new Set(selectedBlocks))
    applyRectangleSelection(dayIdx, timeIdx, mode)
  }

  const handlePointerEnter = (dayIdx: number, timeIdx: number) => {
    if (isSelecting) {
      applyRectangleSelection(dayIdx, timeIdx)
    }
  }

  const handlePointerUp = () => {
    setIsSelecting(false)
    setAnchorCell(null)
    setDragBaseSelected(null)

    // Convert selected blocks to time ranges
    const sorted = Array.from(selectedBlocks).sort((a, b) => a - b)
    const ranges: { start: Date; end: Date }[] = []

    if (sorted.length > 0) {
      let rangeStart = sorted[0]
      let rangeEnd = rangeStart + 30 * 60 * 1000

      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === rangeEnd) {
          // Consecutive block
          rangeEnd = sorted[i] + 30 * 60 * 1000
        } else {
          // Gap found, save current range
          ranges.push({
            start: new Date(rangeStart),
            end: new Date(rangeEnd),
          })
          rangeStart = sorted[i]
          rangeEnd = rangeStart + 30 * 60 * 1000
        }
      }

      // Save last range
      ranges.push({
        start: new Date(rangeStart),
        end: new Date(rangeEnd),
      })
    }

    onSelectionChange(ranges)
  }

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
  }, [isSelecting, selectedBlocks])

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div
        ref={gridRef}
        className="inline-block min-w-full"
        style={{ touchAction: "none" }}
      >
        {/* Header - Dates */}
        <div className="flex sticky top-0 bg-background z-10 border-b">
          <div className="w-16 flex-shrink-0" /> {/* Time column spacer */}
          {dates.map((date, idx) => (
            <div
              key={idx}
              className="flex-1 min-w-[60px] sm:min-w-[80px] px-2 py-3 text-center border-l"
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
                className="h-8 flex items-center justify-end pr-2 text-xs text-muted-foreground border-b"
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
                    className={cn(
                      "h-8 border-b cursor-pointer transition-colors select-none",
                      isSelected
                        ? "bg-primary/80 hover:bg-primary"
                        : "bg-background hover:bg-primary/20",
                      block.minute === 0 ? "border-t-2" : ""
                    )}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      handlePointerDown(dayIdx, timeIdx)
                    }}
                    onPointerEnter={() => handlePointerEnter(dayIdx, timeIdx)}
                    onTouchStart={(e) => {
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

