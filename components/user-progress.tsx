import Link from "next/link"
import Image from "next/image"

import { courses } from "@/db/schema"
import { Button } from "@/components/ui/button"
import { TokenDisplay } from "./token-display"
import { FreezeUsedPopup } from "./freeze-used-popup"

type Props = {
    activeCourse: typeof courses.$inferSelect
    hearts?: number
    points: number
    hasActiveSubscription?: boolean
    characterData?: string | null
    userImageSrc?: string
    streak?: number
    lastStreakDate?: string | null
    jobData?: string | null
    tokens?: number
    tokenRate?: number
    jobStartedAt?: string | null
    streakFreezes?: number
    freezeUsedAt?: string | null
    activeCourseId?: number | null
}

/** Returns the streak if it's still active (activity today or yesterday), else 0. */
function effectiveStreak(streak: number, lastDate?: string | null): number {
    if (!lastDate) return 0
    const TZ        = "America/Los_Angeles"
    const today     = new Date().toLocaleDateString("en-CA", { timeZone: TZ })
    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: TZ })
    // Convert stored value (old date strings or new ISO timestamps) to Pacific date
    const pacificLastDate = new Date(lastDate).toLocaleDateString("en-CA", { timeZone: TZ })
    return (pacificLastDate === today || pacificLastDate === yesterday) ? streak : 0
}

export const UserProgress = ({
    activeCourse,
    points,
    hasActiveSubscription: _hasActiveSubscription,
    characterData,
    userImageSrc,
    streak = 0,
    lastStreakDate = null,
    jobData,
    tokens = 0,
    tokenRate = 0,
    jobStartedAt = null,
    streakFreezes = 0,
    freezeUsedAt = null,
}: Props) => {
    const displayStreak = effectiveStreak(streak, lastStreakDate)
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
    const isFrozen = freezeUsedAt === today
    const chosenJob: { job?: string; icon?: string } | null = (() => {
        try { return jobData ? JSON.parse(jobData) : null }
        catch { return null }
    })()
    const profile: { selectedImage?: string; bgColor?: string } | null = (() => {
        try { return characterData ? JSON.parse(characterData) : null }
        catch { return null }
    })()

    // Only show the custom profile image — never fall back to Clerk avatar
    const avatarSrc = profile?.selectedImage
    const avatarBg = profile?.bgColor ?? "#bfdbfe"

    return (
        <div className="flex flex-col items-center gap-3 w-full">
            {/* Profile picture avatar */}
            {avatarSrc && (
                <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-md ring-2 ring-white overflow-hidden shrink-0"
                    style={{ backgroundColor: avatarBg }}
                >
                    <Image
                        src={avatarSrc}
                        alt="Your avatar"
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                    />
                </div>
            )}

            <FreezeUsedPopup freezeUsedAt={freezeUsedAt ?? null} streakFreezes={streakFreezes} />

            {/* Stat row — streak | XP | coins */}
            <div className="flex items-center justify-evenly w-full gap-x-2">
                {/* Streak */}
                <Button
                    variant="defaultOutline"
                    className={`font-bold pointer-events-none flex-1 justify-center ${isFrozen ? "text-blue-400" : "text-orange-500"}`}
                    title={isFrozen ? "Streak Freeze used today" : undefined}
                >
                    {isFrozen ? "🧊🔥" : "🔥"} {displayStreak}
                </Button>

                {/* XP / points */}
                <Button variant="defaultOutline" className="text-orange-500 flex-1 justify-center" asChild>
                    <Link href="/shop">
                        <Image src="/points.svg" height={22} width={22} alt="Points" className="mr-1"/>
                        {points}
                    </Link>
                </Button>

                {/* Coin / token counter */}
                <Button variant="defaultOutline" className="font-bold pointer-events-none flex-1 justify-center">
                    <TokenDisplay
                        baseTokens={tokens}
                        tokenRate={tokenRate}
                        jobStartedAt={jobStartedAt}
                    />
                </Button>
            </div>

            {/* Game Stats — shown after job is chosen */}
            {chosenJob?.job && (
                <div className="w-full mt-1 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Game Stats</p>
                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <span className="text-base">{chosenJob.icon ?? "💼"}</span>
                        <span>{chosenJob.job}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
