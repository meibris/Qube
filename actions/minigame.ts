"use server"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import db from "@/db/drizzle"
import { userProgress } from "@/db/schema"
import { bumpStreak } from "./bump-streak"

const FIRST_JOB_TOKEN_RATE = 1  // 🪙 per hour
const BASE_XP   = 10            // first completion
const REPEAT_XP = 3             // 30% of base on replay

export async function saveMinigameCompleted() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const progress = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
    })

    if (!progress) throw new Error("No user progress found")

    let jobData: Record<string, unknown> = {}
    try { jobData = progress.jobData ? JSON.parse(progress.jobData) : {} } catch { jobData = {} }

    const isRepeat = !!jobData.minigameCompleted

    if (!isRepeat) {
        // First time: mark done, start token clock
        jobData.minigameCompleted = true
        await db
            .update(userProgress)
            .set({
                jobData:      JSON.stringify(jobData),
                jobStartedAt: new Date().toISOString(),
                tokenRate:    FIRST_JOB_TOKEN_RATE,
                points:       progress.points + BASE_XP,
            })
            .where(eq(userProgress.userId, userId))
    } else {
        // Replay: award 30% XP only — don't reset token clock or completion flag
        await db
            .update(userProgress)
            .set({ points: progress.points + REPEAT_XP })
            .where(eq(userProgress.userId, userId))
    }

    await bumpStreak()

    revalidatePath("/learn")
    revalidatePath("/lesson")
}
