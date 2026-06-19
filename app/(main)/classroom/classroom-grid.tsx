"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

type Classroom = {
    id: number
    name: string
    emoji: string
    code: string
}

type Props = {
    classrooms: Classroom[]
    activeId?: number
}

export const ClassroomGrid = ({ classrooms, activeId }: Props) => {
    const router = useRouter()

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-bold text-neutral-700 mb-8">Classroom</h1>

            <div className="flex flex-wrap gap-4">
                {classrooms.map((c) => (
                    <div
                        key={c.id}
                        onClick={() => router.push(`/classroom?id=${c.id}`)}
                        className={cn(
                            "w-[210px] min-h-[217px] border-2 rounded-xl border-b-4 hover:bg-black/5 cursor-pointer active:border-b-2 flex flex-col items-center justify-between p-3 pb-6 transition-colors",
                            activeId === c.id && "border-sky-400 bg-sky-50"
                        )}
                    >
                        <div className="w-full flex items-center justify-end h-6" />
                        <span className="text-7xl select-none">{c.emoji}</span>
                        <p className="text-neutral-700 text-center font-bold mt-3">{c.name}</p>
                    </div>
                ))}

                {/* New Classroom card */}
                <div
                    onClick={() => router.push("/classroom?create=1")}
                    className="w-[210px] min-h-[217px] border-2 border-dashed border-neutral-300 rounded-xl hover:border-green-400 hover:bg-green-50 cursor-pointer active:border-b-2 flex flex-col items-center justify-center gap-3 p-3 pb-6 transition-colors group"
                >
                    <div className="w-20 h-20 rounded-2xl border-2 border-neutral-300 group-hover:border-green-400 flex items-center justify-center">
                        <Plus className="h-10 w-10 text-neutral-300 group-hover:text-green-400 transition-colors" strokeWidth={2.5} />
                    </div>
                    <p className="text-neutral-400 group-hover:text-green-500 text-center font-bold transition-colors">
                        New Classroom
                    </p>
                </div>
            </div>
        </div>
    )
}
