import { lessons, units } from "@/db/schema"
import { UnitBanner } from "./unit-banner"
import { LessonButton, CourseColor } from "./lesson-button"

type Lesson = typeof lessons.$inferSelect & {
    completed: boolean
    order: number
}

type Props = {
    id: number
    order: number
    title: string
    description: string
    courseId?: number
    lessons: Lesson[]
    activeLesson: typeof lessons.$inferSelect & {
        unit: typeof units.$inferSelect
    } | undefined
    activeLessonPercentage: number
    jobData?: string | null
}

// ── Section banner used inside income unit ─────────────────────────────────

type SectionBannerProps = { emoji: string; title: string; subtitle: string }

const SectionBanner = ({ emoji, bannerBg }: SectionBannerProps & { bannerBg?: string }) => (
    <div className={`w-full rounded-xl px-5 py-3 text-white flex items-center gap-4 mt-6 mb-1 ${bannerBg ?? "bg-green-500"}`}>
        <span className="text-3xl">{emoji}</span>
    </div>
)

// ── Course color map ──────────────────────────────────────────────────────

const COURSE_COLOR_MAP: Record<number, { color: CourseColor; bannerBg: string; buttonVariant: "secondary" | "blue" | "red" | "orange" | "purple" }> = {
    1: { color: "green",  bannerBg: "bg-green-500",  buttonVariant: "secondary" },
    2: { color: "blue",   bannerBg: "bg-blue-500",   buttonVariant: "blue"      },
    3: { color: "red",    bannerBg: "bg-red-500",    buttonVariant: "red"       },
    4: { color: "orange", bannerBg: "bg-orange-500", buttonVariant: "orange"    },
    5: { color: "purple", bannerBg: "bg-purple-500", buttonVariant: "purple"    },
}

// ── Income unit section config (3 lessons each) ────────────────────────────

const INCOME_SECTIONS = [
    { emoji: "📋", title: "The Offer Letter", subtitle: "Land your first job" },
    { emoji: "🏢", title: "The First Day",    subtitle: "Clock in and get to work" },
    { emoji: "💰", title: "The Paycheck",     subtitle: "See what you earned" },
]

export const Unit = ({
    id,
    order,
    title,
    description,
    courseId,
    lessons,
    activeLesson,
    activeLessonPercentage,
    jobData,
}: Props) => {
    const isIncomeCourse = courseId === 1
    const { color: courseColor, bannerBg, buttonVariant } = COURSE_COLOR_MAP[courseId ?? 1] ?? COURSE_COLOR_MAP[1]

    // Parse job icon from stored jobData JSON (e.g. { job: "...", icon: "🕹️" })
    let jobIcon = "🏢"
    if (jobData) {
        try { jobIcon = (JSON.parse(jobData) as { icon?: string }).icon ?? "🏢" } catch { /* keep default */ }
    }

    // ── Helper: completedLocked check ────────────────────────────────────────

    function isCompletedLocked(lesson: Lesson): boolean {
        if (!isIncomeCourse || !lesson.completed) return false
        // Lock job-chooser (order 1) once lesson 2 (gross-net-income) is done
        if (lesson.order === 1) {
            return !!lessons.find(l => l.order === 2)?.completed
        }
        return false
    }

    // ── Income course: render 3 named sections ────────────────────────────────

    if (isIncomeCourse) {
        const sorted = [...lessons].sort((a, b) => a.order - b.order)
        const groups = [sorted.slice(0, 3), sorted.slice(3, 6), sorted.slice(6)]
        const totalCount = sorted.length - 1

        const sectionEmojis = [INCOME_SECTIONS[0].emoji, jobIcon, INCOME_SECTIONS[2].emoji]

        return (
            <>
                <UnitBanner title={`Unit ${order}: ${{1:"Income",2:"Budget",3:"Loans",4:"Assets",5:"Investments"}[order]??title}`} description="" bannerBg={bannerBg} buttonVariant={buttonVariant} />
                {INCOME_SECTIONS.map((section, sIdx) => {
                    const group = groups[sIdx] ?? []
                    const indexOffset = sIdx * 3
                    return (
                        <div key={sIdx}>
                            <div className="flex items-center flex-col relative">
                                {group.map((lesson, i) => {
                                    const absoluteIndex = indexOffset + i
                                    const isCurrent = lesson.id === activeLesson?.id
                                    const isLocked  = absoluteIndex > 0
                                        ? !sorted[absoluteIndex - 1].completed
                                        : false
                                    return (
                                        <LessonButton
                                            key={lesson.id}
                                            id={lesson.id}
                                            index={absoluteIndex}
                                            totalCount={totalCount}
                                            current={isCurrent}
                                            locked={isLocked}
                                            percentage={activeLessonPercentage}
                                            completedLocked={isCompletedLocked(lesson)}
                                            courseColor={courseColor}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </>
        )
    }

    // ── Default: single flat list ─────────────────────────────────────────────

    return (
        <>
            <UnitBanner title={title} description={description} bannerBg={bannerBg} buttonVariant={buttonVariant} />
            <div className="flex items-center flex-col relative">
                {lessons.map((lesson, index) => {
                    const isCurrent = lesson.id === activeLesson?.id
                    const isLocked  = index > 0
                        ? !lessons[index - 1].completed
                        : false
                    return (
                        <LessonButton
                            key={lesson.id}
                            id={lesson.id}
                            index={index}
                            totalCount={lessons.length - 1}
                            current={isCurrent}
                            locked={isLocked}
                            percentage={activeLessonPercentage}
                            completedLocked={isCompletedLocked(lesson)}
                            courseColor={courseColor}
                        />
                    )
                })}
            </div>
        </>
    )
}
