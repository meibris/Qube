"use client"

import { useState } from "react"
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { GameShell } from "@/components/game-shell"
import { saveGameLesson } from "@/actions/game-lesson"
import { LessonComplete } from "@/app/lesson/lesson-complete"

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ: { q: string; options: string[]; correct: number; explain: string }[] = [
    {
        q: "At the market, the bread was listed at 10 coins but you paid 11. What caused the extra coin?",
        options: ["The shopkeeper overcharged you", "Sales tax added by the government", "A delivery fee", "Inflation"],
        correct: 1,
        explain: "Sales tax is a government charge added on top of the listed price at the point of sale. The shopkeeper keeps 10 coins; the government gets 1.",
    },
    {
        q: "Who receives the money collected from sales tax?",
        options: ["The store owner", "The buyer gets it back later", "The government", "The bank"],
        correct: 2,
        explain: "Sales tax is collected by the seller at checkout, but it goes directly to the government — not to the store.",
    },
    {
        q: "If a jacket costs $50 and the sales tax rate is 8%, what is the total price you pay?",
        options: ["$50.00", "$54.00", "$58.00", "$42.00"],
        correct: 1,
        explain: "8% of $50 = $4. Total = $50 + $4 = $54. Sales tax is added on top of the listed price.",
    },
    {
        q: "Using the pie analogy: if your gross income is the whole pie, what is sales tax?",
        options: [
            "A slice you choose to give away",
            "An extra crumb the government takes when you spend",
            "The whole pie minus your savings",
            "The crust of the pie",
        ],
        correct: 1,
        explain: "Gross income is the whole pie (everything you earn). Sales tax isn't taken from the pie itself — it's an extra crumb the government charges every time you buy something with your pie.",
    },
    {
        q: "Which of these is the best description of a sales tax rate?",
        options: [
            "A fixed dollar amount added to every purchase",
            "A percentage of the purchase price collected by the government",
            "A fee you pay once a year",
            "A penalty for spending too much",
        ],
        correct: 1,
        explain: "Sales tax is always expressed as a percentage (e.g., 8%). Multiply the purchase price by that percentage to find the tax amount.",
    },
]

type Section = "what" | "pie" | "examples" | "quiz"

