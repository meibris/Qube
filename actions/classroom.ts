"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"
import db from "@/db/drizzle"
import { classrooms, classroomMembers, userProgress } from "@/db/schema"

function generateCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const rand = () => chars[Math.floor(Math.random() * chars.length)]
    const part1 = Array.from({ length: 3 }, rand).join("")
    const part2 = Array.from({ length: 3 }, rand).join("")
    return `${part1}-${part2}`
}

function normalizeCode(input: string): string {
    const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (clean.length !== 6) return ""
    return `${clean.slice(0, 3)}-${clean.slice(3)}`
}

export const createClassroom = async (
    name: string,
    emoji: string,
    school: string
): Promise<{ code: string } | { error: string }> => {
    const { userId } = await auth()
    if (!userId) return { error: "Unauthorized" }

    const code = generateCode()

    const [classroom] = await db
        .insert(classrooms)
        .values({ name, emoji, school, code, teacherUserId: userId })
        .returning()

    await db.insert(classroomMembers).values({
        classroomId: classroom.id,
        userId,
        role: "teacher",
    })

    await db
        .update(userProgress)
        .set({ role: "teacher" })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/classroom")
    return { code }
}

export const joinClassroom = async (
    rawCode: string,
    role: "student" | "other"
): Promise<{ error: string } | void> => {
    const { userId } = await auth()
    if (!userId) return { error: "Unauthorized" }

    const code = normalizeCode(rawCode)
    if (!code) return { error: "Invalid classroom code" }

    const classroom = await db.query.classrooms.findFirst({
        where: eq(classrooms.code, code),
    })

    if (!classroom) return { error: "Invalid classroom code" }

    const existing = await db.query.classroomMembers.findFirst({
        where: and(
            eq(classroomMembers.classroomId, classroom.id),
            eq(classroomMembers.userId, userId)
        ),
    })

    if (!existing) {
        await db.insert(classroomMembers).values({
            classroomId: classroom.id,
            userId,
            role,
        })
    }

    await db
        .update(userProgress)
        .set({ role })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/classroom")
    redirect("/learn")
}

export const updateClassroomName = async (
    classroomId: number,
    newName: string
): Promise<{ error: string } | { success: true }> => {
    const { userId } = await auth()
    if (!userId) return { error: "Unauthorized" }

    const classroom = await db.query.classrooms.findFirst({
        where: eq(classrooms.id, classroomId),
    })

    if (!classroom || classroom.teacherUserId !== userId) return { error: "Not authorized" }

    await db
        .update(classrooms)
        .set({ name: newName.trim() })
        .where(eq(classrooms.id, classroomId))

    revalidatePath("/classroom")
    return { success: true }
}

export const deleteClassroom = async (
    classroomId: number
): Promise<{ error: string } | void> => {
    const { userId } = await auth()
    if (!userId) return { error: "Unauthorized" }

    const classroom = await db.query.classrooms.findFirst({
        where: eq(classrooms.id, classroomId),
    })

    if (!classroom || classroom.teacherUserId !== userId) return { error: "Not authorized" }

    await db.delete(classroomMembers).where(eq(classroomMembers.classroomId, classroomId))
    await db.delete(classrooms).where(eq(classrooms.id, classroomId))

    revalidatePath("/classroom")
    redirect("/classroom")
}

/** Same as joinClassroom but without the redirect — for use in the onboarding modal. */
export const joinClassroomInline = async (
    rawCode: string,
    role: "student" | "other"
): Promise<{ error: string } | { success: true }> => {
    const { userId } = await auth()
    if (!userId) return { error: "Unauthorized" }

    const code = normalizeCode(rawCode)
    if (!code) return { error: "Invalid classroom code" }

    const classroom = await db.query.classrooms.findFirst({
        where: eq(classrooms.code, code),
    })

    if (!classroom) return { error: "Classroom not found — double-check the code!" }

    const existing = await db.query.classroomMembers.findFirst({
        where: and(
            eq(classroomMembers.classroomId, classroom.id),
            eq(classroomMembers.userId, userId)
        ),
    })

    if (!existing) {
        await db.insert(classroomMembers).values({
            classroomId: classroom.id,
            userId,
            role,
        })
    }

    await db
        .update(userProgress)
        .set({ role })
        .where(eq(userProgress.userId, userId))

    revalidatePath("/learn")
    revalidatePath("/leaderboard")
    return { success: true }
}
