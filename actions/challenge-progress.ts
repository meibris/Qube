"use server"

import { getUserProgress } from "@/db/queries"

import db from "@/db/drizzle"
import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { challengeProgress, challenges, userProgress } from "@/db/schema"
import { revalidatePath } from "next/cache"
import { bumpStreak } from "./bump-streak"

//upsert means update
export const upsertChallengeProgress = async (challengeId: number) => {
    const { userId } = await auth()

    if (!userId) {
        throw new Error("Unauthorized")
    }

    const currentUserProgress = await getUserProgress()
    //sub

    if (!currentUserProgress) {
        throw new Error("User progress not found.")
    }

    const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId)
    })

    if (!challenge) {
        throw new Error("Challenge not found.")
    }

    const existingChallengeProgress = await db.query.challengeProgress.findFirst({
        where: and(
            eq(challengeProgress.userId, userId),
            eq(challengeProgress.challengeId, challengeId),
        )
    })

    const  isPractice = !!existingChallengeProgress
    if (currentUserProgress.hearts === 0 && !isPractice) {
        return { error: "hearts" }
    }

    if (isPractice) {
        await db.update(challengeProgress).set({
            completed: true,
        })
        .where(
            eq(challengeProgress.id, existingChallengeProgress.id))

        await db.update(userProgress).set({
            hearts: Math.min(currentUserProgress.hearts, 5),
            points: currentUserProgress.points + 5,
        }).where(eq(userProgress.userId, userId))

        await bumpStreak()
        revalidatePath("/lesson")
        revalidatePath("/learn")
        return
    }

    await db.insert(challengeProgress).values({
        challengeId,
        userId,
        completed: true,
    })

    await db.update(userProgress).set({
        points: currentUserProgress.points + 5,
    }).where(eq(userProgress.userId, userId))

    await bumpStreak()
    revalidatePath("/lesson")
    revalidatePath("/learn")
}