export default function SalesTaxPage() {
    const [section, setSection] = useState<Section>("what")
    const [expanded, setExpanded] = useState<number | null>(null)
    const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null))
    const [saving, setSaving] = useState(false)
    const [showComplete, setShowComplete] = useState(false)
    const [xpGained, setXpGained] = useState(0)

    const allAnswered = answers.every(a => a !== null)
    const score = answers.filter((a, i) => a === QUIZ[i].correct).length
    const allCorrect = score === QUIZ.length

    async function handleComplete() {
        setSaving(true)
        const { xpGain } = await saveGameLesson("salesTaxCompleted")
        setXpGained(xpGain)
        setShowComplete(true)
    }

    if (showComplete) return <LessonComplete xp={xpGained} />

    const tabs: { key: Section; label: string }[] = [
        { key: "what",     label: "💸 What Is Sales Tax?" },
        { key: "pie",      label: "🥧 The Pie Analogy"    },
        { key: "examples", label: "🧮 Real Examples"      },
        { key: "quiz",     label: "📝 Quiz"               },
    ]

    return (
        <GameShell
            lessonLabel="Sales Tax Explained"
            progress={
                section === "what" ? 10
                : section === "pie" ? 35
                : section === "examples" ? 65
                : allAnswered ? 95 : 75
            }
            instructions={
                <>
                    <p>You just experienced sales tax at the market. Now let&apos;s understand what it actually is.</p>
                    <p className="mt-1 text-xs text-gray-500">Read each section, then take the short quiz.</p>
                </>
            }
        >
            <div className="max-w-2xl mx-auto flex flex-col gap-6">

                {/* ── TABS ──────────────────────────────────────────────── */}
                <div className="flex gap-2 flex-wrap">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setSection(t.key)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                                section === t.key
                                    ? "bg-blue-500 border-blue-600 text-white"
                                    : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── WHAT IS SALES TAX ──────────────────────────────────── */}
                {section === "what" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">What Is Sales Tax?</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Sales tax is a small percentage that the government charges every time you
                            <strong> buy</strong> something. It gets added on top of the listed price at checkout —
                            which is exactly what surprised you at the market.
                        </p>

                        <div className="flex flex-col gap-3">
                            {[
                                { icon: "🏷️", title: "Listed Price", desc: "The price the store advertises — what the sign says. This is what the store keeps." },
                                { icon: "🏛️", title: "Sales Tax", desc: "A percentage on top of the listed price, collected by the seller and sent straight to the government. You never see it until checkout." },
                                { icon: "💳", title: "Total Price", desc: "Listed price + sales tax = what you actually pay. Always more than the sign says." },
                            ].map((item, i) => (
                                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 flex gap-3 items-start shadow-sm">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.title}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
                            <p className="font-bold text-amber-800 mb-2">From the Market:</p>
                            <div className="flex flex-col gap-1 text-sm font-mono">
                                <div className="flex justify-between"><span className="text-gray-600">Bread (listed)</span><span>10 🪙</span></div>
                                <div className="flex justify-between text-red-500"><span>Sales tax (10%)</span><span>+1 🪙</span></div>
                                <div className="flex justify-between border-t border-amber-200 pt-1 mt-1 font-bold"><span className="text-gray-800">You paid</span><span>11 🪙</span></div>
                            </div>
                        </div>

                        <button onClick={() => setSection("pie")} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all active:scale-95">
                            Next: The Pie Analogy →
                        </button>
                    </div>
                )}

                {/* ── PIE ANALOGY ────────────────────────────────────────── */}
                {section === "pie" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">The Pie Analogy</h2>

                        {/* Visual pie */}
                        <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-6 text-center">
                            <p className="text-5xl mb-3">🥧</p>
                            <p className="font-bold text-orange-800 text-lg mb-1">Your Gross Income = the whole pie</p>
                            <p className="text-orange-700 text-sm">Everything you earned — before any deductions, taxes, or spending.</p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 text-center">
                                <p className="text-3xl mb-2">🍰</p>
                                <p className="font-bold text-blue-800 text-sm">Income Tax = a slice</p>
                                <p className="text-blue-600 text-xs mt-1">Taken <em>before</em> you even see your paycheck. It comes out of the pie.</p>
                            </div>
                            <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-4 text-center">
                                <p className="text-3xl mb-2">🫙</p>
                                <p className="font-bold text-red-800 text-sm">Sales Tax = an extra crumb</p>
                                <p className="text-red-600 text-xs mt-1">Charged <em>when you spend</em>. It&apos;s not from the pie — it&apos;s extra, tacked on at checkout.</p>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5">
                            <p className="font-bold text-gray-700 mb-2">Key difference:</p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                <strong>Income tax</strong> is deducted from what you <em>earn</em> — it shrinks your pie.
                                <br />
                                <strong>Sales tax</strong> is added to what you <em>buy</em> — it&apos;s an extra crumb on top, paid
                                every time you spend a slice of your pie.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
                            <p className="font-semibold text-purple-800 text-sm mb-1">In other words:</p>
                            <p className="text-sm text-purple-700 italic">
                                &quot;If gross income is the whole pie, sales tax is the extra crumb you have to pay whenever you eat a piece.&quot;
                            </p>
                        </div>

                        <button onClick={() => setSection("examples")} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all active:scale-95">
                            Next: Real Examples →
                        </button>
                    </div>
                )}

                {/* ── REAL EXAMPLES ─────────────────────────────────────── */}
                {section === "examples" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">Sales Tax in the Real World</h2>
                        <p className="text-gray-600 text-sm">Sales tax exists almost everywhere you shop — but the rate varies by state and country.</p>

                        {[
                            {
                                q: "How much is sales tax in the US?",
                                a: "It varies by state! Oregon has 0% (no sales tax). California is 7.25% (one of the highest). Most states fall between 4–9%. Some cities add their own tax on top of the state rate. Washington state, for example, can be over 10% in Seattle.",
                            },
                            {
                                q: "What things are taxed?",
                                a: "Most physical goods you buy — clothes, electronics, furniture, toys. However, many states exempt groceries (food you cook at home) and prescription medicine. Prepared food (like restaurant meals) is almost always taxed.",
                            },
                            {
                                q: "Where does sales tax money go?",
                                a: "State and local governments use sales tax to fund roads, schools, public safety, parks, and other community services. Unlike income tax (which goes to the federal government), most sales tax stays in your state or city.",
                            },
                            {
                                q: "How does the store collect it?",
                                a: "The store adds it at checkout automatically. At the end of the month (or quarter), the store sends all the collected sales tax directly to the state government. You never touch that money — you pay it and it goes straight through the store to the government.",
                            },
                        ].map((item, i) => (
                            <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setExpanded(expanded === i ? null : i)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                                >
                                    <span className="font-semibold text-gray-800 text-sm">{item.q}</span>
                                    {expanded === i ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                                </button>
                                {expanded === i && (
                                    <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3 leading-relaxed">
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

                {/* ── QUIZ ──────────────────────────────────────────────── */}
                {section === "quiz" && (
                    <div className="flex flex-col gap-6">
                        <h2 className="text-xl font-bold text-gray-800">Quick Check — {score}/{QUIZ.length} correct</h2>

                        {QUIZ.map((q, qi) => (
                            <div key={qi} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
                                <p className="font-semibold text-gray-800 text-sm">{qi + 1}. {q.q}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, oi) => {
                                        const chosen   = answers[qi] === oi
                                        const correct  = oi === q.correct
                                        const revealed = answers[qi] !== null
                                        let cls = "rounded-xl border-2 px-4 py-2.5 text-sm text-left font-medium transition-all active:scale-95 "
                                        if (!revealed) cls += "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
                                        else if (correct) cls += "border-green-400 bg-green-50 text-green-800"
                                        else if (chosen)  cls += "border-red-300 bg-red-50 text-red-700"
                                        else              cls += "border-gray-200 bg-gray-50 text-gray-400"
                                        return (
                                            <button
                                                key={oi}
                                                disabled={revealed}
                                                onClick={() => {
                                                    const next = [...answers]; next[qi] = oi; setAnswers(next)
                                                }}
                                                className={cls}
                                            >
                                                {correct && revealed && <CheckCircle className="inline w-3.5 h-3.5 mr-1 text-green-500" />}
                                                {opt}
                                            </button>
                                        )
                                    })}
                                </div>
                                {answers[qi] !== null && (
                                    <p className={`text-xs px-3 py-2 rounded-lg ${answers[qi] === q.correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                        {answers[qi] === q.correct ? "✅ Correct! " : "❌ Not quite. "}{q.explain}
                                    </p>
                                )}
                            </div>
                        ))}

                        {allAnswered && (
                            <div className={`rounded-2xl p-5 border-2 flex flex-col gap-3 ${allCorrect ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                                <p className={`font-bold text-lg ${allCorrect ? "text-green-800" : "text-blue-800"}`}>
                                    {allCorrect ? "🎉 Perfect score!" : `${score}/${QUIZ.length} — Good effort!`}
                                </p>
                                <p className={`text-sm ${allCorrect ? "text-green-700" : "text-blue-700"}`}>
                                    {allCorrect
                                        ? "You've got sales tax down. Time for the next lesson!"
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
