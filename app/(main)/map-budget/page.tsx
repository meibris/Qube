import Link from "next/link"
import { GameMap } from "../map/game-map"
import { getInitialCoins, getPlayerColor } from "@/actions/game-lesson"

export default async function MapBudgetPage() {
  const [initialCoins, playerColor] = await Promise.all([getInitialCoins(), getPlayerColor()])
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative w-full h-full">
        <GameMap variant="lessonBudget" initialCoins={initialCoins} playerColor={playerColor} />
        <Link
          href="/learn"
          className="absolute bottom-4 left-4 px-4 py-2 rounded-xl bg-white text-slate-500 text-sm font-bold uppercase tracking-wide border-2 border-b-4 border-slate-200 hover:bg-slate-100 active:border-b-2 transition-colors shadow-lg"
        >
          ← Back to Learn
        </Link>
      </div>
    </div>
  )
}
