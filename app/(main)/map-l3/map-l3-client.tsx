"use client"

import { useState } from "react"
import Link from "next/link"
import { GameMap } from "../map/game-map"
import { StoryScroll, type StoryScrollData } from "@/components/story-scroll"

// Each choice.id will eventually route to a different story branch for the
// rest of the Income unit. None of these three have distinct gameplay built
// yet — they all fall back to the same map until their branches are built.
const LESSON3_SCROLL: StoryScrollData = {
  title: "The Island's Bounty",
  body: "Bloo, the bright blue qube, has taught you the basics of berry-picking. To decide how you'll spend your day on the island, do you...",
  choices: [
    { id: "farm", icon: "🪓", text: "Ask about starting a sustainable farm." },
    { id: "fish", icon: "🎣", text: "Explore the coast for fish." },
    { id: "rumors", icon: "📜", text: "Listen to local rumors first." },
  ],
}

export function MapL3Client({
  initialCoins,
  playerColor,
}: {
  initialCoins: number
  playerColor: string
}) {
  const [storyChoice, setStoryChoice] = useState<string | null>(null)

  return (
    <div className="relative w-full h-full">
      <GameMap
        variant="lesson3"
        initialCoins={initialCoins}
        playerColor={playerColor}
        paused={!storyChoice}
      />
      {!storyChoice && (
        <StoryScroll
          data={LESSON3_SCROLL}
          onChoose={(id) => {
            try {
              localStorage.setItem("lesson3StoryChoice", id)
            } catch {}
            setStoryChoice(id)
          }}
        />
      )}
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
