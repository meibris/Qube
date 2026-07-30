"use client"

import { useState } from "react"
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { GameShell } from "@/components/game-shell"
import { saveGameLesson } from "@/actions/game-lesson"
import { LessonComplete } from "@/app/lesson/lesson-complete"

// This is the STATIC review paired with the farm stream's gameplay lesson,
// same content for every player, regardless of which Phase 1 choice
// (Banker loan / Bink's Fast-Cash / bug squad) they took. See lib/farm-plot.ts.

const QUIZ: { q: string; options: string[]; correct: number; explain: string }[] = [
    {
        q: "You took a 100-coin loan from the Banker to clear your plot. What is that 100 coins called?",
        options: ["Interest", "Principal", "Net income", "A grant"],
        correct: 1,
        explain: "The principal is the original amount you borrow, before any extra cost is added on top.",
    },
    {
        q: "The Banker charges 12 coins every time you sell a batch of plants. What is that extra charge called?",
        options: ["Principal", "A tip", "Interest", "Sales tax"],
        correct: 2,
        explain: "Interest is the cost of borrowing money, extra you pay back on top of the principal, for the privilege of getting cash now instead of later.",
    },
    {
        q: "Bink's \"Fast-Cash\" machine gave you only 5 coins, but permanently locked you into paying him 10% of every future harvest. What makes this a bad deal?",
        options: [
            "It's actually a great deal, free money!",
            "The tiny payout doesn't come close to covering what you'll pay back over time",
            "5 coins is more than the loan's 100 coins",
            "It has no real cost, just fine print",
        ],
        correct: 1,
        explain: "This is what predatory lending looks like: a small amount of cash right now in exchange for a permanent, much larger cost later. The 'fast and easy' part is the trap.",
    },
    {
        q: "Which Phase 1 route let you clear your plot without borrowing anything at all?",
        options: ["The Banker loan", "Bink's Fast-Cash machine", "Hiring the bug squad", "None of them"],
        correct: 2,
        explain: "The bug squad route found money instead of borrowing it: no principal, no interest. (Though a share still had to go to the Governor, since it was found on shared land.)",
    },
    {
        q: "Which best describes interest in real life, like on a credit card or student loan?",
        options: [
            "A one-time fee charged only if you pay late",
            "The cost of borrowing money, charged as a percentage over time",
            "Money the bank gives you for free",
            "The same thing as principal",
        ],
        correct: 1,
        explain: "Interest is usually a percentage rate applied over time. The longer you take to pay back the principal, the more interest adds up, which is why borrowing isn't free, even when it feels like it.",
    },
]

