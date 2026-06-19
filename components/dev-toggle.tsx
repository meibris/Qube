"use client"

import { useDevMode, toggleDevMode } from "@/contexts/dev-mode"
import { useRouter } from "next/navigation"

export function DevToggle() {
    const devMode = useDevMode()
    const router = useRouter()

    function handleToggle() {
        toggleDevMode()
        router.refresh()
    }

    return (
        <button
            onClick={handleToggle}
            title={devMode ? "Dev mode ON — all lessons unlocked" : "Dev mode OFF — normal locking"}
            className={`
                fixed bottom-4 right-4 z-50
                flex items-center gap-2 px-3 py-2 rounded-xl
                border-2 border-b-4 text-xs font-bold uppercase tracking-wide
                shadow-lg transition-colors select-none
                ${devMode
                    ? "bg-amber-400 border-amber-500 text-amber-900 hover:bg-amber-300"
                    : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"}
            `}
        >
            <span className="text-base">{devMode ? "🔓" : "🔒"}</span>
            Dev
            <span className={`w-8 h-4 rounded-full relative transition-colors ${devMode ? "bg-amber-600" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${devMode ? "left-4" : "left-0.5"}`} />
            </span>
        </button>
    )
}
