"use client"

import Confetti from "react-confetti"
import { useWindowSize } from "react-use"
import { useRouter } from "next/navigation"
import { ResultCard } from "./result-card"

type Props = {
    xp: number
}

export const LessonComplete = ({ xp }: Props) => {
    const { width, height } = useWindowSize()
    const router = useRouter()

    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
            <Confetti
                width={width}
                height={height}
                recycle={false}
                numberOfPieces={400}
                tweenDuration={8000}
            />
            <div className="flex flex-col gap-y-4 lg:gap-y-8 max-w-lg mx-auto text-center items-center justify-center px-6">
                <span className="text-7xl">🎉</span>
                <h1 className="text-xl lg:text-3xl font-bold text-neutral-700">
                    Great job! <br /> You&apos;ve completed the lesson.
                </h1>
                <div className="flex items-center gap-x-4 w-full">
                    <ResultCard variant="points" value={xp} />
                </div>
                <button
                    onClick={() => router.push("/learn")}
                    className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-base shadow-md transition-all"
                >
                    Continue
                </button>
            </div>
        </div>
    )
}
