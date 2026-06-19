import { FeedWrapper } from "@/components/feed-wrapper"
import { StickyWrapper } from "@/components/sticky-wrapper"
import { UserProgress } from "@/components/user-progress"
import { getUserProgress } from "@/db/queries"
import Image from "next/image"
import { redirect } from "next/navigation"
import { Items } from "./items"
import { Quests } from "@/components/quests"

const ShopPage = async () => {
    const userProgressData = getUserProgress()

    const [
        userProgress
    ] = await Promise.all([
        userProgressData,
    ])

    if (!userProgress || !userProgress.activeCourse) {
        redirect("/units")
    }

    return (
        <div className="flex flex-row-reverse gap-[48px] px-6">
            <StickyWrapper>
                <UserProgress
                    activeCourse={userProgress.activeCourse}
                    hearts={userProgress.hearts}
                    points={userProgress.points}
                    hasActiveSubscription={false} //not in use
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
                <div className="w-full flex flex-col items-center">
                    <Image 
                        src="/shop.svg"
                        alt="Shop"
                        height={90}
                        width={90}
                    />
                    <h1 className="text-center font-bold text-neutral-800 text-2xl my-6">
                        Shop
                    </h1>
                    <p className="text-muted-foreground text-center text-lg mb-6">
                        Spend your points on cool boosters.
                    </p>
                    <Items
                        hearts={userProgress.hearts}
                        points={userProgress.points}
                        hasActiveSubscription={false} //not in use
                        streakFreezes={userProgress.streakFreezes ?? 0}
                    />
                </div>
            </FeedWrapper>
        </div>
    )
}

export default ShopPage 