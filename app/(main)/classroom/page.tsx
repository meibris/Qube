import { redirect } from "next/navigation"
import {
    getUserProgress,
    getTeacherClassroom,
    getTeacherClassroomById,
    getTeacherClassrooms,
    getUserClassroomMembership,
} from "@/db/queries"
import { ClassroomClient } from "./classroom-client"
import { ClassroomGrid } from "./classroom-grid"
import { ClassroomDashboard } from "./classroom-dashboard"

type Props = {
    searchParams: Promise<{ id?: string; create?: string }>
}

export default async function ClassroomPage({ searchParams }: Props) {
    const { id, create } = await searchParams

    const [userProgress, membership] = await Promise.all([
        getUserProgress(),
        getUserClassroomMembership(),
    ])

    // Students/others who already joined a classroom go to learn
    if ((userProgress?.role === "student" || userProgress?.role === "other") && membership) {
        redirect("/learn")
    }

    // ── Teacher ──────────────────────────────────────────────────────────────
    if (userProgress?.role === "teacher") {

        // ?create=1 → create form
        if (create === "1") {
            return <ClassroomClient initialRole="teacher" classroomData={null} forceCreate />
        }

        // ?id=X → show that classroom's dashboard
        if (id) {
            const classroomData = await getTeacherClassroomById(Number(id))
            if (!classroomData) redirect("/classroom")
            return (
                <ClassroomDashboard
                    classroom={classroomData.classroom}
                    members={classroomData.members as any}
                    freshCode={null}
                    backHref="/classroom"
                />
            )
        }

        // No params → show classroom picker grid
        const allClassrooms = await getTeacherClassrooms()
        if (allClassrooms.length === 0) {
            // No classrooms yet → go straight to create
            return <ClassroomClient initialRole="teacher" classroomData={null} />
        }
        return <ClassroomGrid classrooms={allClassrooms} />
    }

    // ── No role yet / student without classroom ───────────────────────────
    const classroomData = null
    return (
        <ClassroomClient
            initialRole={userProgress?.role ?? null}
            classroomData={classroomData}
        />
    )
}
