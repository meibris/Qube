"use client"

import { useEffect, useState } from "react"

export interface StoryScrollChoice {
  id: string
  icon: string
  text: string
}

export interface StoryScrollData {
  title: string
  body: string
  choices: StoryScrollChoice[]
}

// Placeholder — swap in a real SFX (e.g. useAudio({ src: "/click.wav" })) once an asset exists.
function playClickSound() {}

const UNROLL_MS = 550
const ROLLUP_MS = 380

export function StoryScroll({
  data,
  onChoose,
}: {
  data: StoryScrollData
  onChoose: (id: string) => void
}) {
  const [phase, setPhase] = useState<"unrolling" | "open" | "closing">("unrolling")
  const [pressedId, setPressedId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setPhase("open"), UNROLL_MS)
    return () => clearTimeout(t)
  }, [])

  function handleChoose(id: string) {
    if (phase !== "open") return
    playClickSound()
    setPressedId(id)
    setPhase("closing")
    setTimeout(() => onChoose(id), ROLLUP_MS)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-md transition-opacity duration-300"
        style={{ opacity: phase === "closing" ? 0 : 1 }}
      />
      <div
        className={`relative w-[92vw] max-w-lg ${
          phase === "unrolling" ? "scroll-unroll" : phase === "closing" ? "scroll-rollup" : ""
        }`}
      >
        <div className="scroll-dowel" />
        <div className="scroll-parchment">
          <div
            className="transition-opacity duration-500"
            style={{ opacity: phase === "unrolling" ? 0 : 1 }}
          >
            <h2 className="scroll-title">{data.title}</h2>
            <p className="scroll-body">{data.body}</p>
            <div className="flex flex-col gap-3 mt-5">
              {data.choices.map((choice, i) => (
                <div key={choice.id} className="scroll-choice-row">
                  <span className="scroll-choice-num">({i + 1})</span>
                  <button
                    type="button"
                    onClick={() => handleChoose(choice.id)}
                    className={`scroll-choice-btn ${pressedId === choice.id ? "scroll-choice-pressed" : ""}`}
                  >
                    <span className="scroll-choice-icon">{choice.icon}</span>
                    <span className="scroll-choice-text">{choice.text}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="scroll-dowel" />
      </div>
    </div>
  )
}
