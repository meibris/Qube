import { getLesson, getUserProgress } from "@/db/queries"

import { redirect } from "next/navigation"
import { Quiz } from "../quiz"

type Props = {
    params: Promise<{
        lessonId: number
    }>
}

const LessonIdPage = async ({
    params,
}: Props) => {
    const { lessonId } = await params
    const lessonData = getLesson(lessonId)
    const userProgressData = getUserProgress()

    const [
        lesson,
        userProgress,
    ] = await Promise.all([
        lessonData,
        userProgressData
    ])

    if (!lesson || !userProgress) {
        redirect("/learn")
    }

    if (lesson.challenges.length === 0) {
        // Unit 1: Income game routes
        if (lesson.unitId === 1) {
            let parsed: Record<string, unknown> = {}
            try { parsed = userProgress.jobData ? JSON.parse(userProgress.jobData) : {} } catch { parsed = {} }

            if (lesson.order === 1) {
                redirect("/map")
            }

            const INCOME_ROUTES: Record<number, string> = {
                2: `/lesson/gross-net-income`,
                3: `/map-l3`,
                4: "/lesson/job-minigame",
                5: `/map-tax`,
                6: `/lesson/tax-brackets`,
                7: "/lesson/disposable-discretionary",
                8: `/lesson/blank-lesson?key=incomeSourcesCompleted`,
                9: `/lesson/blank-lesson?key=annualMonthlyCompleted`,
            }

            if (INCOME_ROUTES[lesson.order]) {
                if (lesson.order === 4 && !parsed.job) redirect("/lesson/job-chooser")
                redirect(INCOME_ROUTES[lesson.order])
            }
        }

        // Unit 2: Budget game routes
        if (lesson.unitId === 2) {
            const BUDGET_ROUTES: Record<number, string> = {
                1: "/map-budget",
            }
            if (BUDGET_ROUTES[lesson.order]) {
                redirect(BUDGET_ROUTES[lesson.order])
            }
        }

        // Unit 3: Loans game routes
        if (lesson.unitId === 3) {
            const LOANS_ROUTES: Record<number, string> = {
                1: "/map-loans",
            }
            if (LOANS_ROUTES[lesson.order]) {
                redirect(LOANS_ROUTES[lesson.order])
            }
        }

        // Unit 5: Investments game routes
        if (lesson.unitId === 5) {
            const INVEST_ROUTES: Record<number, string> = {
                1: "/map-invest",
            }
            if (INVEST_ROUTES[lesson.order]) {
                redirect(INVEST_ROUTES[lesson.order])
            }
        }

        redirect("/learn")
    }

    const initialPercentage = lesson.challenges
        .filter((challenge) => challenge.completed)
        .length / lesson.challenges.length * 100

    return (
        <Quiz
            initialLessonId={lesson.id}
            initialLessonChallenges={lesson.challenges}
            initialCoins={userProgress.tokens ?? 0}
            initialPercentage={initialPercentage}
        />
    )
}

export default LessonIdPage
