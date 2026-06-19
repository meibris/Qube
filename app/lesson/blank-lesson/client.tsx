"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useExitModal } from "@/store/use-exit-modal"
import { saveGameLesson } from "@/actions/game-lesson"

interface Props { lessonKey: string }

export function BlankLessonClient({ lessonKey }: Props) {
    const router = useRouter()
    const { open } = useExitModal()
    const [saving, setSaving] = useState(false)

    async function handleComplete() {
        if (!lessonKey) return
        setSaving(true)
        await saveGameLesson(lessonKey)
        router.push("/learn")
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <header className="lg:pt-[50px] pt-[20px] px-10 flex gap-x-7 items-center justify-between max-w-[1140px] mx-auto w-full">
                <X
                    onClick={open}
                    className="text-slate-500 hover:opacity-75 transition cursor-pointer"
                />
                <Progress value={50} />
                <div className="w-7" />
            </header>

            <div className="flex flex-1 items-center justify-center px-6">
                <button
                    onClick={handleComplete}
                    disabled={saving || !lessonKey}
                    className="py-4 px-10 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-lg shadow-lg border-b-4 border-green-700 transition-all"
                >
                    {saving ? "Saving…" : "Complete Lesson"}
                </button>
            </div>
        </div>
    )
}
