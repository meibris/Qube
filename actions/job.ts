"use server"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import db from "@/db/drizzle"
import { userProgress } from "@/db/schema"
import { bumpStreak } from "./bump-streak"

export async function saveJobData(jobData: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    await db
        .update(userProgress)
        .set({ jobData })
        .where(eq(userProgress.userId, userId))

    await bumpStreak()

    revalidatePath("/learn")
}
