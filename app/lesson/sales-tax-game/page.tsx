"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GameShell } from "@/components/game-shell"
import { saveGameLesson } from "@/actions/game-lesson"

type Phase = "enter" | "shop" | "receipt" | "complete"

export default function SalesTaxGamePage() {
    const [phase, setPhase] = useState<Phase>("enter")
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    async function finish() {
        setSaving(true)
        await saveGameLesson("salesTaxGameCompleted")
        router.push("/learn")
    }

    const progress =
        phase === "enter" ? 15
        : phase === "shop" ? 40
        : phase === "receipt" ? 72
        : 95

    return (
        <GameShell
            lessonLabel="The Shopkeeper's Surprise"
            progress={progress}
            instructions={
                <>
                    <p>Head to the Market and buy some bread.</p>
                    <p className="mt-1 text-xs text-gray-500">Pay close attention to the receipt — something unexpected happens at checkout!</p>
                </>
            }
        >
            <div className="max-w-lg mx-auto flex flex-col gap-6">

                {/* ── PHASE: ENTER ─────────────────────────────────────── */}
                {phase === "enter" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="text-7xl">🏪</div>
                        <div className="rounded-2xl bg-green-50 border-2 border-green-200 p-6 text-center w-full">
                            <h2 className="text-2xl font-bold text-green-800 mb-3">Welcome to the Market!</h2>
                            <p className="text-green-700 text-sm leading-relaxed">
                                You&apos;ve been working hard all day collecting berries and earning coins.
                                Now it&apos;s time to restock — you need a loaf of bread to get through the week.
                            </p>
                            <p className="text-green-600 text-xs mt-3">The market is just ahead. Let&apos;s check the price on that bread...</p>
                        </div>
                        <button
                            onClick={() => setPhase("shop")}
                            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-all active:scale-95 shadow-md"
                        >
                            Enter the Market →
                        </button>
                    </div>
                )}

                {/* ── PHASE: SHOP ──────────────────────────────────────── */}
                {phase === "shop" && (
                    <div className="flex flex-col items-center gap-6">
                        {/* Market stall */}
                        <div className="w-full rounded-2xl bg-amber-50 border-2 border-amber-300 p-5 shadow-sm">
                            <div className="text-center mb-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">🏪 Island Market</p>
                                <p className="text-gray-400 text-xs mt-0.5">&quot;Fresh baked daily!&quot;</p>
                            </div>

                            {/* Item card */}
                            <div className="flex items-center justify-between bg-white rounded-xl border-2 border-amber-200 p-4 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <span className="text-5xl">🍞</span>
                                    <div>
                                        <p className="font-bold text-gray-800 text-base">Freshly Baked Bread</p>
                                        <p className="text-gray-400 text-xs">1 loaf — feeds you for a week</p>
                                        <p className="text-green-600 text-xs font-medium mt-0.5">✓ In stock</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-extrabold text-amber-600">10 🪙</p>
                                    <p className="text-xs text-gray-400">listed price</p>
                                </div>
                            </div>

                            <p className="text-center text-xs text-gray-400 mt-3">
                                The sign clearly says <strong className="text-gray-600">10 coins</strong>. Sounds fair!
                            </p>
                        </div>

                        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 w-full">
                            <p className="text-xs text-blue-700 text-center">💰 You have <strong>20 coins</strong> in your pocket. More than enough!</p>
                        </div>

                        <button
                            onClick={() => setPhase("receipt")}
                            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base transition-all active:scale-95 shadow-md"
                        >
                            [E] Buy Bread — 10 coins
                        </button>
                    </div>
                )}

                {/* ── PHASE: RECEIPT ───────────────────────────────────── */}
                {phase === "receipt" && (
                    <div className="flex flex-col items-center gap-6">
                        {/* Receipt */}
                        <div className="w-full max-w-sm mx-auto">
                            <div className="bg-white border-2 border-gray-200 rounded-t-xl px-6 pt-5 pb-3 shadow-lg font-mono">
                                <p className="text-center font-extrabold text-gray-800 text-lg tracking-[0.2em]">RECEIPT</p>
                                <p className="text-center text-gray-400 text-xs mb-4">Island Market</p>

                                <div className="border-t border-dashed border-gray-300 pt-3 flex flex-col gap-2 text-sm">
                                    <div className="flex justify-between text-gray-700">
                                        <span>Bread × 1</span>
                                        <span>10 🪙</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-red-500">
                                        <span>Sales Tax (10%)</span>
                                        <span>+1 🪙</span>
                                    </div>
                                </div>

                                <div className="border-t-2 border-gray-700 mt-3 pt-3 flex justify-between font-extrabold text-gray-900 text-base">
                                    <span>TOTAL CHARGED</span>
                                    <span>11 🪙</span>
                                </div>

                                <p className="text-center text-gray-400 text-xs mt-3">Thank you for shopping!</p>
                            </div>
                            {/* Jagged bottom */}
                            <div
                                className="h-4 bg-white border-x-2 border-b-0 border-gray-200"
                                style={{ clipPath: "polygon(0 0,4% 100%,8% 0,12% 100%,16% 0,20% 100%,24% 0,28% 100%,32% 0,36% 100%,40% 0,44% 100%,48% 0,52% 100%,56% 0,60% 100%,64% 0,68% 100%,72% 0,76% 100%,80% 0,84% 100%,88% 0,92% 100%,96% 0,100% 100%,100% 0)" }}
                            />
                        </div>

                        {/* Shock reaction */}
                        <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-5 text-center w-full">
                            <p className="text-4xl mb-2">😱</p>
                            <p className="font-bold text-red-800 text-lg">Wait — I thought it was 10 coins!</p>
                            <p className="text-red-600 text-sm mt-1">
                                The sign said <strong>10</strong>... but you were charged <strong>11</strong>.
                                Where did that extra coin go?
                            </p>
                        </div>

                        <button
                            onClick={() => setPhase("complete")}
                            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base transition-all active:scale-95 shadow-md"
                        >
                            Find out why →
                        </button>
                    </div>
                )}

                {/* ── PHASE: COMPLETE ──────────────────────────────────── */}
                {phase === "complete" && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-6 text-center w-full">
                            <p className="text-5xl mb-3">💡</p>
                            <h2 className="text-xl font-bold text-blue-800 mb-2">That extra coin is called Sales Tax!</h2>
                            <p className="text-blue-700 text-sm leading-relaxed">
                                Every time you <strong>buy</strong> something, the government silently adds a small
                                percentage on top of the listed price. That extra amount is called <strong>sales tax</strong> —
                                and it gets sent straight to the government, not the shopkeeper.
                            </p>
                            <p className="text-blue-500 text-xs mt-3">
                                The shopkeeper listed 10 coins. The Island government adds 10% = 1 coin.
                                You pay 11 coins total, but the shopkeeper only keeps 10.
                            </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 w-full">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">What you just experienced</p>
                            <div className="flex flex-col gap-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600">Listed price (what the sign says)</span><span className="font-bold">10 🪙</span></div>
                                <div className="flex justify-between text-red-500"><span>Sales tax collected by government</span><span className="font-bold">+1 🪙</span></div>
                                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1"><span className="font-bold text-gray-800">What you actually paid</span><span className="font-extrabold text-gray-900">11 🪙</span></div>
                            </div>
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
