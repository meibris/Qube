"use client"

import { useState } from "react"
import { X, BookOpen, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useExitModal } from "@/store/use-exit-modal"

type Props = {
    lessonLabel: string
    instructions: React.ReactNode
    progress: number
    children: React.ReactNode
}

export function GameShell({ lessonLabel, instructions, progress, children }: Props) {
    const [panelOpen, setPanelOpen] = useState(false)
    const { open } = useExitModal()

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Header */}
            <header className="lg:pt-[50px] pt-[20px] px-10 flex gap-x-7 items-center justify-between max-w-[1140px] mx-auto w-full">
                <X
                    onClick={open}
                    className="text-slate-500 hover:opacity-75 transition cursor-pointer shrink-0"
                />
                <Progress value={progress} className="flex-1" />
                <button
                    onClick={() => setPanelOpen(v => !v)}
                    className="flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-700 transition shrink-0"
                >
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Tips</span>
                    <ChevronRight
                        className={`w-4 h-4 transition-transform duration-300 ${panelOpen ? "rotate-180" : ""}`}
                    />
                </button>
            </header>

            {/* Body */}
            <div className="flex flex-1 relative">
                {/* Game content */}
                <div className="flex-1 overflow-y-auto px-6 py-8 max-w-[1140px] mx-auto w-full">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 text-center">
                        {lessonLabel}
                    </p>
                    {children}
                </div>

                {/* Instructions drawer */}
                <div
                    className={`fixed top-0 right-0 h-full w-80 bg-white border-l-2 border-gray-100 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out ${panelOpen ? "translate-x-0" : "translate-x-full"}`}
                >
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                            <h3 className="font-bold text-gray-800">Instructions</h3>
                        </div>
                        <button
                            onClick={() => setPanelOpen(false)}
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 text-sm text-gray-600 leading-relaxed flex flex-col gap-3">
                        {instructions}
                    </div>
                </div>

                {/* Backdrop for mobile */}
                {panelOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                        onClick={() => setPanelOpen(false)}
                    />
                )}
            </div>
        </div>
    )
}
