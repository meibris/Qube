"use server"

import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import db from "@/db/drizzle"
import { userProgress } from "@/db/schema"

export async function saveCharacterData(characterData: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    await db
        .update(userProgress)
        .set({ characterData })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/profile")
    revalidatePath("/learn")
}

export async function clearCharacterData() {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    await db
        .update(userProgress)
        .set({ characterData: null })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/profile")
    revalidatePath("/learn")
}

export async function saveUserName(userName: string) {
    const { userId } = await auth()
    if (!userId) throw new Error("Unauthorized")

    const trimmed = userName.trim().slice(0, 30)
    if (!trimmed) return

    await db
        .update(userProgress)
        .set({ userName: trimmed })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/profile")
    revalidatePath("/learn")
}
