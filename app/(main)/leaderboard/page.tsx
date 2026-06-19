import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { Separator } from "@/components/ui/separator";
import { UserProgress } from "@/components/user-progress";
import { getTopTenUsers, getUserProgress, getUserClassroomMembership } from "@/db/queries";
import { Quests } from "@/components/quests";

const LeaderboardPage = async () => {
  const [userProgress, leaderboard, membership] = await Promise.all([
    getUserProgress(),
    getTopTenUsers(),
    getUserClassroomMembership(),
  ]);

  // Redirect if no user progress or active course
  if (!userProgress || !userProgress.activeCourse) {
    redirect("/units");
  }

  // Redirect to classroom setup if not in any classroom
  if (!membership) {
    redirect("/classroom");
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
        <Quests points={userProgress.points} />
      </StickyWrapper>

      {/* Main leaderboard feed */}
      <FeedWrapper>
        <div className="w-full flex flex-col items-center">
          <Image
            src="/leaderboard.svg"
            alt="Leaderboard"
            height={90}
            width={90}
          />
          <h1 className="text-center font-bold text-neutral-800 text-2xl my-6">
            Leaderboard
          </h1>
          <p className="text-muted-foreground text-center text-lg mb-6">
            See where you stand among your classmates.
          </p>
          <Separator className="mb-4 h-0.5 rounded-full"/>
          {leaderboard.map((entry, index) => {
            let profile: { selectedImage?: string; bgColor?: string } | null = null
            try { profile = entry.characterData ? JSON.parse(entry.characterData) : null } catch {}
            return (
              <div
                key={entry.userId}
                className="flex items-center w-full p-2 px-4 rounded-xl hover:bg-gray-200/50"
              >
                <p className="font-bold text-lime-700 mr-4">{index + 1}</p>
                <div
                  className="h-12 w-12 ml-3 mr-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow-sm"
                  style={{ backgroundColor: profile?.bgColor ?? "#e2e8f0" }}
                >
                  {profile?.selectedImage ? (
                    <Image src={profile.selectedImage} alt={entry.userName} width={36} height={36} className="object-contain" />
                  ) : (
                    <Image src={entry.userImageSrc} alt={entry.userName} width={48} height={48} className="object-cover rounded-full" />
                  )}
                </div>
                <p className="font-bold text-neutral-800 flex-1">{entry.userName}</p>
                <p className="text-muted-foreground">{entry.points} XP</p>
              </div>
            )
          })} 
          {/* Leaderboard list
          {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
            <div className="w-full max-w-md flex flex-col gap-3">
              {leaderboard.map((user, index) => (
                <div
                  key={user.userId}
                  className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm"
                >
                  <span>
                    #{index + 1} {user.userName}
                  </span>
                  <span className="font-semibold">{user.points} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-4">
              No leaderboard data available.
            </p>
          )} */}
        </div>
      </FeedWrapper>
    </div>
  );
};

export default LeaderboardPage;
