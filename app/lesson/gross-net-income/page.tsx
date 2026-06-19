"use client"

import { useState } from "react"
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { GameShell } from "@/components/game-shell"
import { saveGameLesson } from "@/actions/game-lesson"
import { LessonComplete } from "@/app/lesson/lesson-complete"

// ── Quiz questions ─────────────────────────────────────────────────────────────
const QUIZ: { q: string; options: string[]; correct: number; explain: string }[] = [
    {
        q: "On the island you earned 20 coins selling berries. What is that 20 coins called?",
        options: ["Net income", "Gross income", "Tax refund", "Budget"],
        correct: 1,
        explain: "Gross income is everything you earn BEFORE any deductions or taxes are taken out.",
    },
    {
        q: "The Governor took 10% of your 20 coins as income tax. How many coins did he take?",
        options: ["1 coin", "5 coins", "2 coins", "10 coins"],
        correct: 2,
        explain: "10% of 20 = 2 coins. Income tax is a percentage of what you earn that goes to the government.",
    },
    {
        q: "After the Governor took his cut, how many coins did you keep? (your net income)",
        options: ["20 coins", "15 coins", "18 coins", "10 coins"],
        correct: 2,
        explain: "Net income = gross income − taxes. 20 − 2 = 18 coins. That's the money you actually take home.",
    },
    {
        q: "Which of these best describes NET income?",
        options: [
            "Everything you earn before taxes",
            "What you take home after taxes",
            "The amount the government keeps",
            "Your total savings",
        ],
        correct: 1,
        explain: "Net income (or 'take-home pay') is what's left after taxes and other deductions are removed from your gross income.",
    },
    {
        q: "The Market trader gave you a +2 coin tip for free. Is a tip part of your gross income?",
        options: ["No — tips don't count", "Yes — all money you receive is income", "Only if it's more than 5 coins", "Only from employers"],
        correct: 1,
        explain: "Yes! The IRS considers tips income. All money you earn or receive — wages, tips, freelance pay — counts toward gross income.",
    },
]

