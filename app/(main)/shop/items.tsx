"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useTransition } from "react"
import { refillHearts } from "@/actions/user-progress"
import { buyStreakFreeze } from "@/actions/streak-freeze"
import { toast } from "sonner"
import { POINTS_TO_REFILL, POINTS_TO_FREEZE, MAX_STREAK_FREEZES } from "@/constants"

type Props = {
    hearts: number
    points: number
    hasActiveSubscription: boolean //not in use
    streakFreezes: number
}

export const Items = ({
    hearts,
    points,
    hasActiveSubscription, //not in use
    streakFreezes,
}: Props) => {
    const [pending, startTransition] = useTransition()

    const onRefillHearts = () => {
        if (pending || hearts === 5 || points < POINTS_TO_REFILL) return
        startTransition(() => {
            refillHearts().catch(() => toast.error("Something went wrong"))
        })
    }

    const onBuyFreeze = () => {
        if (pending || streakFreezes >= MAX_STREAK_FREEZES || points < POINTS_TO_FREEZE) return
        startTransition(() => {
            buyStreakFreeze()
                .then(() => toast.success("Streak Freeze purchased!"))
                .catch(() => toast.error("Something went wrong"))
        })
    }

    return (
        <ul className="w-full">
            {/* ── Hearts ── */}
            <div className="flex items-center w-full p-4 gap-x-4 border-t-2">
                <Image src="/heart.svg" alt="Heart" height={60} width={60} />
                <div className="flex-1">
                    <p className="text-neutral-700 text-base lg:text-xl font-bold">
                        Refill Hearts
                    </p>
                </div>
                <Button
                    onClick={onRefillHearts}
                    disabled={pending || hearts === 5 || points < POINTS_TO_REFILL}
                >
                    {hearts === 5 ? "Full" : (
                        <div className="flex items-center gap-1">
                            <Image src="/points.svg" alt="Points" height={20} width={20} />
                            <p>{POINTS_TO_REFILL}</p>
                        </div>
                    )}
                </Button>
            </div>

            {/* ── Streak Freeze ── */}
            <div className="flex items-center w-full p-4 gap-x-4 border-t-2">
                <div className="w-[60px] h-[60px] flex items-center justify-center">
                    <Image src="/streakFreezeSymbol.svg" alt="Streak Freeze" height={44} width={44} />
                </div>
                <div className="flex-1">
                    <p className="text-neutral-700 text-base lg:text-xl font-bold">
                        Streak Freeze
                    </p>
                    <p className="text-muted-foreground text-sm">
                        Protects your streak if you miss a day.{" "}
                        <span className={`font-semibold ${streakFreezes >= MAX_STREAK_FREEZES ? "text-green-500" : "text-blue-500"}`}>
                            {streakFreezes} / {MAX_STREAK_FREEZES}
                        </span>{" "}
                        owned.
                    </p>
                </div>
                <Button
                    onClick={onBuyFreeze}
                    disabled={pending || streakFreezes >= MAX_STREAK_FREEZES || points < POINTS_TO_FREEZE}
                    variant="default"
                    className="disabled:opacity-50"
                >
                    {streakFreezes >= MAX_STREAK_FREEZES ? "Max" : (
                        <div className="flex items-center gap-1">
                            <Image src="/points.svg" alt="Points" height={20} width={20} />
                            <p>{POINTS_TO_FREEZE}</p>
                        </div>
                    )}
                </Button>
            </div>
        </ul>
    )
}
