import { getLesson, getUserProgress } from "@/db/queries"

import { redirect } from "next/navigation"
import { Quiz } from "./quiz"


const LessonPage = async () => {
    const lessonData = getLesson()
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
        // Unit 1: Income
        if (lesson.unitId === 1) {
            const INCOME_ROUTES: Record<number, string> = {
                1: "/map",
                2: "/lesson/gross-net-income",
                3: "/map-l3",
                4: "/lesson/job-minigame",
                5: "/map-tax",
                6: "/lesson/tax-brackets",
                7: "/lesson/disposable-discretionary",
                8: "/lesson/blank-lesson?key=incomeSourcesCompleted",
                9: "/lesson/blank-lesson?key=annualMonthlyCompleted",
            }
            if (INCOME_ROUTES[lesson.order]) redirect(INCOME_ROUTES[lesson.order])
        }

        // Unit 2: Budget
        if (lesson.unitId === 2) {
            const BUDGET_ROUTES: Record<number, string> = {
                1: "/map-budget",
            }
            if (BUDGET_ROUTES[lesson.order]) redirect(BUDGET_ROUTES[lesson.order])
        }

        // Unit 5: Investments
        if (lesson.unitId === 5) {
            const INVEST_ROUTES: Record<number, string> = {
                1: "/map-invest",
            }
            if (INVEST_ROUTES[lesson.order]) redirect(INVEST_ROUTES[lesson.order])
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

export default LessonPage
