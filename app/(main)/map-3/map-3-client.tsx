"use client"

import Link from "next/link"
import { GameMap } from "../map/game-map"

export function Map3Client({
  initialCoins,
  playerColor,
  freeplay = false,
}: {
  initialCoins: number
  playerColor: string
  freeplay?: boolean
}) {
  return (
    <div className="relative w-full h-full">
      <GameMap variant="lessonFarm" initialCoins={initialCoins} playerColor={playerColor} freeplay={freeplay} />
      <Link
        href="/learn"
        className="absolute bottom-4 left-4 px-4 py-2 rounded-xl bg-white text-slate-500 text-sm font-bold uppercase tracking-wide border-2 border-b-4 border-slate-200 hover:bg-slate-100 active:border-b-2 transition-colors shadow-lg"
      >
        ← Back to Learn
      </Link>
    </div>
  )
}
