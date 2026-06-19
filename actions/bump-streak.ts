"use server"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import db from "@/db/drizzle"
import { userProgress } from "@/db/schema"

/**
 * Call from any action that counts as a "daily activity".
 * - Same day  → no-op
 * - Next day  → streak + 1
 * - Missed N days, have enough freezes → consume N freezes, keep streak
 * - Missed N days, not enough freezes  → streak resets to 1
 */
export async function bumpStreak() {
    const { userId } = await auth()
    if (!userId) return

    const progress = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
    })
    if (!progress) return

    const TZ        = "America/Los_Angeles"
    const today     = new Date().toLocaleDateString("en-CA", { timeZone: TZ })
    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: TZ })

    // Convert stored value to Pacific date (works for both old "YYYY-MM-DD" strings
    // stored as UTC midnight AND new full ISO timestamps)
    const lastDate = progress.lastStreakDate
        ? new Date(progress.lastStreakDate).toLocaleDateString("en-CA", { timeZone: TZ })
        : null

    if (lastDate === today) return   // already counted today

    // How many calendar days between lastDate and today (0 if consecutive day, >0 if missed)
    const missedDays = lastDate
        ? Math.round((new Date(today).getTime() - new Date(lastDate).getTime()) / 86_400_000) - 1
        : 0

    let newStreak      = progress.streak
    let newFreezes     = progress.streakFreezes
    let freezeUsedAt   = progress.freezeUsedAt

    if (missedDays <= 0) {
        // Consecutive day — normal increment
        newStreak = progress.streak + 1
    } else if (missedDays <= progress.streakFreezes) {
        // Enough freezes to cover every missed day — consume them, keep streak
        newFreezes   = progress.streakFreezes - missedDays
        freezeUsedAt = today
        // streak stays the same; lastStreakDate advances to today
    } else {
        // Not enough freezes — consume all remaining, but streak still breaks
        newFreezes   = 0
        freezeUsedAt = missedDays > 0 && progress.streakFreezes > 0 ? today : freezeUsedAt
        newStreak    = 1
    }

    await db
        .update(userProgress)
        .set({
            streak:        newStreak,
            lastStreakDate: new Date().toISOString(),  // full timestamp so Pacific conversion is exact
            streakFreezes: newFreezes,
            freezeUsedAt,
        })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/learn")
    revalidatePath("/quests")
}
