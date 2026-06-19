import { redirect } from "next/navigation"

import { FeedWrapper } from "@/components/feed-wrapper"
import { StickyWrapper } from "@/components/sticky-wrapper"
import { UserProgress } from "@/components/user-progress"
import { 
  getCourseProgress, 
  getLessonPercentage, 
  getUnits, 
  getUserProgress 
} from "@/db/queries"

import { Header } from "./header"
import { Unit } from "./unit"
import { Quests } from "@/components/quests"
import { IncomeProfilePrompt } from "@/components/income-profile-prompt"
import { LearnShell } from "./learn-shell"

const LearnPage = async () => {
  const userProgressData = getUserProgress()
  const courseProgressData = getCourseProgress()
  const lessonPercentageData = getLessonPercentage()
  const unitsData = getUnits()

  const [
    userProgress,
    units,
    courseProgress,
    lessonPercentage,
  ] = await Promise.all([
    userProgressData,
    unitsData,
    courseProgressData,
    lessonPercentageData,
  ])

  if (!userProgress || !userProgress.activeCourse) {
    redirect("/units")
  }

  if (!courseProgress) {
    redirect("/units")
  }

    return (
        <LearnShell>
        <div className="flex flex-row-reverse gap-[48px] px-6">
<IncomeProfilePrompt
            hasProfile={!!userProgress.characterData}
            isIncomeCourse={userProgress.activeCourseId === 1}
          />
          <StickyWrapper>
            <UserProgress
              activeCourse={userProgress.activeCourse}
              hearts={userProgress.hearts}
              points={userProgress.points}
              hasActiveSubscription={false} //not in use
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
            <Quests points={userProgress.points}/>
          </StickyWrapper>
          <FeedWrapper>
            <Header title={userProgress.activeCourse.title} />
            {units.map((unit) => (
              <div key={unit.id} className="mb-10">
                <Unit
                  id={unit.id}
                  order={unit.order}
                  description={unit.description}
                  title={unit.title}
                  courseId={unit.courseId}
                  lessons={unit.lessons}
                  activeLesson={courseProgress.activeLesson}
                  activeLessonPercentage={lessonPercentage}
                  jobData={userProgress.jobData}
                  />
              </div>
            ))}
          </FeedWrapper>
        </div>
        </LearnShell>
    )
}

export default LearnPage