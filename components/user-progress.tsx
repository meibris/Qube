import Link from "next/link"
import Image from "next/image"
import { InfinityIcon } from "lucide-react"

import { courses } from "@/db/schema"
import { Button } from "@/components/ui/button"

type Props = {
    activeCourse: typeof courses.$inferSelect
    hearts: number
    points: number
    hasActiveSubscription: boolean //not in use
}

export const UserProgress = ({ 
    activeCourse, 
    points, 
    hearts, 
    hasActiveSubscription //not in use
}: Props) => {
    return (
        <div className="flex items-center justify-between gap-x-2 w-full">
            <Link href="/courses">
                <Button variant="defaultOutline">
                    <Image
                        src={activeCourse.imageSrc}
                        alt={activeCourse.title}
                        className="rounded-md border"
                        width={32}
                        height={32}
                    />
                </Button>
            </Link>
            <Link href="/shop">
                <Button variant="defaultOutline" className="text-orange-500">
                    <Image src="/points.svg" height={28} width={28} alt="Points" className="mr-2"/>
                    {points}
                </Button>
            </Link>
            <Link href="/shop">
                <Button variant="defaultOutline" className="text-rose-500">
                    <Image src="/heart.svg" height={22} width={22} alt="Hearts" className="mr-2"/>
                    {hasActiveSubscription  //not in use
                        ? <InfinityIcon className="h-4 w-4 stroke-[3]" /> 
                        : hearts
                    }
                </Button>
            </Link>
        </div>
    )
}