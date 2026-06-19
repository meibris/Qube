"use client"

import { useRouter } from "next/navigation"
import { Check, Crown, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useDevMode } from "@/contexts/dev-mode"

// Rounded-square SVG progress ring (replaces circular progressbar)
const RoundedSquareProgress = ({ value, stroke, trail }: { value: number; stroke: string; trail: string }) => {
    const size = 102
    const sw = 7          // stroke width
    const rx = 20         // corner radius
    const pad = sw / 2
    const inner = size - sw
    const straight = inner - 2 * rx
    const perimeter = 2 * straight + 2 * straight + 2 * Math.PI * rx
    const offset = perimeter * (1 - value / 100)

    return (
        <svg width={size} height={size} className="absolute top-0 left-0">
            <rect x={pad} y={pad} width={inner} height={inner} rx={rx} ry={rx}
                fill="none" stroke={trail} strokeWidth={sw} />
            <rect x={pad} y={pad} width={inner} height={inner} rx={rx} ry={rx}
                fill="none" stroke={stroke} strokeWidth={sw}
                strokeDasharray={perimeter} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
        </svg>
    )
}

export type CourseColor = "green" | "blue" | "red" | "orange" | "purple"

const COLOR_CONFIG: Record<CourseColor, {
    buttonVariant: "secondary" | "blue" | "red" | "orange" | "purple"
    stroke: string
    startText: string
    completedBg: string
    completedBorder: string
}> = {
    green:  { buttonVariant: "secondary", stroke: "#4ade80", startText: "text-green-500",  completedBg: "bg-green-500",  completedBorder: "border-green-600"  },
    blue:   { buttonVariant: "blue",      stroke: "#60a5fa", startText: "text-blue-500",   completedBg: "bg-blue-500",   completedBorder: "border-blue-600"   },
    red:    { buttonVariant: "red",       stroke: "#f87171", startText: "text-red-500",    completedBg: "bg-red-500",    completedBorder: "border-red-600"    },
    orange: { buttonVariant: "orange",    stroke: "#fb923c", startText: "text-orange-500", completedBg: "bg-orange-500", completedBorder: "border-orange-600" },
    purple: { buttonVariant: "purple",    stroke: "#c084fc", startText: "text-purple-500", completedBg: "bg-purple-500", completedBorder: "border-purple-600" },
}

type Props = {
    id: number
    index: number
    totalCount: number
    locked?: boolean
    current?: boolean
    percentage: number
    completedLocked?: boolean
    courseColor?: CourseColor
}

export const LessonButton = ({
    id,
    index,
    totalCount,
    locked,
    current,
    percentage,
    completedLocked,
    courseColor = "green",
}: Props) => {
    const colors = COLOR_CONFIG[courseColor]
    const router = useRouter()
    const devMode = useDevMode()

    const effectiveLocked = devMode ? false : locked
    const effectiveCompletedLocked = devMode ? false : completedLocked

    const cycleLength = 8
    const cycleIndex = index % cycleLength

    let indentationLevel

    if (cycleIndex <= 2){
        indentationLevel = cycleIndex
    } else if (cycleIndex <= 4) {
        indentationLevel = 4 - cycleIndex
    } else if (cycleIndex <= 6){
        indentationLevel = 4-cycleIndex
    } else {
        indentationLevel = cycleIndex - 8
    }

    const rightPosition = indentationLevel * 40

    const isFirst = index === 0
    const isLast = index === totalCount
    const isCompleted = !current && !effectiveLocked

    const Icon = isCompleted ? Check : isLast ? Crown : Star

    const href = `/lesson/${id}`

    function handleClick() {
        if (!effectiveLocked && !effectiveCompletedLocked) router.push(href)
    }

    // Completed custom lessons render as a static colored bubble — no link
    if (effectiveCompletedLocked) {
        return (
            <div
                className="relative"
                style={{ right: `${rightPosition}px`, marginTop: 24 }}
            >
                <div className={cn("h-[70px] w-[70px] rounded-2xl flex items-center justify-center shadow-md border-b-4", colors.completedBg, colors.completedBorder)}>
                    <Check className="h-10 w-10 text-white stroke-[3]" />
                </div>
            </div>
        )
    }

    return (
        <div
            onClick={handleClick}
            className="relative"
            style={{
                right: `${rightPosition}px`,
                marginTop: isFirst && !isCompleted ? 60 : 24,
                cursor: effectiveLocked ? "default" : "pointer",
            }}
        >
            {current ? (
                <div className="h-[102px] w-[102px] relative">
                    <div className={cn("absolute -top-6 left-2.5 px-3 py-2.5 border-2 font-bold uppercase bg-white rounded-xl animate-bounce tracking-wide z-10", colors.startText)}>
                        Start
                        <div className="absolute left-1/2 -bottom-2 w-0 h-0 border-x-8 border-x-transparent border-t-8 transform -translate-x-1/2" />
                    </div>
                    <RoundedSquareProgress
                        value={Number.isNaN(percentage) ? 0 : percentage}
                        stroke={colors.stroke}
                        trail="#e5e7eb"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                            size="rounded"
                            variant={effectiveLocked ? "locked" : colors.buttonVariant}
                            className="h-[70px] w-[70px] border-b-8 pointer-events-none"
                        >
                            <Icon
                                className={cn(
                                    "h-10 w-10",
                                    effectiveLocked
                                        ? "fill-neutral-400 text-neutral-400 stroke-neutral-400"
                                        : "fill-primary-foreground text-primary-foreground",
                                    isCompleted && "fill-none stroke-[3]"
                                )}
                            />
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    size="rounded"
                    variant={effectiveLocked ? "locked" : colors.buttonVariant}
                    className="h-[70px] w-[70px] border-b-8 pointer-events-none"
                >
                    <Icon
                        className={cn(
                            "h-10 w-10",
                            effectiveLocked
                                ? "fill-neutral-400 text-neutral-400 stroke-neutral-400"
                                : "fill-primary-foreground text-primary-foreground",
                            isCompleted && "fill-none stroke-[3]"
                        )}
                    />
                </Button>
            )}
        </div>
    )
}
