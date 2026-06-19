"use server"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import db from "@/db/drizzle"
import { userProgress } from "@/db/schema"
import { POINTS_TO_FREEZE, MAX_STREAK_FREEZES } from "@/constants"

export async function buyStreakFreeze() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const progress = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
    })
    if (!progress) throw new Error("User progress not found")

    if (progress.streakFreezes >= MAX_STREAK_FREEZES) {
        throw new Error("Already at maximum streak freezes")
    }
    if (progress.points < POINTS_TO_FREEZE) {
        throw new Error("Not enough points")
    }

    await db
        .update(userProgress)
        .set({
            streakFreezes: progress.streakFreezes + 1,
            points:        progress.points - POINTS_TO_FREEZE,
        })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/shop")
    revalidatePath("/learn")
}
