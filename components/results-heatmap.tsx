'use client'

import React from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { HeatmapCell } from "@/lib/utils/schedule"

interface ResultsHeatmapProps {
  heatmapData: HeatmapCell[]
  startDate: Date
  endDate: Date
  maxCount: number
  memberNames: Map<string, string>
}

export function ResultsHeatmap({
  heatmapData,
  startDate,
  endDate,
  maxCount,
  memberNames,
}: ResultsHeatmapProps) {
  // Group by date and time
  const dateMap = new Map<string, HeatmapCell[]>()

  heatmapData.forEach((cell) => {
    const date = new Date(cell.timestamp)
    const dateKey = format(date, "yyyy-MM-dd")

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, [])
    }
    dateMap.get(dateKey)!.push(cell)
  })

  const dates = Array.from(dateMap.keys()).sort()

  // Generate time slots
  const timeSlots: { hour: number; minute: number; label: string }[] = []
  for (let hour = 9; hour < 23; hour++) {
    timeSlots.push({ hour, minute: 0, label: `${hour}:00` })
    timeSlots.push({ hour, minute: 30, label: `${hour}:30` })
  }

  const getColorIntensity = (count: number): string => {
    if (count === 0) return "bg-gray-100"
    if (maxCount === 0) return "bg-primary/20"

    const intensity = Math.min(count / maxCount, 1)

    if (intensity <= 0.2) return "bg-primary/20"
    if (intensity <= 0.4) return "bg-primary/40"
    if (intensity <= 0.6) return "bg-primary/60"
    if (intensity <= 0.8) return "bg-primary/80"
    return "bg-primary"
  }

  const getCellData = (
    dateKey: string,
    hour: number,
    minute: number
  ): HeatmapCell | null => {
    const cells = dateMap.get(dateKey)
    if (!cells) return null

    return (
      cells.find((cell) => {
        const date = new Date(cell.timestamp)
        return date.getHours() === hour && date.getMinutes() === minute
      }) || null
    )
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="inline-block min-w-full">
        {/* Header */}
        <div className="flex sticky top-0 bg-background z-10 border-b">
          <div className="w-16 flex-shrink-0" />
          {dates.map((dateKey) => {
            const date = new Date(dateKey)
            return (
              <div
                key={dateKey}
                className="flex-1 min-w-[60px] sm:min-w-[80px] px-2 py-3 text-center border-l"
              >
                <div className="text-xs font-semibold">
                  {format(date, "EEE", { locale: ko })}
                </div>
                <div className="text-sm">{format(date, "M/d")}</div>
              </div>
            )
          })}
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

          {/* Heatmap cells */}
          {dates.map((dateKey) => (
            <div
              key={dateKey}
              className="flex-1 min-w-[60px] sm:min-w-[80px] border-l"
            >
              {timeSlots.map((slot, timeIdx) => {
                const cellData = getCellData(dateKey, slot.hour, slot.minute)
                const count = cellData?.count || 0
                const memberIds = cellData?.memberIds || []

                return (
                  <div
                    key={timeIdx}
                    className={cn(
                      "h-8 border-b relative group cursor-pointer",
                      getColorIntensity(count),
                      slot.minute === 0 ? "border-t-2" : ""
                    )}
                    title={
                      count > 0
                        ? `${count}명 가능: ${memberIds
                            .map((id) => memberNames.get(id) || "알 수 없음")
                            .join(", ")}`
                        : "아무도 가능하지 않음"
                    }
                  >
                    {count > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                        {count}
                      </div>
                    )}

                    {/* Tooltip on hover */}
                    {count > 0 && (
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-20">
                        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          {memberIds
                            .map((id) => memberNames.get(id) || "?")
                            .join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        <span className="text-muted-foreground">가능 인원:</span>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-gray-100 border rounded" />
          <span className="text-xs">0명</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-primary/40 border rounded" />
          <span className="text-xs">적음</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-primary/80 border rounded" />
          <span className="text-xs">보통</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-primary border rounded" />
          <span className="text-xs">많음</span>
        </div>
      </div>
    </div>
  )
}

