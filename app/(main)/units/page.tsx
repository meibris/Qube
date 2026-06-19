import { redirect } from "next/navigation"

import { getCourses, getUserProgress } from "@/db/queries"
import { StickyWrapper } from "@/components/sticky-wrapper"
import { FeedWrapper } from "@/components/feed-wrapper"
import { UserProgress } from "@/components/user-progress"
import { Quests } from "@/components/quests"
import { List } from "./list"

const CoursesPage = async () => {
    const coursesData = getCourses()
    const userProgressData = getUserProgress()

    const [courses, userProgress] = await Promise.all([coursesData, userProgressData])

    if (!userProgress?.activeCourse) {
        // No active course yet — show page without sidebar
        return (
            <div className="h-full max-w-[912px] px-3 mx-auto">
                <h1 className="text-2xl font-bold text-neutral-700">Units</h1>
                <List courses={courses} activeCourseId={userProgress?.activeCourseId} />
            </div>
        )
    }

    return (
        <div className="flex flex-row-reverse gap-[48px] px-6">
            <StickyWrapper>
                <UserProgress
                    activeCourse={userProgress.activeCourse}
                    hearts={userProgress.hearts}
                    points={userProgress.points}
                    hasActiveSubscription={false}
                    characterData={userProgress.characterData}
                    userImageSrc={userProgress.userImageSrc}
                    streak={userProgress.streak ?? 0}
                    lastStreakDate={userProgress.lastStreakDate}
                    jobData={userProgress.jobData}
                    tokens={userProgress.tokens ?? 0}
                    tokenRate={userProgress.tokenRate ?? 0}
                    jobStartedAt={userProgress.jobStartedAt ?? null}
                    activeCourseId={userProgress.activeCourseId}
                    streakFreezes={userProgress.streakFreezes ?? 0}
                    freezeUsedAt={userProgress.freezeUsedAt ?? null}
                />
                <Quests points={userProgress.points} />
            </StickyWrapper>
            <FeedWrapper>
                <h1 className="text-2xl font-bold text-neutral-700 mb-6">Units</h1>
                <List courses={courses} activeCourseId={userProgress.activeCourseId} />
            </FeedWrapper>
        </div>
    )
}

export default CoursesPage
