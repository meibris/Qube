import { cache } from "react";
import { eq, and, ne, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import db from "./drizzle";
import {
    challengeProgress,
    classrooms,
    classroomMembers,
    courses,
    lessons,
    units,
    userProgress,
} from "@/db/schema";
//or import db from "@db/drizzle";

export const getUserProgress = cache(async () => {
    const { userId } = await auth()

    if(!userId) {
        return null
    }

    const data = await db.query.userProgress.findFirst({
        where: eq(userProgress.userId, userId),
        with: {
            activeCourse: true,
        }
    })
 
    return data
})

export const getUnits = cache(async () => {
    const { userId } = await auth()
    const userProgress = await getUserProgress()

    if (!userId || !userProgress?.activeCourseId) {
        return []
    }

    const data = await db.query.units.findMany({
        orderBy: (units, { asc }) => [asc(units.order)],
        where: eq(units.courseId, userProgress.activeCourseId),
        with: {
            lessons: {
                orderBy: (lessons, { asc }) => [asc(lessons.order)],
                with: {
                    challenges: {
                        orderBy: (challenges, { asc }) => [asc(challenges.order)],
                        with: {
                            challengeProgress: {
                                where: eq(
                                    challengeProgress.userId,
                                    userId,
                                ),
                            }
                        },
                    },
                },
            },
        },
    })

    // Map lesson order → jobData key for income-course lessons
    const GAME_LESSON_KEYS: Record<number, string> = {
        2: "grossNetCompleted",
        3: "salesTaxGameCompleted",
        4: "salesTaxCompleted",
        5: "taxBracketsGameCompleted",
        6: "taxBracketsCompleted",
        7: "disposableDiscCompleted",
        8: "incomeSourcesCompleted",
        9: "annualMonthlyCompleted",
    }
    // Order 1 now uses unit1GameCompleted instead of "job"

    // Map lesson order → jobData key for budget-course lessons
    const BUDGET_GAME_KEYS: Record<number, string> = {
        1: "budgetMapCompleted",
    }

    // Map lesson order → jobData key for loans-course lessons
    const LOANS_GAME_KEYS: Record<number, string> = {
        1: "loansMapCompleted",
    }

    // Map lesson order → jobData key for investments-course lessons
    const INVEST_GAME_KEYS: Record<number, string> = {
        1: "investIntroCompleted",
    }

    let parsedJobData: Record<string, unknown> = {}
    try { parsedJobData = userProgress.jobData ? JSON.parse(userProgress.jobData) : {} } catch { parsedJobData = {} }

    const normalizedData = data.map((unit) => {
        const isIncomeCourse = userProgress.activeCourseId === 1
        const isBudgetCourse = userProgress.activeCourseId === 2
        const isLoansCourse = userProgress.activeCourseId === 3
        const isInvestCourse = userProgress.activeCourseId === 5
        const lessonsWithCompletedStatus = unit.lessons.map((lesson) => {
            if (lesson.challenges.length === 0) {
                if (isIncomeCourse) {
                    // Order 1 (island game): complete once the game is finished
                    if (lesson.order === 1) return { ...lesson, completed: !!parsedJobData.unit1GameCompleted }
                    // Orders 2-9: check the matching jobData flag
                    if (GAME_LESSON_KEYS[lesson.order]) {
                        return { ...lesson, completed: !!parsedJobData[GAME_LESSON_KEYS[lesson.order]] }
                    }
                }
                if (isBudgetCourse && BUDGET_GAME_KEYS[lesson.order]) {
                    return { ...lesson, completed: !!parsedJobData[BUDGET_GAME_KEYS[lesson.order]] }
                }
                if (isLoansCourse && LOANS_GAME_KEYS[lesson.order]) {
                    return { ...lesson, completed: !!parsedJobData[LOANS_GAME_KEYS[lesson.order]] }
                }
                if (isInvestCourse && INVEST_GAME_KEYS[lesson.order]) {
                    return { ...lesson, completed: !!parsedJobData[INVEST_GAME_KEYS[lesson.order]] }
                }
                return { ...lesson, completed: false }
            }
            
            const allCompletedChallenges = lesson.challenges.every((challenge) => {
                return challenge.challengeProgress
                    && challenge.challengeProgress.length > 0
                    && challenge.challengeProgress.every((progress) => progress.completed)
            })

            return { ...lesson, completed: allCompletedChallenges }
        })

        return { ...unit, lessons: lessonsWithCompletedStatus }
    })

    return normalizedData
})

export const getCourses = cache(async () => {
    const data = await db.query.courses.findMany()

    return data
})

export const getCourseById = cache(async (courseId: number) => {
    const data = await db.query.courses.findFirst({
        where: eq(courses.id, courseId),
        with: {
            units: {
                orderBy: (units, { asc }) => [asc(units.order)],
                with: {
                    lessons: {
                        orderBy: (lessons, { asc }) => [asc(lessons.order)],
                    },
                },
            },
        },
        //TODO: populate units and lessons
        //from userprogress 15:20
    })

    return data
})

export const getCourseProgress = cache(async () => {
    const { userId } = await auth()
    const userProgress = await getUserProgress()

    if (!userId || !userProgress?.activeCourseId) {
        return null
    }

    const unitsInActiveCourse = await db.query.units.findMany({
        orderBy: (units, { asc }) => [asc(units.order)],
        where: eq(units.courseId, userProgress.activeCourseId),
        with: {
            lessons: {
                orderBy: (lessons, { asc }) => [asc(lessons.order)],
                with: {
                    unit: true,
                    challenges: {
                        with: {
                            challengeProgress: {
                                where: eq(challengeProgress.userId, userId), 
                            },
                        },
                    },
                },
            },
        },
    })

    const allLessons = unitsInActiveCourse.flatMap((unit) => unit.lessons)

    const isIncomeCourse = userProgress.activeCourseId === 1
    const isBudgetCourse = userProgress.activeCourseId === 2

    // Income course: all 9 lessons are custom game pages tracked via jobData flags
    if (isIncomeCourse) {
        let parsedJobData: Record<string, unknown> = {}
        try { parsedJobData = userProgress.jobData ? JSON.parse(userProgress.jobData) : {} } catch { parsedJobData = {} }

        const INCOME_ORDER_KEYS = [
            { order: 1, key: "unit1GameCompleted" },
            { order: 2, key: "grossNetCompleted" },
            { order: 3, key: "salesTaxGameCompleted" },
            { order: 4, key: "salesTaxCompleted" },
            { order: 5, key: "taxBracketsGameCompleted" },
            { order: 6, key: "taxBracketsCompleted" },
            { order: 7, key: "disposableDiscCompleted" },
            { order: 8, key: "incomeSourcesCompleted" },
            { order: 9, key: "annualMonthlyCompleted" },
        ]

        const nextEntry = INCOME_ORDER_KEYS.find(entry => !parsedJobData[entry.key])
        if (nextEntry) {
            const activeL = allLessons.find(l => l.order === nextEntry.order)
            return { activeLesson: activeL, activeLessonId: activeL?.id }
        }

        // All 9 income lessons done
        return { activeLesson: undefined, activeLessonId: undefined }
    }

    // Game lesson keys for non-income courses
    const BUDGET_GAME_KEYS: Record<number, string> = { 1: "budgetMapCompleted" }
    const LOANS_GAME_KEYS: Record<number, string> = { 1: "loansMapCompleted" }
    const INVEST_GAME_KEYS: Record<number, string> = { 1: "investIntroCompleted" }

    const isLoansCourse = userProgress.activeCourseId === 3
    const isInvestCourse = userProgress.activeCourseId === 5

    let gameJobData: Record<string, unknown> = {}
    try { gameJobData = userProgress.jobData ? JSON.parse(userProgress.jobData) : {} } catch { gameJobData = {} }

    // For all other courses: find the first lesson with incomplete challenges
    const firstUncompletedLesson = allLessons.find((lesson) => {
        if (lesson.challenges.length === 0) {
            if (isBudgetCourse && BUDGET_GAME_KEYS[lesson.order]) {
                return !gameJobData[BUDGET_GAME_KEYS[lesson.order]]
            }
            if (isLoansCourse && LOANS_GAME_KEYS[lesson.order]) {
                return !gameJobData[LOANS_GAME_KEYS[lesson.order]]
            }
            if (isInvestCourse && INVEST_GAME_KEYS[lesson.order]) {
                return !gameJobData[INVEST_GAME_KEYS[lesson.order]]
            }
            return true
        }
        return lesson.challenges.some((challenge) => {
            return !challenge.challengeProgress
            || challenge.challengeProgress.length === 0
            || challenge.challengeProgress.some((progress) => progress.completed === false)
        })
    })

    return {
        activeLesson: firstUncompletedLesson,
        activeLessonId: firstUncompletedLesson?.id,
    }
})

export const getLesson = cache(async (id?: number) => {
    const { userId } = await auth()

    if (!userId) { //if user is not even authenticated
        return null;
    }

    const courseProgress = await getCourseProgress()

    const lessonId = id || courseProgress?.activeLessonId;

    if (!lessonId) {
        return null
    }

    const data = await db.query.lessons.findFirst({
        where: eq(lessons.id, lessonId),
        with: {
            challenges: {
                orderBy: (challenges, { asc }) => [asc(challenges.order)],
                with: {
                    challengeOptions: true,
                    challengeProgress: {
                        where: eq(challengeProgress.userId, userId),
                    },
                },
            },
        },
    })

    if (!data || !data.challenges) {
        return null
    }

    const normalizedChallenges = data.challenges.map((challenge) => {
        //if smth doesnt work cehck the last if clause
        const completed = challenge.challengeProgress 
            && challenge.challengeProgress.length > 0
            && challenge.challengeProgress.every((progress) => progress.completed)

        return { ...challenge, completed }
    })

    return { ...data, challenges: normalizedChallenges }
})

export const getLessonPercentage = cache(async () => {
    const courseProgress = await getCourseProgress()

    if (!courseProgress?.activeLessonId) {
        return 0
    }

    const lesson = await getLesson(courseProgress.activeLessonId)

    if (!lesson) { 
        return 0
    }

    const completedChallenges = lesson.challenges
        .filter((challenge) => challenge.completed)
    const percentage = Math.round(
        (completedChallenges.length / lesson.challenges.length) * 100
    )

    return percentage
})

export const getTopTenUsers = cache(async () => {
    const { userId } = await auth()
    if (!userId) return []

    // Find which classroom this user belongs to
    const membership = await db.query.classroomMembers.findFirst({
        where: eq(classroomMembers.userId, userId),
    })

    if (!membership) {
        // Not in a classroom yet — show only themselves
        const self = await db.query.userProgress.findFirst({
            where: eq(userProgress.userId, userId),
            columns: { userId: true, userName: true, userImageSrc: true, points: true, characterData: true },
        })
        return self ? [self] : []
    }

    // Return all members of the same classroom sorted by XP
    const data = await db
        .select({
            userId: userProgress.userId,
            userName: userProgress.userName,
            userImageSrc: userProgress.userImageSrc,
            points: userProgress.points,
            characterData: userProgress.characterData,
        })
        .from(classroomMembers)
        .innerJoin(userProgress, eq(classroomMembers.userId, userProgress.userId))
        .where(eq(classroomMembers.classroomId, membership.classroomId))
        .orderBy(desc(userProgress.points))
        .limit(10)

    return data
})

export const getUserClassroomMembership = cache(async () => {
    const { userId } = await auth()
    if (!userId) return null

    return db.query.classroomMembers.findFirst({
        where: eq(classroomMembers.userId, userId),
    })
})

export const getTeacherClassrooms = cache(async () => {
    const { userId } = await auth()
    if (!userId) return []

    return db.query.classrooms.findMany({
        where: eq(classrooms.teacherUserId, userId),
        orderBy: (classrooms, { asc }) => [asc(classrooms.createdAt)],
        columns: { id: true, name: true, emoji: true, code: true },
    })
})

export const getTeacherClassroomById = cache(async (id: number) => {
    const { userId } = await auth()
    if (!userId) return null

    const classroom = await db.query.classrooms.findFirst({
        where: and(eq(classrooms.id, id), eq(classrooms.teacherUserId, userId)),
    })
    if (!classroom) return null

    const members = await db
        .select({
            userId: classroomMembers.userId,
            role: classroomMembers.role,
            joinedAt: classroomMembers.joinedAt,
            userName: userProgress.userName,
            userImageSrc: userProgress.userImageSrc,
            points: userProgress.points,
            tokens: userProgress.tokens,
            characterData: userProgress.characterData,
        })
        .from(classroomMembers)
        .leftJoin(userProgress, eq(classroomMembers.userId, userProgress.userId))
        .where(and(eq(classroomMembers.classroomId, id), ne(classroomMembers.role, "teacher")))

    return { classroom, members }
})

export const getTeacherClassroom = cache(async () => {
    const { userId } = await auth()
    if (!userId) return null

    const classroom = await db.query.classrooms.findFirst({
        where: eq(classrooms.teacherUserId, userId),
    })

    if (!classroom) return null

    const members = await db
        .select({
            userId: classroomMembers.userId,
            role: classroomMembers.role,
            joinedAt: classroomMembers.joinedAt,
            userName: userProgress.userName,
            userImageSrc: userProgress.userImageSrc,
            points: userProgress.points,
            tokens: userProgress.tokens,
            characterData: userProgress.characterData,
        })
        .from(classroomMembers)
        .leftJoin(userProgress, eq(classroomMembers.userId, userProgress.userId))
        .where(
            and(
                eq(classroomMembers.classroomId, classroom.id),
                ne(classroomMembers.role, "teacher")
            )
        )

    return { classroom, members }
})