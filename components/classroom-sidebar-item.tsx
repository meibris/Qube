"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronUp, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Classroom = {
    id: number
    name: string
    emoji: string
    code: string
}

type Props = {
    classrooms: Classroom[]
}

export const ClassroomSidebarItem = ({ classrooms }: Props) => {
    const pathname = usePathname()
    const isActive = pathname === "/classroom" || pathname.startsWith("/classroom")
    const [open, setOpen] = useState(isActive)

    return (
        <div className="flex flex-col">
            {/* Header toggle */}
            <Button
                variant={isActive && !open ? "sidebarOutline" : "sidebar"}
                className="justify-between h-[52px] w-full"
                onClick={() => setOpen((v) => !v)}
            >
                <span className="flex items-center gap-x-3">
                    <span className="text-2xl">🏫</span>
                    CLASSROOM
                </span>
                {open
                    ? <ChevronUp className="h-4 w-4 text-neutral-400" />
                    : <ChevronDown className="h-4 w-4 text-neutral-400" />
                }
            </Button>

            {/* Dropdown list — scrollable so profile stays pinned */}
            {open && (
                <div className="flex flex-col gap-y-1 mt-1 pl-2 overflow-y-auto max-h-[260px] styled-scrollbar pr-1">
                    {classrooms.map((c) => (
                        <Link key={c.id} href={`/classroom?id=${c.id}`}>
                            <div className={cn(
                                "flex items-center gap-x-3 h-[52px] px-4 rounded-xl border-2 transition-colors cursor-pointer",
                                pathname.includes(`id=${c.id}`) ? "bg-sky-500/15 border-sky-300 text-sky-500" : "border-transparent text-slate-500 hover:bg-slate-100"
                            )}>
                                <span className="text-2xl">{c.emoji}</span>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold truncate">{c.name}</span>
                                    <span className="text-xs text-neutral-400 font-mono">{c.code}</span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Create new classroom */}
                    <Link href="/classroom?create=1">
                        <div className="flex items-center gap-x-3 h-[52px] px-4 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-green-400 hover:text-green-500 hover:bg-green-50 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-xl border-2 border-current flex items-center justify-center flex-shrink-0">
                                <Plus className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wide">New classroom</span>
                        </div>
                    </Link>
                </div>
            )}
        </div>
    )
}
