import Image from "next/image";
import { redirect } from "next/navigation";

import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { Separator } from "@/components/ui/separator";
import { UserProgress } from "@/components/user-progress";
import { getTopTenUsers, getUserProgress } from "@/db/queries";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Quests } from "@/components/quests";

const LeaderboardPage = async () => {
    const userProgressData = getUserProgress()
    const leaderboardData = getTopTenUsers()

  const [userProgress, leaderboard] = await Promise.all([
    getUserProgress(),
    getTopTenUsers(),
  ]);

  // Redirect if no user progress or active course
  if (!userProgress || !userProgress.activeCourse) {
    redirect("/courses");
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
            See where you stand among other learners in your community.
          </p>
          <Separator className="mb-4 h-0.5 rounded-full"/>
          {leaderboard.map((userProgress, index) => (
            <div 
                key={userProgress.userId}
                className="flex items-center w-full p-2 px-4 rounded-xl hover:bg-gray-200/50"
            >   
                <p className="font-bold text-lime-700 mr-4">{index+1}</p>
                <Avatar
                    className="border bg-green-200 h-12 w-12 ml-3 mr-6"
                > 
                    <AvatarImage 
                        className="object-cover"
                        src={userProgress.userImageSrc}
                    />
                </Avatar>
                <p className="font-bold text-neutral-800 flex-1">
                    {userProgress.userName}
                </p>
                <p className="text-muted-foreground">
                    {userProgress.points} XP
                </p>
            </div>
          ))} 
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
