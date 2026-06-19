"use client"

import { toast } from "sonner"
import { useAudio, useMount } from "react-use"
import { useState, useTransition } from "react"

import { challengeOptions, challenges } from "@/db/schema"
import { upsertChallengeProgress } from "@/actions/challenge-progress"

import { Header } from "./header"
import { Footer } from "./footer"
import { Challenge } from "./challenge"
import { QuestionBubble } from "./question-bubble"
import { usePracticeModal } from "@/store/use-practice-modal"
import { LessonComplete } from "./lesson-complete"

type Props ={
    initialPercentage: number
    initialCoins: number
    initialLessonId: number
    initialLessonChallenges: (typeof challenges.$inferSelect & {
        completed: boolean
        challengeOptions: typeof challengeOptions.$inferSelect[]
    })[]
    userSubscription?: any
}

export const Quiz = ({
    initialPercentage,
    initialCoins,
    initialLessonId,
    initialLessonChallenges,
}: Props) => {
    const { open: openPracticeModal } = usePracticeModal()

    useMount(() => {
        if (initialPercentage === 100) { //already completed
            openPracticeModal()
        }
    })

    const [finishAudio] = useAudio({ src: "/finish.mp3", autoPlay: true })
    const [
        correctAudio,
        _c,
        correctControls,
    ] = useAudio({ src: "/correct.wav" })
    const [
        incorrectAudio,
        _i,
        incorrectControls,
    ] = useAudio({ src: "/incorrect.wav" })
    const [pending, startTransition] = useTransition()

    const [lessonId] = useState(initialLessonId)
    const [percentage, setPercentage] = useState(() => {
        return initialPercentage === 100 ? 0 : initialPercentage
    })
    const [challenges] = useState(initialLessonChallenges)
    const [activeIndex, setActiveIndex] = useState(() => {
        const uncompletedIndex = challenges.findIndex((challenge) => !challenge.completed)
        return uncompletedIndex === -1 ? 0 : uncompletedIndex //remembers where they left off
    })

    const [selectedOption, setSelectedOption] = useState<number>()
    const [status, setStatus] = useState<"correct" | "wrong" | "none">("none")
    const [wrongChallengeIds, setWrongChallengeIds] = useState<Set<number>>(new Set())

    //this is the current challenge
    const challenge = challenges[activeIndex] //which challenge is currently active
    const options = challenge?.challengeOptions ?? []

    const onNext = () => {
        setActiveIndex((current) => current + 1)
    }

    const onSelect = (id: number) => {
        if (status !== "none") return

        setSelectedOption(id)
    }

    const onContinue = () => {
        if (!selectedOption) return

        if (status === "wrong") {
            setStatus("none")
            setSelectedOption(undefined)
            return
        }

        if (status === "correct") {
            onNext() //load next question
            setStatus("none")
            setSelectedOption(undefined)
            return
        }

        const correctOption = options.find((option) => option.correct)

        if (!correctOption) {
            console.error("There is no correctOption") //added this myself
            return
        }

        if (correctOption.id === selectedOption) {
            startTransition(() => {
                upsertChallengeProgress(challenge.id)
                    .then(() => {
                        correctControls.play()
                        setStatus("correct")
                        setPercentage((prev) => prev + 100 / challenges.length)
                    })
                    .catch(() => toast.error("Something went wrong. Please try again."))
            })
        } else {
            incorrectControls.play()
            setStatus("wrong")
            setWrongChallengeIds((prev) => new Set([...prev, challenge.id]))
        }
    }

    const handleRetry = () => {
        setActiveIndex(0)
        setPercentage(0)
        setWrongChallengeIds(new Set())
        setStatus("none")
        setSelectedOption(undefined)
    }

    if (!challenge) {
        const tooManyWrong = wrongChallengeIds.size > challenges.length / 2

        if (tooManyWrong) {
            return (
                <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
                    <div className="flex flex-col gap-y-4 lg:gap-y-8 max-w-lg mx-auto text-center items-center justify-center px-6">
                        <span className="text-7xl">😓</span>
                        <h1 className="text-xl lg:text-3xl font-bold text-neutral-700">
                            Almost! Let&apos;s try again.
                        </h1>
                        <p className="text-neutral-500 text-base">
                            You missed {wrongChallengeIds.size} out of {challenges.length} questions.
                            Review and give it another shot!
                        </p>
                        <button
                            onClick={handleRetry}
                            className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-base shadow-md transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )
        }

        return (
            <>
                {finishAudio}
                <LessonComplete xp={challenges.length * 5} />
            </>
        )
    }

    const title = challenge.type === "ASSIST" 
    ? "Select the correct meaning"
    : challenge.question

    return (
        <>
            {incorrectAudio}
            {correctAudio}
            <Header
                coins={initialCoins}
                percentage={percentage}
            />
            <div className="flex-1">
                <div className="h-full flex items-center justify-center">
                    <div className="lg:min-h-[350px] lg:w-[600px] w-full px-6 lg:px-0 flex flex-col gap-y-12">
                        <h1 className="text-lg lg:text-3xl text-center lg:text-start font-bold text-neutral-700">
                            {title}
                        </h1>
                        <div>
                            {challenge.type === "ASSIST" && (
                                <QuestionBubble question={challenge.question} />
                            )}
                            <Challenge 
                                options={options}
                                onSelect={onSelect}
                                status= {status}
                                selectedOption={selectedOption}
                                disabled={pending}
                                type={challenge.type}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <Footer 
                disabled={pending || !selectedOption}
                status={status}
                onCheck={onContinue}
            />

        </>
    )
}