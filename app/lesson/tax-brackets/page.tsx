"use client"

import { useState } from "react"
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { GameShell } from "@/components/game-shell"
import { saveGameLesson } from "@/actions/game-lesson"
import { LessonComplete } from "@/app/lesson/lesson-complete"

// ── Activity: bracket table ───────────────────────────────────────────────────
interface BracketRow {
    label:   string
    amount:  number
    rate:    number
    answer:  number   // correct tax owed
}

const BRACKET_ROWS: BracketRow[] = [
    { label: "Bracket 1",  amount: 50, rate: 20, answer: 10 },
    { label: "Bracket 2",  amount: 10, rate: 30, answer: 3  },
]
const TOTAL_ANSWER = BRACKET_ROWS.reduce((s, r) => s + r.answer, 0) // 13

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ: { q: string; options: string[]; correct: number; explain: string }[] = [
    {
        q: "What is a tax bracket?",
        options: [
            "A penalty for earning too much money",
            "A range of income taxed at a specific rate",
            "A type of sales tax",
            "A government savings account",
        ],
        correct: 1,
        explain: "A tax bracket is simply an income range. Earn within that range and the matching rate applies to those coins only.",
    },
    {
        q: "You earned 60 coins. Bracket 1 covers 0–50 coins at 20%. Bracket 2 covers 51–60 coins at 30%. How much tax do you owe on the FIRST 50 coins?",
        options: ["6 coins", "10 coins", "18 coins", "15 coins"],
        correct: 1,
        explain: "50 × 20% = 10 coins. Only the first 50 coins are taxed at 20%.",
    },
    {
        q: "Same scenario. How much tax do you owe on the extra 10 coins (coins 51–60)?",
        options: ["2 coins", "5 coins", "3 coins", "6 coins"],
        correct: 2,
        explain: "10 × 30% = 3 coins. The 30% rate only applies to those 10 extra coins, not your whole income.",
    },
    {
        q: "Using the bucket analogy, what happens when your income 'fills' a bucket?",
        options: [
            "You stop earning coins",
            "The overflow spills into the next bucket with a higher tax rate",
            "You get a tax refund",
            "Your whole income is taxed at the new rate",
        ],
        correct: 1,
        explain: "Each bucket represents a bracket. Once full, overflow spills into the next bucket — only the overflow is taxed at the higher rate.",
    },
    {
        q: "Earning more money in a higher bracket means your ENTIRE income is taxed at the higher rate. True or False?",
        options: ["True", "False — only the coins in each bracket pay that bracket's rate", "True, but only above $100,000", "Depends on the year"],
        correct: 1,
        explain: "False! This is the biggest misconception about brackets. Each bracket's rate only applies to the income within that range. Lower brackets always stay at their lower rate.",
    },
]

type Section = "buckets" | "example" | "activity" | "quiz"