export default function PrincipalVsInterestPage() {
    const [section, setSection] = useState<"learn" | "traps" | "quiz">("learn")
    const [expanded, setExpanded] = useState<number | null>(null)
    const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null))
    const [saving, setSaving] = useState(false)
    const [showComplete, setShowComplete] = useState(false)
    const [xpGained, setXpGained] = useState(0)

    const allAnswered = answers.every(a => a !== null)
    const allCorrect  = answers.every((a, i) => a === QUIZ[i].correct)
    const score       = answers.filter((a, i) => a === QUIZ[i].correct).length

    async function handleComplete() {
        setSaving(true)
        const { xpGain } = await saveGameLesson("principalInterestCompleted")
        setXpGained(xpGain)
        setShowComplete(true)
    }

    if (showComplete) return <LessonComplete xp={xpGained} />

    return (
        <GameShell
            lessonLabel="Principal vs. Interest"
            progress={
                section === "learn" ? 20
                : section === "traps" ? 55
                : allAnswered ? 95 : 75
            }
            instructions={
                <>
                    <p>You just made a choice about how to fund your farm plot. Let&apos;s break down what that choice actually cost, in real financial terms.</p>
                    <p className="mt-1 text-xs text-gray-500">Read through each section, then take the short quiz at the end.</p>
                </>
            }
        >
            <div className="max-w-2xl mx-auto flex flex-col gap-6">

                {/* ── SECTION TABS ──────────────────────────────────────────── */}
                <div className="flex gap-2 flex-wrap">
                    {(["learn", "traps", "quiz"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSection(s)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                                section === s
                                    ? "bg-green-500 border-green-600 text-white"
                                    : "bg-white border-gray-200 text-gray-500 hover:border-green-300"
                            }`}
                        >
                            {s === "learn" ? "🏦 Principal vs Interest" : s === "traps" ? "⚠️ Spotting Bad Deals" : "📝 Quiz"}
                        </button>
                    ))}
                </div>

                {/* ── PRINCIPAL vs INTEREST ────────────────────────────────── */}
                {section === "learn" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">Principal vs. Interest</h2>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Principal</p>
                                <p className="text-2xl font-extrabold text-amber-700 flex items-center gap-1.5"><img src="/coin.svg" alt="" className="w-6 h-6" /> 100 coins</p>
                                <p className="text-sm text-amber-700 mt-2">The original amount you borrowed, before any extra cost.</p>
                            </div>
                            <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-red-600 mb-1">Interest</p>
                                <p className="text-2xl font-extrabold text-red-700 flex items-center gap-1.5"><img src="/coin.svg" alt="" className="w-6 h-6" /> +12 / batch</p>
                                <p className="text-sm text-red-700 mt-2">The extra cost of borrowing, what you pay <strong>on top of</strong> the principal.</p>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5">
                            <p className="font-bold text-gray-700 mb-3">Why borrowing isn&apos;t free:</p>
                            <p className="text-sm text-gray-600">When the Banker lent you 100 coins, you agreed to pay 12 coins back every time you sold a batch of plants. That fee is the price of getting the money <em>now</em> instead of saving it up yourself over time.</p>
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <p className="font-bold text-blue-800 mb-2">Real-world example:</p>
                            <p className="text-sm text-blue-700">A $1,000 loan (the principal) at 10% annual interest costs you $100 extra over a year if you don&apos;t pay it back early, so you actually repay $1,100 total, not $1,000.</p>
                        </div>

                        <button onClick={() => setSection("traps")} className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-all active:scale-95">
                            Next: Spotting Bad Deals →
                        </button>
                    </div>
                )}

                {/* ── TRAPS ─────────────────────────────────────────────────── */}
                {section === "traps" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">Not All "Free Money" Is Free</h2>
                        <p className="text-gray-600">Bink&apos;s Fast-Cash machine handed you 5 coins in two seconds. It felt free. It wasn&apos;t.</p>

                        {[
                            {
                                q: "What made Bink's offer a trap?",
                                a: "A tiny payout (5 coins) in exchange for a permanent cost (10% of every future harvest, forever). The amount you get up front is nowhere close to what you end up paying back over time; that gap is exactly how predatory loans work in real life.",
                            },
                            {
                                q: "How is this different from the Banker's loan?",
                                a: "The Banker's terms were clear and limited: 100 coins now, 12 coins back per batch sold. Bink's terms were hidden in fine print and never end. Real predatory loans often use the same tricks: confusing terms, rates that seem small but compound forever, and pressure to sign fast.",
                            },
                            {
                                q: "What's the lesson from the bug squad route?",
                                a: "Not needing to borrow at all is usually the cheapest option, but it's not always available or reliable (you can't count on finding a jar of coins). When it's not available, comparing the principal AND the total interest cost before agreeing to any loan is what actually protects you.",
                            },
                            {
                                q: "How do you spot a bad deal in real life?",
                                a: "Ask: What's the principal? What's the interest rate, and is it fixed or does it change? Is there a time limit, or does it apply forever? Could I pay this off, or does it just keep growing? If a deal seems too easy to get, that's usually where to look closest.",
                            },
                        ].map((item, i) => (
                            <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setExpanded(expanded === i ? null : i)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                                >
                                    <span className="font-semibold text-gray-800">{item.q}</span>
                                    {expanded === i ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                                </button>
                                {expanded === i && (
                                    <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}

                        <button onClick={() => setSection("quiz")} className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-all active:scale-95">
                            Take the Quiz →
                        </button>
                    </div>
                )}

                {/* ── QUIZ ──────────────────────────────────────────────────── */}
                {section === "quiz" && (
                    <div className="flex flex-col gap-6">
                        <h2 className="text-xl font-bold text-gray-800">Quick Check: {score}/{QUIZ.length} correct</h2>

                        {QUIZ.map((q, qi) => (
                            <div key={qi} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
                                <p className="font-semibold text-gray-800">{qi + 1}. {q.q}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, oi) => {
                                        const chosen  = answers[qi] === oi
                                        const correct  = oi === q.correct
                                        const revealed = answers[qi] !== null
                                        let cls = "rounded-xl border-2 px-4 py-2.5 text-sm text-left font-medium transition-all active:scale-95 "
                                        if (!revealed) cls += "border-gray-200 bg-gray-50 hover:border-green-300 hover:bg-green-50"
                                        else if (correct) cls += "border-green-400 bg-green-50 text-green-800"
                                        else if (chosen)  cls += "border-red-300 bg-red-50 text-red-700"
                                        else              cls += "border-gray-200 bg-gray-50 text-gray-400"
                                        return (
                                            <button key={oi} disabled={revealed} onClick={() => {
                                                const next=[...answers]; next[qi]=oi; setAnswers(next)
                                            }} className={cls}>
                                                {correct && revealed && <CheckCircle className="inline w-3.5 h-3.5 mr-1 text-green-500" />}
                                                {opt}
                                            </button>
                                        )
                                    })}
                                </div>
                                {answers[qi] !== null && (
                                    <p className={`text-xs px-3 py-2 rounded-lg ${answers[qi]===q.correct?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>
                                        {answers[qi]===q.correct?"✅ Correct! ":"❌ Not quite. "}{q.explain}
                                    </p>
                                )}
                            </div>
                        ))}

                        {allAnswered && (
                            <div className={`rounded-2xl p-5 border-2 flex flex-col gap-3 ${allCorrect?"bg-green-50 border-green-200":"bg-blue-50 border-blue-200"}`}>
                                <p className={`font-bold text-lg ${allCorrect?"text-green-800":"text-blue-800"}`}>
                                    {allCorrect ? "🎉 Perfect score!" : `${score}/${QUIZ.length}: Good effort!`}
                                </p>
                                <p className={`text-sm ${allCorrect?"text-green-700":"text-blue-700"}`}>
                                    {allCorrect
                                        ? "You nailed principal, interest, and how to spot a bad deal. On to the next lesson!"
                                        : "Review the sections above if anything was tricky, then complete the lesson!"}
                                </p>
                                <button
                                    onClick={handleComplete}
                                    disabled={saving}
                                    className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-60 text-white font-bold text-base shadow-md transition-all"
                                >
                                    {saving ? "Saving…" : "Complete Lesson →"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GameShell>
    )
}
