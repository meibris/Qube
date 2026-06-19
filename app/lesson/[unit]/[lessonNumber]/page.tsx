import { redirect } from "next/navigation"
import Link from "next/link"
import { getLessonBySlugAndOrder, getLesson, getUserProgress } from "@/db/queries"
import { Quiz } from "../../quiz"
import { GameMap, type MapVariant } from "@/app/(main)/map/game-map"
import { getInitialCoins, getPlayerColor } from "@/actions/game-lesson"

// Lessons that render a GameMap canvas directly
const GAME_MAP_VARIANTS: Record<string, Record<number, MapVariant>> = {
    income:     { 1: "lesson1", 3: "lesson3", 5: "lessonTax" },
    budget:     { 1: "lessonBudget" },
    loans:      { 1: "lessonLoans" },
    investment: { 1: "lessonInvest" },
}

// Lessons that redirect to a named custom page (non-map, non-quiz)
const CUSTOM_REDIRECTS: Record<string, Record<number, string>> = {
    income: {
        2: "/lesson/gross-net-income",
        6: "/lesson/tax-brackets",
        7: "/lesson/disposable-discretionary",
        8: "/lesson/blank-lesson?key=incomeSourcesCompleted",
        9: "/lesson/blank-lesson?key=annualMonthlyCompleted",
    },
}

type Props = {
    params: Promise<{ unit: string; lessonNumber: string }>
}

const UnitLessonPage = async ({ params }: Props) => {
    const { unit, lessonNumber } = await params
    const order = parseInt(lessonNumber, 10)
    if (isNaN(order)) redirect("/learn")

    const stub = await getLessonBySlugAndOrder(unit, order)
    if (!stub) redirect("/learn")

    // ── Game map lesson ──────────────────────────────────────────────────────
    const gameVariant = GAME_MAP_VARIANTS[unit]?.[order]
    if (gameVariant) {
        const [initialCoins, playerColor] = await Promise.all([getInitialCoins(), getPlayerColor()])
        return (
            <div className="fixed inset-0 z-50 bg-black">
                <div className="relative w-full h-full">
                    <GameMap variant={gameVariant} initialCoins={initialCoins} playerColor={playerColor} />
                    <Link
                        href="/learn"
                        className="absolute bottom-4 left-4 px-4 py-2 rounded-xl bg-white text-slate-500 text-sm font-bold uppercase tracking-wide border-2 border-b-4 border-slate-200 hover:bg-slate-100 active:border-b-2 transition-colors shadow-lg"
                    >
                        ← Back to Learn
                    </Link>
                </div>
            </div>
        )
    }

    // ── Income lesson 4 (job-minigame) — needs job-chooser gate ─────────────
    if (unit === "income" && order === 4) {
        const userProgress = await getUserProgress()
        let parsed: Record<string, unknown> = {}
        try { parsed = userProgress?.jobData ? JSON.parse(userProgress.jobData) : {} } catch { parsed = {} }
        redirect(parsed.job ? "/lesson/job-minigame" : "/lesson/job-chooser")
    }

    // ── Other custom redirects ───────────────────────────────────────────────
    const customRedirect = CUSTOM_REDIRECTS[unit]?.[order]
    if (customRedirect) redirect(customRedirect)

    // ── Quiz lesson ──────────────────────────────────────────────────────────
    const [lesson, userProgress] = await Promise.all([
        getLesson(stub.id),
        getUserProgress(),
    ])
    if (!lesson || !userProgress) redirect("/learn")

    const initialPercentage =
        (lesson.challenges.filter((c) => c.completed).length / lesson.challenges.length) * 100

    return (
        <Quiz
            initialLessonId={lesson.id}
            initialLessonChallenges={lesson.challenges}
            initialCoins={userProgress.tokens ?? 0}
            initialPercentage={initialPercentage}
        />
    )
}

export default UnitLessonPage