// ── Bucket visual component ───────────────────────────────────────────────────
function BucketDisplay({ fillPct, color, label, rate }: { fillPct: number; color: string; label: string; rate: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-bold text-gray-600">{label}</p>
            <p className={`text-xs font-bold ${color} mb-1`}>{rate} tax</p>
            {/* Bucket shape */}
            <div className="relative w-16 h-20">
                {/* Bucket body */}
                <div className="absolute inset-0 rounded-b-xl border-2 border-gray-400 bg-gray-100 overflow-hidden">
                    {/* Fill */}
                    <div
                        className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ${
                            color === "text-blue-600" ? "bg-blue-400" :
                            color === "text-orange-500" ? "bg-orange-400" : "bg-red-400"
                        }`}
                        style={{ height: `${Math.min(100, fillPct)}%` }}
                    />
                    {/* Overflow indicator */}
                    {fillPct > 100 && (
                        <div className="absolute -top-1 left-0 right-0 h-2 bg-yellow-400 animate-pulse" />
                    )}
                </div>
                {/* Handle */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 border-t-2 border-x-2 border-gray-400 rounded-t-full" />
            </div>
            <p className="text-xs text-gray-500">{Math.min(fillPct, 100).toFixed(0)}% full</p>
        </div>
    )
}

export default function TaxBracketsPage() {
    const [section, setSection] = useState<Section>("buckets")
    const [expanded, setExpanded] = useState<number | null>(null)
    const [incomeDemo, setIncomeDemo] = useState(30)

    // Activity state
    const [inputs, setInputs] = useState<string[]>(BRACKET_ROWS.map(() => ""))
    const [totalInput, setTotalInput] = useState("")
    const [activityChecked, setActivityChecked] = useState(false)
    const activityResults = activityChecked
        ? BRACKET_ROWS.map((r, i) => Number(inputs[i]) === r.answer)
        : null
    const totalResult = activityChecked ? Number(totalInput) === TOTAL_ANSWER : null
    const activityPassed = activityResults?.every(Boolean) && totalResult === true

    // Quiz state
    const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null))
    const [saving, setSaving] = useState(false)
    const [showComplete, setShowComplete] = useState(false)
    const [xpGained, setXpGained] = useState(0)

    const allAnswered = answers.every(a => a !== null)
    const score = answers.filter((a, i) => a === QUIZ[i].correct).length
    const allCorrect = score === QUIZ.length

    async function handleComplete() {
        setSaving(true)
        const { xpGain } = await saveGameLesson("taxBracketsCompleted")
        setXpGained(xpGain)
        setShowComplete(true)
    }

    if (showComplete) return <LessonComplete xp={xpGained} />

    // Bucket fill percentages for the demo slider
    const b1Fill = Math.min(100, (incomeDemo / 50) * 100)
    const b2Fill = Math.max(0, Math.min(100, ((incomeDemo - 50) / 10) * 100))

    const tabs: { key: Section; label: string }[] = [
        { key: "buckets",  label: "🪣 Bucket Analogy" },
        { key: "example",  label: "📊 Island Example"  },
        { key: "activity", label: "✏️ Activity"        },
        { key: "quiz",     label: "📝 Quiz"            },
    ]

    return (
        <GameShell
            lessonLabel="Tax Brackets Explained"
            progress={
                section === "buckets" ? 10
                : section === "example" ? 35
                : section === "activity" ? 60
                : allAnswered ? 95 : 75
            }
            instructions={
                <>
                    <p>You just saw tax brackets in action on the island. Now let&apos;s understand the concept with a visual analogy.</p>
                    <p className="mt-1 text-xs text-gray-500">Work through each section and complete the activity + quiz.</p>
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

                {/* ── BUCKET ANALOGY ────────────────────────────────────── */}
                {section === "buckets" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">Tax Brackets = Buckets</h2>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Imagine your income as water being poured into a row of buckets.
                            Each bucket represents a tax bracket — a range of income taxed at a specific rate.
                            You fill the buckets left to right, and <strong>only the water in each bucket</strong> is taxed at that bucket&apos;s rate.
                        </p>

                        {/* Interactive slider */}
                        <div className="rounded-2xl bg-gray-50 border-2 border-gray-200 p-5">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 text-center">
                                Drag to fill the buckets with income
                            </p>

                            {/* Buckets */}
                            <div className="flex justify-center gap-8 mb-5">
                                <BucketDisplay fillPct={b1Fill} color="text-blue-600" label="Bracket 1" rate="20%" />
                                <BucketDisplay fillPct={b2Fill} color="text-orange-500" label="Bracket 2" rate="30%" />
                            </div>

                            {/* Slider */}
                            <input
                                type="range"
                                min={0}
                                max={60}
                                value={incomeDemo}
                                onChange={e => setIncomeDemo(Number(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                                <span>0 coins</span>
                                <span className="text-blue-500">↑ 50 (B1 full)</span>
                                <span>60 coins</span>
                            </div>

                            {/* Live tax display */}
                            <div className="mt-4 rounded-xl bg-white border border-gray-200 p-3 text-sm font-mono">
                                <div className="flex justify-between"><span className="text-gray-500">Income</span><span className="font-bold">{incomeDemo} 🪙</span></div>
                                <div className="flex justify-between text-blue-600"><span>Bracket 1 tax (×20%)</span><span>−{Math.round(Math.min(incomeDemo, 50) * 0.20)} 🪙</span></div>
                                {incomeDemo > 50 && (
                                    <div className="flex justify-between text-orange-500"><span>Bracket 2 tax (×30%)</span><span>−{Math.round((incomeDemo - 50) * 0.30)} 🪙</span></div>
                                )}
                                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1 font-bold text-green-700">
                                    <span>You keep</span>
                                    <span>{incomeDemo - Math.round(Math.min(incomeDemo, 50) * 0.20) - (incomeDemo > 50 ? Math.round((incomeDemo - 50) * 0.30) : 0)} 🪙</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {[
                                { icon: "🪣", title: "Bucket 1 fills first", desc: "Your first 50 coins always go into Bucket 1 and are taxed at 20%. This never changes, even if you earn 1000 coins." },
                                { icon: "💧", title: "Overflow spills into Bucket 2", desc: "Any coins above 50 spill into Bucket 2 and are taxed at 30% — but only those extra coins." },
                                { icon: "🔑", title: "Key insight", desc: "Moving into a higher bracket never hurts you. You always take home more money by earning more, because the higher rate only applies to the new coins." },
                            ].map((item, i) => (
                                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 flex gap-3 items-start shadow-sm">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setSection("example")} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all active:scale-95">
                            Next: Island Example →
                        </button>
                    </div>
                )}

                {/* ── ISLAND EXAMPLE ────────────────────────────────────── */}
                {section === "example" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">The Island Example</h2>
                        <p className="text-gray-600 text-sm">Let&apos;s replay what happened in the game with the full numbers.</p>

                        {/* Step-by-step */}
                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    step: "1",
                                    color: "blue",
                                    title: "You earned 50 coins (delivery 1)",
                                    content: (
                                        <div className="font-mono text-xs flex flex-col gap-1">
                                            <div className="flex justify-between"><span>50 coins × 20%</span><span className="text-red-500">= −10 coins tax</span></div>
                                            <div className="flex justify-between font-bold"><span>You kept</span><span className="text-green-600">40 coins</span></div>
                                        </div>
                                    ),
                                },
                                {
                                    step: "2",
                                    color: "orange",
                                    title: "You earned 10 more coins (overtime)",
                                    content: (
                                        <div className="font-mono text-xs flex flex-col gap-1">
                                            <div className="flex justify-between"><span>10 coins × 30%</span><span className="text-red-500">= −3 coins tax</span></div>
                                            <div className="flex justify-between font-bold"><span>You kept (extra)</span><span className="text-green-600">7 coins</span></div>
                                        </div>
                                    ),
                                },
                                {
                                    step: "✓",
                                    color: "green",
                                    title: "Final totals",
                                    content: (
                                        <div className="font-mono text-xs flex flex-col gap-1">
                                            <div className="flex justify-between"><span>Gross income</span><span className="font-bold">60 coins</span></div>
                                            <div className="flex justify-between text-red-500"><span>Total tax paid</span><span>−13 coins</span></div>
                                            <div className="flex justify-between font-bold text-green-700 border-t border-gray-200 pt-1 mt-0.5"><span>Net income (kept)</span><span>47 coins</span></div>
                                            <div className="flex justify-between text-purple-600 mt-0.5"><span>Effective rate</span><span>21.7%</span></div>
                                        </div>
                                    ),
                                },
                            ].map((item) => (
                                <div key={item.step} className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
                                    item.color === "blue" ? "border-blue-200" :
                                    item.color === "orange" ? "border-orange-200" : "border-green-200"
                                }`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                                            item.color === "blue" ? "bg-blue-500" :
                                            item.color === "orange" ? "bg-orange-500" : "bg-green-500"
                                        }`}>
                                            {item.step}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800 text-sm mb-2">{item.title}</p>
                                            {item.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* FAQ accordion */}
                        <div className="flex flex-col gap-3">
                            {[
                                {
                                    q: "Why is the effective rate 21.7%, not 30%?",
                                    a: "Because 30% only applied to 10 of your 60 coins. The effective rate is the average across all brackets. Most of your coins (50 out of 60) were taxed at just 20%. Only the top 10 hit 30%. Blend those together: (10 + 3) ÷ 60 = 21.7%.",
                                },
                                {
                                    q: "How is this different from a flat tax?",
                                    a: "A flat tax applies one rate to everything. If this were a flat 30% on 60 coins, you'd owe 18 coins instead of 13. The bracket system is more generous to lower income — your first coins are always taxed at the lowest rate.",
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
                                        <div className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3 leading-relaxed">{item.a}</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button onClick={() => setSection("activity")} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all active:scale-95">
                            Next: Fill the Bracket Table →
                        </button>
                    </div>
                )}

                {/* ── ACTIVITY ──────────────────────────────────────────── */}
                {section === "activity" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800">Fill the Bracket Table</h2>
                        <p className="text-gray-600 text-sm">
                            Using the island&apos;s tax system, calculate the tax owed for each bracket.
                            Fill in the &quot;Tax Owed&quot; column, then compute the total.
                        </p>

                        {/* Table */}
                        <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-800 text-white">
                                        <th className="px-4 py-3 text-left font-semibold">Bracket</th>
                                        <th className="px-4 py-3 text-right font-semibold">Coins Earned</th>
                                        <th className="px-4 py-3 text-right font-semibold">Tax Rate</th>
                                        <th className="px-4 py-3 text-right font-semibold">Tax Owed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {BRACKET_ROWS.map((row, i) => {
                                        const checked = activityResults !== null
                                        const correct = checked ? activityResults[i] : null
                                        return (
                                            <tr key={i} className={checked ? (correct ? "bg-green-50" : "bg-red-50") : "bg-white"}>
                                                <td className="px-4 py-3 font-semibold text-gray-700">{row.label}</td>
                                                <td className="px-4 py-3 text-right font-mono">{row.amount} 🪙</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold">
                                                    <span className={row.rate === 20 ? "text-blue-600" : "text-orange-500"}>{row.rate}%</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={inputs[i]}
                                                            disabled={activityChecked && correct === true}
                                                            onChange={e => {
                                                                if (activityChecked) return
                                                                const next = [...inputs]; next[i] = e.target.value; setInputs(next)
                                                            }}
                                                            placeholder="?"
                                                            className={`w-16 border-2 rounded-lg px-2 py-1 text-right font-mono text-sm outline-none ${
                                                                !checked ? "border-gray-200 focus:border-blue-400"
                                                                : correct ? "border-green-400 bg-green-50 text-green-800"
                                                                : "border-red-400 bg-red-50 text-red-700"
                                                            }`}
                                                        />
                                                        <span className="text-gray-500 text-xs">🪙</span>
                                                        {checked && correct && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                                                        {checked && !correct && (
                                                            <span className="text-xs text-red-500 font-bold">→ {row.answer}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}

                                    {/* Total row */}
                                    <tr className={`border-t-2 border-gray-400 font-bold ${
                                        totalResult === null ? "bg-gray-50"
                                        : totalResult ? "bg-green-100"
                                        : "bg-red-100"
                                    }`}>
                                        <td className="px-4 py-3 text-gray-800" colSpan={3}>Total Tax Owed</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={totalInput}
                                                    disabled={activityChecked && totalResult === true}
                                                    onChange={e => {
                                                        if (activityChecked) return
                                                        setTotalInput(e.target.value)
                                                    }}
                                                    placeholder="?"
                                                    className={`w-16 border-2 rounded-lg px-2 py-1 text-right font-mono text-sm outline-none ${
                                                        totalResult === null ? "border-gray-200 focus:border-blue-400"
                                                        : totalResult ? "border-green-400 bg-green-50 text-green-800"
                                                        : "border-red-400 bg-red-50 text-red-700"
                                                    }`}
                                                />
                                                <span className="text-gray-500 text-xs">🪙</span>
                                                {totalResult && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                                                {totalResult === false && (
                                                    <span className="text-xs text-red-500 font-bold">→ {TOTAL_ANSWER}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="text-xs text-gray-400 text-center">Hint: Bracket 1 = 50 × 20%, Bracket 2 = 10 × 30%, Total = sum of both</p>

                        {!activityChecked ? (
                            <button
                                onClick={() => setActivityChecked(true)}
                                disabled={inputs.some(v => v === "") || totalInput === ""}
                                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95"
                            >
                                Check Answers
                            </button>
                        ) : (
                            <div className={`rounded-2xl p-4 border-2 flex flex-col gap-2 ${activityPassed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                                <p className={`font-bold text-sm ${activityPassed ? "text-green-800" : "text-amber-800"}`}>
                                    {activityPassed ? "✅ All correct! Great work." : "Some answers need fixing — the correct values are shown in red."}
                                </p>
                                {!activityPassed && (
                                    <button
                                        onClick={() => {
                                            setInputs(BRACKET_ROWS.map(() => ""))
                                            setTotalInput("")
                                            setActivityChecked(false)
                                        }}
                                        className="text-xs text-blue-600 underline text-left"
                                    >
                                        Try again
                                    </button>
                                )}
                            </div>
                        )}

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
                                        ? "You nailed tax brackets. Time for the next lesson!"
                                        : "Review the sections above, then complete the lesson!"}
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
