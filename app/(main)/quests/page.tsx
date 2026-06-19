import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { Separator } from "@/components/ui/separator";
import { UserProgress } from "@/components/user-progress";
import { getUserProgress } from "@/db/queries";
import { Progress } from "@/components/ui/progress";
import { quests } from "@/constants";

const QuestsPage = async () => {
  const [
    userProgress
  ] = await Promise.all([
    getUserProgress(),
  ]);

  // Redirect if no user progress or active course
  if (!userProgress || !userProgress.activeCourse) {
    redirect("/units");
  }

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      {/* Sticky sidebar showing user's progress */}
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={false} // not in use
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
      </StickyWrapper>

      <FeedWrapper>
        <div className="w-full flex flex-col items-center">
          <Image
            src="/quests.svg"
            alt="Quests"
            height={90}
            width={90}
          />
          <h1 className="text-center font-bold text-neutral-800 text-2xl my-6">
            Quests
          </h1>
          <p className="text-muted-foreground text-center text-lg mb-6">
            Completed Quests by earning points.
          </p>
          <ul className="w-full">
            {quests.map((quest) => {
              const current =
                quest.type === "xp"      ? userProgress.points
                : quest.type === "coins" ? (userProgress.tokens ?? 0)
                :                          (userProgress.totalBerries ?? 0)
              const progress = Math.min((current / quest.value) * 100, 100)

              return (
                <div
                  className="flex items-center w-full p-4 gap-x-4 border-t-2"
                  key={quest.title}
                >
                  {quest.icon ? (
                    <Image
                      src={quest.icon}
                      alt={quest.title}
                      width={60}
                      height={60}
                    />
                  ) : (
                    <span className="text-5xl w-[60px] h-[60px] flex items-center justify-center">{quest.emoji}</span>
                  )}
                  <div className="flex flex-col gap-y-2 w-full">
                    <p className="text-neutral-700 text-xl font-bold">
                      {quest.title}
                    </p>
                    <Progress value={progress} className="h-3"/>
                    <p className="text-xs text-muted-foreground">
                      {Math.min(current, quest.value)} / {quest.value}
                    </p>
                  </div>
                </div>
              )
            })}
          </ul>
        </div>
      </FeedWrapper>
    </div>
  );
};

export default QuestsPage;
