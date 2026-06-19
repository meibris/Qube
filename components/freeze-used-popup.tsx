"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
    freezeUsedAt:  string | null
    streakFreezes: number
}

const SESSION_KEY = "freeze_popup_dismissed_for"

export function FreezeUsedPopup({ freezeUsedAt, streakFreezes }: Props) {
    const router = useRouter()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!freezeUsedAt) return

        const today      = new Date().toISOString().slice(0, 10)
        if (freezeUsedAt !== today) return

        // Only show once per session per date
        const dismissed = sessionStorage.getItem(SESSION_KEY)
        if (dismissed === today) return

        setVisible(true)
    }, [freezeUsedAt])

    function dismiss() {
        const today = new Date().toISOString().slice(0, 10)
        sessionStorage.setItem(SESSION_KEY, today)
        setVisible(false)
    }

    function buyAnother() {
        dismiss()
        router.push("/shop")
    }

    if (!visible) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full relative">
                {/* Close */}
                <button
                    onClick={dismiss}
                    className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Icon */}
                <div className="text-6xl text-center mb-4">🧊🔥</div>

                {/* Copy */}
                <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
                    Streak Freeze Used!
                </h2>
                <p className="text-sm text-gray-500 text-center leading-relaxed mb-1">
                    You missed a day, but your streak was protected by a <span className="font-semibold text-blue-500">Streak Freeze</span>.
                </p>
                <p className="text-sm text-center font-semibold text-gray-700 mb-6">
                    You have{" "}
                    <span className={streakFreezes === 0 ? "text-red-500" : "text-blue-500"}>
                        {streakFreezes} freeze{streakFreezes !== 1 ? "s" : ""}
                    </span>{" "}
                    remaining.
                </p>

                {/* Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={dismiss}
                        variant="ghost"
                        className="flex-1 text-gray-500"
                    >
                        Got it
                    </Button>
                    <Button
                        onClick={buyAnother}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        disabled={streakFreezes >= 3}
                    >
                        Buy another
                    </Button>
                </div>
            </div>
        </div>
    )
}
