"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { GameMap } from "../map/game-map"
import { StoryScroll, type StoryScrollData } from "@/components/story-scroll"

// Routes for each stream — farm and fish have real destinations now
// (/map-3/farm, /map-3/fish); rumors isn't built yet, so it falls back to
// staying on this same paused-then-unpaused island map for now.
const STREAM_ROUTES: Record<string, string> = {
  farm: "/map-3/farm",
  fish: "/map-3/fish",
}

const ADVENTURE_SCROLL: StoryScrollData = {
  title: "The Island's Bounty",
  body: "Bloo, the bright blue qube, has taught you the basics of berry-picking. To decide how you'll spend your day on the island, do you...",
  choices: [
    { id: "farm", icon: "🪓", text: "Ask about starting a farm." },
    { id: "fish", icon: "🎣", text: "Explore the coast for fish." },
    { id: "rumors", icon: "📜", text: "Listen to local rumors first." },
  ],
}

export function Map3Client({
  initialCoins,
  playerColor,
}: {
  initialCoins: number
  playerColor: string
}) {
  const router = useRouter()
  const [storyChoice, setStoryChoice] = useState<string | null>(null)

  function handleChoose(id: string) {
    try {
      localStorage.setItem("incomeStreamChoice", id)
    } catch {}
    const route = STREAM_ROUTES[id]
    if (route) {
      router.push(route)
      return
    }
    // No dedicated route yet (e.g. rumors) — stay here and just unpause.
    setStoryChoice(id)
  }

  return (
    <div className="relative w-full h-full">
      <GameMap
        variant="lessonFarm"
        initialCoins={initialCoins}
        playerColor={playerColor}
        paused={!storyChoice}
      />
      {!storyChoice && <StoryScroll data={ADVENTURE_SCROLL} onChoose={handleChoose} />}
      {storyChoice && (
        <Link
          href="/learn"
          className="absolute bottom-4 left-4 px-4 py-2 rounded-xl bg-white text-slate-500 text-sm font-bold uppercase tracking-wide border-2 border-b-4 border-slate-200 hover:bg-slate-100 active:border-b-2 transition-colors shadow-lg"
        >
          ← Back to Learn
        </Link>
      )}
    </div>
  )
}