export default function GrossNetIncomePage() {
    const [section, setSection] = useState<"learn" | "tax" | "quiz">("learn")
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
        const { xpGain } = await saveGameLesson("grossNetCompleted")
        setXpGained(xpGain)
        setShowComplete(true)
    }

    if (showComplete) return <LessonComplete xp={xpGained} />

    return (
        <GameShell
            lessonLabel="Gross vs. Net Income"
            progress={
                section === "learn" ? 20
                : section === "tax"  ? 55
                : allAnswered ? 95 : 75
            }
            instructions={
                <>
                    <p>You just played the island game. Let&apos;s break down what actually happened — in real financial terms.</p>
                    <p className="mt-1 text-xs text-gray-500">Read through each section, then take the short quiz at the end.</p>
                </>
            }
        >
            <div className="max-w-2xl mx-auto flex flex-col gap-6">

                {/* ── SECTION TABS ──────────────────────────────────────────── */}
                <div className="flex gap-2 flex-wrap">
                    {(["learn", "tax", "quiz"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setSection(s)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                                section === s
                                    ? "bg-blue-500 border-blue-600 text-white"
                                    : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"
                            }`}
                        >
                            {s === "learn" ? "📖 Gross vs Net" : s === "tax" ? "🏛️ Income Tax" : "📝 Quiz"}
                        </button>
                    ))}
                </div>

                {/* ── GROSS vs NET ──────────────────────────────────────────── */}
                {section === "learn" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">Gross Income vs. Net Income</h2>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Gross Income</p>
                                <p className="text-2xl font-extrabold text-amber-700">🪙 20 coins</p>
                                <p className="text-sm text-amber-700 mt-2">All money earned <strong>before</strong> any deductions.</p>
                                <p className="text-xs text-amber-600 mt-1">Also called: pre-tax income, total earnings</p>
                            </div>
                            <div className="rounded-2xl bg-green-50 border-2 border-green-200 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">Net Income</p>
                                <p className="text-2xl font-extrabold text-green-700">🪙 18 coins</p>
                                <p className="text-sm text-green-700 mt-2">What you <strong>actually take home</strong> after deductions.</p>
                                <p className="text-xs text-green-600 mt-1">Also called: take-home pay, after-tax income</p>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5">
                            <p className="font-bold text-gray-700 mb-3">The Formula:</p>
                            <div className="flex items-center gap-2 flex-wrap text-lg font-mono font-bold">
                                <span className="bg-amber-100 px-3 py-1 rounded-lg text-amber-700">Gross Income</span>
                                <span className="text-gray-400">−</span>
                                <span className="bg-red-100 px-3 py-1 rounded-lg text-red-600">Deductions & Taxes</span>
                                <span className="text-gray-400">=</span>
                                <span className="bg-green-100 px-3 py-1 rounded-lg text-green-700">Net Income</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-3">On the island: 20 − 2 = <strong>18 coins</strong></p>
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <p className="font-bold text-blue-800 mb-2">Real-world example:</p>
                            <p className="text-sm text-blue-700">If you earn <strong>$800/week</strong> at a job (gross), but $120 is withheld for taxes and benefits, your net pay (the check you deposit) is <strong>$680</strong>.</p>
                        </div>

                        <button onClick={() => setSection("tax")} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all active:scale-95">
                            Next: Income Tax Explained →
                        </button>
                    </div>
                )}

                {/* ── INCOME TAX ────────────────────────────────────────────── */}
                {section === "tax" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">Income Tax — What Is It?</h2>
                        <p className="text-gray-600">On the island, the Governor took 10% automatically. In real life, that&apos;s income tax — and it works the same way.</p>

                        {[
                            {
                                q: "What is income tax?",
                                a: "Income tax is a percentage of your earnings that the government collects. In the US, it funds roads, schools, the military, Social Security, and more. Everyone who earns above a certain amount must pay it.",
                            },
                            {
                                q: "Who collects it?",
                                a: "Both the federal government (IRS) and most state governments collect income tax. Federal rates range from 10%–37% depending on how much you earn. State rates vary — some states have no income tax at all.",
                            },
                            {
                                q: "How does withholding work?",
                                a: "Your employer automatically deducts income tax from every paycheck before you even see it — just like the Governor walked up and took his cut. This is called withholding. At the end of the year, you file a tax return to settle up: if too much was withheld, you get a refund. If too little was withheld, you owe more.",
                            },
                            {
                                q: "Is it just income tax that comes out?",
                                a: "Nope! A real paycheck also has Social Security tax (6.2%), Medicare tax (1.45%), and potentially state income tax. Together these are sometimes called 'payroll taxes.' The island only simulated income tax, but real deductions add up to roughly 20–30% for most people.",
                            },
                            {
                                q: "What's a tax bracket?",
                                a: "The US uses a progressive tax system. You don't pay the same rate on every dollar — lower earnings are taxed at a lower rate, and higher earnings at a higher rate. For example, in 2024 the first ~$11,600 of income is taxed at 10%, the next chunk at 12%, and so on up to 37% for very high earners.",
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

                        <button onClick={() => setSection("quiz")} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all active:scale-95">
                            Take the Quiz →
                        </button>
                    </div>
                )}

                {/* ── QUIZ ──────────────────────────────────────────────────── */}
                {section === "quiz" && (
                    <div className="flex flex-col gap-6">
                        <h2 className="text-xl font-bold text-gray-800">Quick Check — {score}/{QUIZ.length} correct</h2>

                        {QUIZ.map((q, qi) => (
                            <div key={qi} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
                                <p className="font-semibold text-gray-800">{qi + 1}. {q.q}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, oi) => {
                                        const chosen  = answers[qi] === oi
                                        const correct  = oi === q.correct
                                        const revealed = answers[qi] !== null
                                        let cls = "rounded-xl border-2 px-4 py-2.5 text-sm text-left font-medium transition-all active:scale-95 "
                                        if (!revealed) cls += "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
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
                                    {allCorrect ? "🎉 Perfect score!" : `${score}/${QUIZ.length} — Good effort!`}
                                </p>
                                <p className={`text-sm ${allCorrect?"text-green-700":"text-blue-700"}`}>
                                    {allCorrect
                                        ? "You nailed gross income, net income, and income tax. On to the next lesson!"
                                        : "Review the sections above if anything was tricky — then complete the lesson!"}
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
