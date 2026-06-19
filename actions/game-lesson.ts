"use server"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import db from "@/db/drizzle"
import { userProgress } from "@/db/schema"
import { bumpStreak } from "./bump-streak"

const BASE_XP    = 10  // first completion
const REPEAT_XP  = 3   // 30% of base on replay

/**
 * Marks a game lesson complete (or rewards replay XP if already done).
 * lessonKey: "grossNetCompleted" | "earnedUnearnedCompleted" | etc.
 */
export async function saveGameLesson(lessonKey: string, coinsEarned: number = 0, berriesEarned: number = 0) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const progress = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
    })
    if (!progress) throw new Error("No user progress found")

    let jobData: Record<string, unknown> = {}
    try { jobData = progress.jobData ? JSON.parse(progress.jobData) : {} } catch { jobData = {} }

    const isRepeat = !!jobData[lessonKey]
    const xpGain  = isRepeat ? REPEAT_XP : BASE_XP

    if (!isRepeat) {
        jobData[lessonKey] = true
    }

    await db
        .update(userProgress)
        .set({
            jobData:      JSON.stringify(jobData),
            points:       progress.points + xpGain,
            tokens:       progress.tokens + Math.max(0, Math.floor(coinsEarned)),
            totalBerries: (progress.totalBerries ?? 0) + Math.max(0, Math.floor(berriesEarned)),
        })
        .where(eq(userProgress.userId, userId))

    await bumpStreak()

    revalidatePath("/learn")
    revalidatePath("/lesson")

    return { xpGain }
}

/**
 * Returns the player's profile bgColor for the in-game character square.
 * Falls back to red if no characterData is set.
 */
export async function getPlayerColor(): Promise<string> {
    const { userId } = await auth()
    if (!userId) return "#ef4444"

    const progress = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
    })
    if (!progress?.characterData) return "#ef4444"

    try {
        const parsed = JSON.parse(progress.characterData) as { bgColor?: string }
        return parsed.bgColor ?? "#ef4444"
    } catch {
        return "#ef4444"
    }
}

/**
 * Returns the player's current coin balance (tokens + accrued since job start).
 */
export async function getInitialCoins(): Promise<number> {
    const { userId } = await auth()
    if (!userId) return 0

    const progress = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
    })
    if (!progress) return 0

    let coins = progress.tokens ?? 0
    if (progress.jobStartedAt && progress.tokenRate) {
        const elapsed = (Date.now() - new Date(progress.jobStartedAt).getTime()) / 3_600_000
        coins += Math.floor(elapsed * progress.tokenRate)
    }
    return Math.max(0, coins)
}
