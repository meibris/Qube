"use server"

import { and, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth, currentUser } from "@clerk/nextjs/server"

import db from "@/db/drizzle"
import { POINTS_TO_REFILL } from "@/constants"
import { challengeProgress, challenges, userProgress } from "@/db/schema"
import { getCourseById, getUserProgress } from "@/db/queries"

export const upsertUserProgress = async (courseId: number) => {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user ) {
        throw new Error("Unauthorized")
    }

    const course = await getCourseById(courseId)

    if (!course) {
        throw new Error("Course not found")
    }

    if (!course.units.length || !course.units[0].lessons.length) {
        throw new Error("Course is empty")
    }

    const existingUserProgress = await getUserProgress()

    if (existingUserProgress) {
        await db.update(userProgress).set({
            activeCourseId: courseId,
            userName: user.firstName || "User",
            userImageSrc: user.imageUrl || "/QubeSymbolTemp.svg",
        })

        revalidatePath("/units")
        revalidatePath("/learn")
        redirect("/learn")
    }

    await db.insert(userProgress).values({
        userId,
        activeCourseId: courseId,
        userName: user.firstName || "User",
        userImageSrc: user.imageUrl || "g",
    })

    revalidatePath("/units")
    revalidatePath("/learn")
    redirect("/learn")
}

export const reduceHearts = async (challengeId: number) => {
    const { userId } = await auth()

    if (!userId) {
        throw new Error ("Unauthorized")
    }

    const currentUserProgress = await getUserProgress()
    //sub

    const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.id, challengeId),
    })

    if (!challenge) {
        throw new Error("Challenge not found.")
    }

    const lessonId = challenge.lessonId

    const existingChallengeProgress = await db.query.challengeProgress.findFirst({
        where: and(
            eq(challengeProgress.userId, userId),
            eq(challengeProgress.challengeId, challengeId),
        )
    })

    const isPractice = !!existingChallengeProgress

    if (isPractice) {
        return { error: "Practice" } //reason/reminder (Challenge Actions 32:50)
    }

    if (!currentUserProgress) {
        throw new Error("User progress not found") //breaks app
    }
    //sub

    if (currentUserProgress.hearts === 0) {
        return { error: "hearts" } //u dont have enough hearts to reduce hearts
    }

    await db.update(userProgress).set({
        hearts: Math.max(currentUserProgress.hearts - 1, 0), //making sure its not negative
    }).where(eq(userProgress.userId, userId))

    revalidatePath("/shop")
    revalidatePath("/learn")
    revalidatePath("/quests")
    revalidatePath("/leaderboard")
    revalidatePath(`/lesson/${lessonId}`)
}

export const refillHearts = async () => {
    const currentUserProgress = await getUserProgress()

    if (!currentUserProgress){
        throw new Error("User progress not found")
    }

    if (currentUserProgress.hearts === 5 ) {
        throw new Error("Hearts are already full")
    }

    if (currentUserProgress.points < POINTS_TO_REFILL) {
        throw new Error("Not enough points")
    }

    await db.update(userProgress).set({
        hearts: currentUserProgress.hearts + 1,
        points: currentUserProgress.points - POINTS_TO_REFILL,
    }).where(eq(userProgress.userId, currentUserProgress.userId))

    revalidatePath("/shop")
    revalidatePath("/learn")
    revalidatePath("/quests")
    revalidatePath("/leaderboard")
}