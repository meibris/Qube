"use client"

import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { courses, userProgress } from "@/db/schema"

import { Card } from "./card"
import { upsertUserProgress } from "@/actions/user-progress"

//interactive elements

type Props = {
    courses: typeof courses.$inferSelect[]
    activeCourseId?: typeof userProgress.$inferSelect.activeCourseId
}

export const List = ({ courses, activeCourseId }: Props) => {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const onClick = (id: number) => {
        if (pending) return

        if (id === activeCourseId) {
            return router.push("/learn")
        }

        startTransition(() => {
            upsertUserProgress(id)
                .catch(() => toast.error("Something went wrong."))
        })
    }


    const row1 = courses.slice(0, 3)
    const row2 = courses.slice(3)

    return (
        <div className="pt-6 flex flex-col gap-4">
            {/* Top row — 3 cards evenly spaced */}
            <div className="flex justify-evenly gap-4">
                {row1.map((course) => (
                    <Card
                        key={course.id}
                        id={course.id}
                        title={course.title}
                        imageSrc={course.imageSrc}
                        onClick={onClick}
                        disabled={pending}
                        active={course.id === activeCourseId}
                    />
                ))}
            </div>
            {/* Bottom row — 2 cards evenly spaced */}
            {row2.length > 0 && (
                <div className="flex justify-evenly gap-4">
                    {row2.map((course) => (
                        <Card
                            key={course.id}
                            id={course.id}
                            title={course.title}
                            imageSrc={course.imageSrc}
                            onClick={onClick}
                            disabled={pending}
                            active={course.id === activeCourseId}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}