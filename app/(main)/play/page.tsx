import { redirect } from "next/navigation"
import { getCourseProgress } from "@/db/queries"

// Same unit/order → map-route mapping used by app/lesson/[lessonId]/page.tsx,
// trimmed to just the routes that are an actual explorable game world.
const INCOME_MAP_ROUTES: Record<number, string> = {
    1: "/map",
    3: "/map-3",       // farm gameplay
    5: "/map-3/fish",  // fishing gameplay
}

/**
 * "Play" — drops the player into whichever map world they're currently on
 * (their active, not-yet-completed lesson), in freeplay mode: no forced
 * intro dialogue or task sign, just the world and whatever's unlocked in it.
 */
export default async function PlayPage() {
    const courseProgress = await getCourseProgress().catch(() => null)
    const lesson = courseProgress?.activeLesson

    let target = "/map"
    if (lesson) {
        if (lesson.unitId === 1) target = INCOME_MAP_ROUTES[lesson.order] ?? "/map"
        else if (lesson.unitId === 2) target = "/map-budget"
        else if (lesson.unitId === 3) target = "/map-loans"
        else if (lesson.unitId === 5) target = "/map-invest"
    }

    redirect(`${target}?freeplay=1`)
}
