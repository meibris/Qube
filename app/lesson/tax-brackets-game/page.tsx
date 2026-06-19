"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GameShell } from "@/components/game-shell"
import { saveGameLesson } from "@/actions/game-lesson"

// ── Bracket config ────────────────────────────────────────────────────────────
const BRACKET_1_LIMIT = 50   // first 50 coins → 20% tax
const BRACKET_1_RATE  = 0.20
const BRACKET_2_LIMIT = 10   // next 10 coins → 30% tax
const BRACKET_2_RATE  = 0.30

const TAX_1 = Math.round(BRACKET_1_LIMIT * BRACKET_1_RATE)   // 10
const TAX_2 = Math.round(BRACKET_2_LIMIT * BRACKET_2_RATE)   // 3
const TOTAL_GROSS = BRACKET_1_LIMIT + BRACKET_2_LIMIT         // 60
const TOTAL_TAX   = TAX_1 + TAX_2                             // 13
const NET         = TOTAL_GROSS - TOTAL_TAX                   // 47

type Phase = "intro" | "deliver1" | "bracket1" | "deliver2" | "bracket2" | "summary" | "complete"

export default function TaxBracketsGamePage() {
    const [phase, setPhase] = useState<Phase>("intro")
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    async function finish() {
        setSaving(true)
        await saveGameLesson("taxBracketsGameCompleted")
        router.push("/learn")
    }

    const progress: Record<Phase, number> = {
        intro: 8, deliver1: 22, bracket1: 40, deliver2: 55, bracket2: 72, summary: 88, complete: 96,
    }

    return (
        <GameShell
            lessonLabel="Tax Brackets: The Delivery"
            progress={progress[phase]}
            instructions={
                <>
                    <p>The Governor has changed his tax system. This time, the more you earn, the higher percentage he takes — but only on the <em>extra</em> coins.</p>
                    <p className="mt-1 text-xs text-gray-500">Watch how tax brackets work as you make two deliveries to the Governor.</p>
                </>
            }
        >
            <div className="max-w-lg mx-auto flex flex-col gap-6">

                {/* ── INTRO ────────────────────────────────────────────── */}
                {phase === "intro" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="text-6xl">👑</div>
                        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-6 text-center w-full">
                            <h2 className="text-xl font-bold text-amber-800 mb-3">The Governor Has a New Tax System</h2>
                            <p className="text-amber-700 text-sm leading-relaxed">
                                Last time, the Governor took a flat 10% of everything you earned.
                                But this season he&apos;s switched to a <strong>tax bracket system</strong> —
                                the more coins you earn, the higher the rate on the <em>extra</em> coins.
                            </p>
                        </div>

                        {/* Bracket preview */}
                        <div className="w-full rounded-2xl bg-white border-2 border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-gray-800 px-5 py-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-300">This Season&apos;s Tax Brackets</p>
                            </div>
                            <div className="divide-y divide-gray-100">
                                <div className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-blue-400" />
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">Bracket 1</p>
                                            <p className="text-xs text-gray-400">First 50 coins earned</p>
                                        </div>
                                    </div>
                                    <span className="font-extrabold text-blue-600 text-lg">20%</span>
                                </div>
                                <div className="flex items-center justify-between px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-orange-400" />
                                        <div>
                                            <p className="font-semibold text-gray-800 text-sm">Bracket 2</p>
                                            <p className="text-xs text-gray-400">Coins 51–60 (next 10)</p>
                                        </div>
                                    </div>
                                    <span className="font-extrabold text-orange-500 text-lg">30%</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 text-center">
                            The key rule: <strong>each bracket only applies to the coins in that range</strong>.
                            Your first 50 coins are always taxed at 20%, even if you earn more.
                        </p>

                        <button onClick={() => setPhase("deliver1")} className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base transition-all active:scale-95 shadow-md">
                            Make Your First Delivery →
                        </button>
                    </div>
                )}

                {/* ── DELIVER 1 ────────────────────────────────────────── */}
                {phase === "deliver1" && (
                    <div className="flex flex-col items-center gap-5">
                        <div className="text-6xl">🍇</div>
                        <div className="rounded-2xl bg-green-50 border-2 border-green-200 p-5 w-full text-center">
                            <h2 className="text-xl font-bold text-green-800 mb-2">First Delivery!</h2>
                            <p className="text-green-700 text-sm">
                                You spent the morning harvesting berries. You collect <strong>50 berries</strong> and sell them —
                                earning <strong>50 coins</strong> gross income.
                            </p>
                        </div>

                        {/* Progress visualization */}
                        <div className="w-full rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Your Delivery</p>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">🍇</span>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-400 rounded-full w-full transition-all" />
                                    </div>
                                </div>
                                <span className="font-bold text-green-700 text-sm w-16 text-right">50 berries</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🪙</span>
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-400 rounded-full w-full transition-all" />
                                    </div>
                                </div>
                                <span className="font-bold text-yellow-600 text-sm w-16 text-right">50 coins</span>
                            </div>
                        </div>

                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 w-full text-center">
                            <p className="text-sm text-amber-700">
                                50 coins puts you squarely in <strong>Bracket 1</strong> (first 50 coins → 20% tax).
                            </p>
                        </div>

                        <button onClick={() => setPhase("bracket1")} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base transition-all active:scale-95 shadow-md">
                            Deliver to the Governor →
                        </button>
                    </div>
                )}

                {/* ── BRACKET 1 TAX ────────────────────────────────────── */}
                {phase === "bracket1" && (
                    <div className="flex flex-col items-center gap-5">
                        <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-300 p-5 w-full">
                            <p className="text-xs font-bold uppercase tracking-widest text-yellow-600 mb-2">👑 The Governor Speaks</p>
                            <p className="italic text-gray-700 text-sm">
                                &quot;Hmm, 50 coins. All of that falls in Bracket 1. I&apos;ll take my 20%.&quot;
                            </p>
                        </div>

                        {/* Tax calculation breakdown */}
                        <div className="w-full rounded-2xl bg-white border-2 border-blue-200 overflow-hidden shadow-sm">
                            <div className="bg-blue-500 px-5 py-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Bracket 1 Tax Calculation</p>
                            </div>
                            <div className="p-5 flex flex-col gap-3 font-mono text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Coins in Bracket 1</span>
                                    <span className="font-bold">50 🪙</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">× Tax rate</span>
                                    <span className="font-bold text-blue-600">× 20%</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                                    <span className="text-red-600 font-bold">Tax taken</span>
                                    <span className="font-extrabold text-red-600 text-lg">−{TAX_1} 🪙</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                                    <span className="text-green-700 font-bold">You keep</span>
                                    <span className="font-extrabold text-green-700 text-lg">{BRACKET_1_LIMIT - TAX_1} 🪙</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full rounded-xl bg-green-50 border border-green-200 p-4">
                            <p className="text-sm text-green-700 text-center">
                                50 coins gross → Governor takes {TAX_1} coins (20%) → You keep <strong>{BRACKET_1_LIMIT - TAX_1} coins</strong> so far.
                            </p>
                        </div>

                        <button onClick={() => setPhase("deliver2")} className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-all active:scale-95 shadow-md">
                            Go Earn More Coins →
                        </button>
                    </div>
                )}

                {/* ── DELIVER 2 ────────────────────────────────────────── */}
                {phase === "deliver2" && (
                    <div className="flex flex-col items-center gap-5">
                        <div className="text-6xl">⏰</div>
                        <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-5 w-full text-center">
                            <h2 className="text-xl font-bold text-orange-800 mb-2">Overtime Delivery!</h2>
                            <p className="text-orange-700 text-sm">
                                You stayed late and harvested <strong>10 more berries</strong> — earning an extra <strong>10 coins</strong>.
                                Your total gross income is now <strong>60 coins</strong>.
                            </p>
                            <p className="text-orange-600 text-xs mt-2">But those extra 10 coins cross into a higher bracket…</p>
                        </div>

                        {/* Bar showing bracket fill */}
                        <div className="w-full rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Income Breakdown</p>
                            <div className="h-6 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-blue-400 flex items-center justify-center text-xs text-white font-bold"
                                    style={{ width: `${(BRACKET_1_LIMIT / TOTAL_GROSS) * 100}%` }}
                                >
                                    Bracket 1
                                </div>
                                <div
                                    className="bg-orange-400 flex items-center justify-center text-xs text-white font-bold"
                                    style={{ width: `${(BRACKET_2_LIMIT / TOTAL_GROSS) * 100}%` }}
                                >
                                    B2
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>0</span>
                                <span className="text-blue-500">50 coins (20%)</span>
                                <span className="text-orange-500">60 coins (30%)</span>
                            </div>
                        </div>

                        <button onClick={() => setPhase("bracket2")} className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base transition-all active:scale-95 shadow-md">
                            Deliver to the Governor Again →
                        </button>
                    </div>
                )}

                {/* ── BRACKET 2 TAX ────────────────────────────────────── */}
                {phase === "bracket2" && (
                    <div className="flex flex-col items-center gap-5">
                        <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-300 p-5 w-full">
                            <p className="text-xs font-bold uppercase tracking-widest text-yellow-600 mb-2">👑 The Governor Speaks</p>
                            <p className="italic text-gray-700 text-sm">
                                &quot;Those extra 10 coins? That&apos;s Bracket 2 territory. That&apos;ll be 30% of those — but only those.
                                Your first 50 coins stay at 20%, as promised.&quot;
                            </p>
                        </div>

                        {/* Tax calculation breakdown */}
                        <div className="w-full rounded-2xl bg-white border-2 border-orange-200 overflow-hidden shadow-sm">
                            <div className="bg-orange-500 px-5 py-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-orange-100">Bracket 2 Tax Calculation</p>
                            </div>
                            <div className="p-5 flex flex-col gap-3 font-mono text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Coins in Bracket 2</span>
                                    <span className="font-bold">10 🪙</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">× Tax rate</span>
                                    <span className="font-bold text-orange-600">× 30%</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                                    <span className="text-red-600 font-bold">Tax taken</span>
                                    <span className="font-extrabold text-red-600 text-lg">−{TAX_2} 🪙</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                                    <span className="text-green-700 font-bold">You keep (extra)</span>
                                    <span className="font-extrabold text-green-700 text-lg">{BRACKET_2_LIMIT - TAX_2} 🪙</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 w-full">
                            <p className="text-xs text-blue-700 text-center">
                                Notice: the extra 10 coins are taxed at 30%, <strong>not</strong> your entire income.
                                Bracket 1 stays at 20%.
                            </p>
                        </div>

                        <button onClick={() => setPhase("summary")} className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-base transition-all active:scale-95 shadow-md">
                            See the Full Summary →
                        </button>
                    </div>
                )}

                {/* ── SUMMARY ──────────────────────────────────────────── */}
                {phase === "summary" && (
                    <div className="flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-gray-800 text-center">Your Tax Summary</h2>

                        {/* Full breakdown */}
                        <div className="w-full rounded-2xl bg-white border-2 border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-gray-800 px-5 py-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Complete Breakdown</p>
                            </div>
                            <div className="p-5 flex flex-col gap-2 text-sm font-mono">
                                <div className="flex justify-between text-gray-600">
                                    <span>Gross income (total earned)</span>
                                    <span className="font-bold text-gray-800">{TOTAL_GROSS} 🪙</span>
                                </div>
                                <div className="border-t border-dashed border-gray-200 pt-2 mt-1 flex flex-col gap-1">
                                    <div className="flex justify-between text-blue-600">
                                        <span>Bracket 1 tax (50 × 20%)</span>
                                        <span>−{TAX_1} 🪙</span>
                                    </div>
                                    <div className="flex justify-between text-orange-500">
                                        <span>Bracket 2 tax (10 × 30%)</span>
                                        <span>−{TAX_2} 🪙</span>
                                    </div>
                                    <div className="flex justify-between text-red-600 font-bold border-t border-gray-200 pt-1 mt-1">
                                        <span>Total tax paid</span>
                                        <span>−{TOTAL_TAX} 🪙</span>
                                    </div>
                                </div>
                                <div className="border-t-2 border-gray-800 pt-2 mt-1 flex justify-between font-extrabold text-green-700 text-base">
                                    <span>Net income (you keep)</span>
                                    <span>{NET} 🪙</span>
                                </div>
                            </div>
                        </div>

                        {/* Effective rate callout */}
                        <div className="rounded-2xl bg-purple-50 border-2 border-purple-200 p-4 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-1">Effective Tax Rate</p>
                            <p className="text-3xl font-extrabold text-purple-700">
                                {((TOTAL_TAX / TOTAL_GROSS) * 100).toFixed(1)}%
                            </p>
                            <p className="text-sm text-purple-600 mt-1">
                                That&apos;s your <em>actual</em> average rate — lower than 30%, because only the top coins hit the higher bracket.
                            </p>
                        </div>

                        <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                            <p className="font-semibold text-green-800 text-sm mb-1">The big idea:</p>
                            <p className="text-sm text-green-700">
                                In a bracket system, earning more never means you take home less.
                                The higher rate only applies to the <em>extra</em> coins above each threshold.
                            </p>
                        </div>

                        <button onClick={() => setPhase("complete")} className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-all active:scale-95 shadow-md">
                            Got it! →
                        </button>
                    </div>
                )}

                {/* ── COMPLETE ─────────────────────────────────────────── */}
                {phase === "complete" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="text-6xl">🪣</div>
                        <div className="rounded-2xl bg-green-50 border-2 border-green-200 p-6 text-center w-full">
                            <h2 className="text-xl font-bold text-green-800 mb-2">You understand tax brackets!</h2>
                            <p className="text-green-700 text-sm leading-relaxed">
                                You just watched a progressive tax system in action. Each bracket is like a bucket:
                                your coins fill the first bucket first, and only the overflow spills into the next,
                                higher-rate bucket.
                            </p>
                            <p className="text-green-600 text-xs mt-2">Next up: the full lesson with the bucket analogy and a real activity.</p>
                        </div>
                        <button
                            onClick={finish}
                            disabled={saving}
                            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold text-base transition-all active:scale-95 shadow-md"
                        >
                            {saving ? "Saving…" : "Continue to Lesson →"}
                        </button>
                    </div>
                )}

            </div>
        </GameShell>
    )
}
