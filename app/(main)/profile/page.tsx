import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { BookOpen, Trophy, Star, Flame } from "lucide-react"
import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs"
import { Loader } from "lucide-react"

import { getUserProgress, getUnits, getTopTenUsers, getUserClassroomMembership } from "@/db/queries"
import { ProfilePicturePicker } from "@/components/profile/profile-picture-picker"
import { NameInput } from "@/components/profile/name-input"
import { ClassroomJoinCard } from "@/components/profile/classroom-join-card"

const ProfilePage = async () => {
    const { userId } = await auth()
    const [userProgress, units, topTen, membership] = await Promise.all([
        getUserProgress(),
        getUnits(),
        getTopTenUsers(),
        getUserClassroomMembership(),
    ])

    if (!userProgress || !userProgress.activeCourse) {
        redirect("/units")
    }

    // Parse saved profile data
    const profile: { selectedImage?: string; bgColor?: string } | null = (() => {
        try { return userProgress.characterData ? JSON.parse(userProgress.characterData) : null }
        catch { return null }
    })()

    // Parse job data
    const chosenJob: { job?: string; icon?: string } | null = (() => {
        try { return userProgress.jobData ? JSON.parse(userProgress.jobData) : null }
        catch { return null }
    })()

    // Count completed lessons
    const completedLessons = units
        .flatMap((u) => u.lessons)
        .filter((l) => l.completed).length

    // Find leaderboard rank
    const rankIndex = topTen.findIndex((u) => u.userId === userId)
    const rank = rankIndex === -1 ? null : rankIndex + 1

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-10">
            {/* Header with UserButton top-right */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800">My Profile</h1>
                    <p className="text-gray-500 mt-1">Customize your avatar and track your progress</p>
                </div>
                <ClerkLoading>
                    <Loader className="h-6 w-6 text-muted-foreground animate-spin mt-1" />
                </ClerkLoading>
                <ClerkLoaded>
                    <UserButton afterSignOutUrl="/" />
                </ClerkLoaded>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<BookOpen className="w-6 h-6 text-blue-500" />}
                    label="Lessons Completed"
                    value={String(completedLessons)}
                    bg="bg-blue-50"
                />
                <StatCard
                    icon={<Star className="w-6 h-6 text-yellow-500" />}
                    label="Points Earned"
                    value={String(userProgress.points)}
                    bg="bg-yellow-50"
                />
                <StatCard
                    icon={<Trophy className="w-6 h-6 text-purple-500" />}
                    label="Leaderboard Rank"
                    value={rank ? `#${rank}` : "Not yet ranked"}
                    bg="bg-purple-50"
                />
                <StatCard
                    icon={<Flame className="w-6 h-6 text-orange-500" />}
                    label="Day Streak"
                    value={`🔥 ${userProgress.streak ?? 0}`}
                    bg="bg-orange-50"
                />
                {(userProgress.role === "student" || userProgress.role === "other") && !membership && (
                    <ClassroomJoinCard role={userProgress.role as "student" | "other"} />
                )}
            </div>

            {/* Game Stats — only shown after job is chosen */}
            {chosenJob?.job && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Game Stats</p>
                    <div className="flex items-center gap-3 text-gray-700 font-medium">
                        <span className="text-2xl">{chosenJob.icon ?? "💼"}</span>
                        <div>
                            <p className="text-sm text-gray-500">Current Job</p>
                            <p className="text-base font-bold">{chosenJob.job}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Name input */}
            <NameInput initialName={userProgress.userName} locked={false} />

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Profile picture picker */}
            <div id="profile-picture">
                <h2 className="text-xl font-bold text-gray-700 mb-6">Profile Picture</h2>
                <ProfilePicturePicker
                    initialImage={profile?.selectedImage}
                    initialBgColor={profile?.bgColor}
                />
            </div>
        </div>
    )
}

function StatCard({
    icon,
    label,
    value,
    bg,
    muted,
}: {
    icon: React.ReactNode
    label: string
    value: string
    bg: string
    muted?: boolean
}) {
    return (
        <div className={`rounded-2xl p-4 flex flex-col gap-2 ${bg}`}>
            {icon}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-extrabold ${muted ? "text-gray-400" : "text-gray-800"}`}>{value}</p>
        </div>
    )
}

export default ProfilePage
