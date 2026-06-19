import Link from "next/link"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { SidebarItem } from "./sidebar-item"
import { ProfileSidebarItem } from "./profile-sidebar-item"
import { ClassroomSidebarItem } from "./classroom-sidebar-item"
import { getUserProgress, getTeacherClassrooms } from "@/db/queries"

type Props = {
    className?: string
}

export const Sidebar = async ({ className }: Props) => {
    let profile: { selectedImage?: string; bgColor?: string } | null = null
    let clerkImageSrc: string | undefined
    let userProgressData: Awaited<ReturnType<typeof getUserProgress>> = null
    let teacherClassrooms: Awaited<ReturnType<typeof getTeacherClassrooms>> = []
    try {
        userProgressData = await getUserProgress()
        clerkImageSrc = userProgressData?.userImageSrc
        if (userProgressData?.characterData) {
            profile = JSON.parse(userProgressData.characterData)
        }
        if (userProgressData?.role === "teacher") {
            teacherClassrooms = await getTeacherClassrooms()
        }
    } catch {}

    return (
        <div className={cn(
          "flex h-full lg:w-[256px] lg:fixed left-0 top-0 px-4 border-r-2 flex-col",
          className,
        )}>
          <Link href="/learn">
            <div className="pt-8 pl-4 pb-7 flex items-center gap-x-3">
              <Image src="/QubeSymbolTemp.svg" height={40} width={40} alt="Logo" />
              <h1 className="text-2xl font-extrabold text-blue-600 tracking-wide">
                Qube
              </h1>
            </div>
          </Link>

          <div className="flex flex-col gap-y-2 flex-1 min-h-0 overflow-y-auto">
            <SidebarItem label="Learn"            href="/learn"             iconSrc="/learn.svg" />
            <SidebarItem label="Leaderboard"      href="/leaderboard"       iconSrc="/leaderboard.svg" />
            <SidebarItem label="Quests"           href="/quests"            iconSrc="/quests.svg" />
            <SidebarItem label="Shop"             href="/shop"              iconSrc="/shop.svg" />
            {userProgressData?.role === "teacher" && (
              <ClassroomSidebarItem classrooms={teacherClassrooms} />
            )}
          </div>

          <div className="p-4 shrink-0 bg-white border-t border-slate-100">
            <ProfileSidebarItem
              selectedImage={profile?.selectedImage}
              bgColor={profile?.bgColor}
              userImageSrc={clerkImageSrc}
            />
          </div>
        </div>
    )
}
