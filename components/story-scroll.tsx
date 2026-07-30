"use client"

import { useEffect, useState, type CSSProperties } from "react"

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

/** All pastel. Swap/extend freely as new CYOA branches get their own palette. */
export type ScrollTheme = "neutral" | "green" | "blue" | "purple"

const SCROLL_THEME_VARS: Record<ScrollTheme, Record<string, string>> = {
  // Default tan parchment. Matches the baseline scroll (Lesson 3/5 entry).
  neutral: {
    "--scroll-parchment": "#ecd9ab",
    "--scroll-parchment-line": "rgba(107,64,32,0.05)",
    "--scroll-border": "#2e1c0e",
    "--scroll-dowel": "#8a5a30",
    "--scroll-dowel-knob": "#5c371b",
    "--scroll-button-bg": "#c9a876",
    "--scroll-button-bg-hover": "#d8bd8f",
    "--scroll-button-bg-pressed": "#b6905e",
    "--scroll-icon-bg": "#bfa06e",
    "--scroll-text": "#2e1c0e",
  },
  // Farming route. Pastel sage green with a mossy brown-green outline.
  green: {
    "--scroll-parchment": "#dfe9cf",
    "--scroll-parchment-line": "rgba(58,74,46,0.06)",
    "--scroll-border": "#3a4a2e",
    "--scroll-dowel": "#8fa06c",
    "--scroll-dowel-knob": "#5c6b45",
    "--scroll-button-bg": "#bcd0a1",
    "--scroll-button-bg-hover": "#cadfb0",
    "--scroll-button-bg-pressed": "#a6bd8c",
    "--scroll-icon-bg": "#aec495",
    "--scroll-text": "#33421f",
  },
  // Fishing route. Pastel sky blue.
  blue: {
    "--scroll-parchment": "#d6e6ea",
    "--scroll-parchment-line": "rgba(35,63,72,0.06)",
    "--scroll-border": "#2c4750",
    "--scroll-dowel": "#7ea3ac",
    "--scroll-dowel-knob": "#4f707a",
    "--scroll-button-bg": "#aecdd4",
    "--scroll-button-bg-hover": "#bedbe1",
    "--scroll-button-bg-pressed": "#93b8c0",
    "--scroll-icon-bg": "#9fc0c8",
    "--scroll-text": "#233f48",
  },
  // Rumors route. Pastel lavender, for the mystery/information theme.
  purple: {
    "--scroll-parchment": "#e3d9ea",
    "--scroll-parchment-line": "rgba(63,45,74,0.06)",
    "--scroll-border": "#3f2d4a",
    "--scroll-dowel": "#9c85ab",
    "--scroll-dowel-knob": "#6b5479",
    "--scroll-button-bg": "#c9b7d4",
    "--scroll-button-bg-hover": "#d7c8e0",
    "--scroll-button-bg-pressed": "#b39fbf",
    "--scroll-icon-bg": "#bba7c7",
    "--scroll-text": "#332340",
  },
}

// Placeholder. Swap in a real SFX (e.g. useAudio({ src: "/click.wav" })) once an asset exists.
function playClickSound() {}

const UNROLL_MS = 550
const ROLLUP_MS = 380

export function StoryScroll({
  data,
  onChoose,
  theme = "neutral",
}: {
  data: StoryScrollData
  onChoose: (id: string) => void
  theme?: ScrollTheme
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
        style={SCROLL_THEME_VARS[theme] as CSSProperties}
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
