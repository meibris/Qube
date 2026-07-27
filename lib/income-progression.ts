/**
 * Unit 1 (Income) CYOA progression engine.
 *
 * Structure: Lessons 1 & 2 are static and identical for every player.
 * Lessons 3-8 are three odd/even pairs (3&4, 5&6, 7&8) — odd = gameplay,
 * even = the financial-literacy review of what just happened. Each pair is
 * one of exactly 3 "streams" (farm / fish / rumors):
 *
 *   Lesson 3: pick from all 3 streams           → Lesson 4 reviews that pick
 *   Lesson 5: pick from the 2 remaining streams  → Lesson 6 reviews that pick
 *   Lesson 7: the 1 stream nobody picked yet, auto-assigned, no picker shown
 *                                                 → Lesson 8 reviews it
 *
 * Because there are exactly as many streams as pairs, every stream gets
 * played exactly once and the unit completes cleanly after Lesson 8 — no
 * "leftover options" branch, no graduation crossroad, straight into Unit 2.
 *
 * Persistence: store one `IncomeUnitProgress` blob as JSON in a new nullable
 * column, e.g. `userProgress.incomeProgress: text("income_progress")` — same
 * pattern as the existing `jobData` column, just scoped to this unit.
 */

// ─── Income streams (the 3 scroll options) ───────────────────────────────────

export type StreamId = "farm" | "fish" | "rumors"

export const ALL_STREAM_IDS: readonly StreamId[] = ["farm", "fish", "rumors"]

export interface StreamDefinition {
  id: StreamId
  icon: string
  /** Button text shown on the parchment scroll. */
  choiceText: string
  /** Short internal label, e.g. for teacher-facing dashboards. */
  label: string
  /** The financial-literacy concept this stream's gameplay+review pair teaches. */
  concept: string
  /** Route for the odd (gameplay) half of the pair. */
  gameplayRoute: string
  /** Route for the even (review) half of the pair. */
  analysisRoute: string
}

export const STREAM_REGISTRY: Record<StreamId, StreamDefinition> = {
  farm: {
    id: "farm",
    icon: "🪓",
    choiceText: "Ask about starting a sustainable farm.",
    label: "Sustainable Farming",
    concept: "Principal vs. Interest & Startup Capital",
    gameplayRoute: "/map-3/farm",
    analysisRoute: "/lesson/principal-vs-interest",
  },
  fish: {
    id: "fish",
    icon: "🎣",
    choiceText: "Explore the coast for fish.",
    label: "Coastal Fishing",
    concept: "Variable Income & Supply Costs",
    gameplayRoute: "/map-3/fish",
    analysisRoute: "/lesson/variable-income",
  },
  rumors: {
    id: "rumors",
    icon: "📜",
    choiceText: "Listen to local rumors first.",
    label: "Local Rumors",
    concept: "Risk vs. Return & Information Asymmetry",
    gameplayRoute: "/map-3/rumors",
    analysisRoute: "/lesson/risk-vs-return",
  },
}

// ─── State schema ──────────────────────────────────────────────────────────

/** The 3 fixed gameplay/review lesson-order pairs, in play order. */
export const PAIR_LESSON_ORDERS: readonly [number, number][] = [
  [3, 4],
  [5, 6],
  [7, 8],
]

export interface IncomePairProgress {
  /** [gameplayOrder, analysisOrder] — e.g. [3, 4]. Fixed, not player-chosen. */
  lessonPair: readonly [number, number]
  streamId: StreamId | null
  gameplayCompleted: boolean
  analysisCompleted: boolean
}

export interface IncomeUnitProgress {
  lesson1Completed: boolean
  lesson2Completed: boolean
  /** Always exactly 3 entries, one per PAIR_LESSON_ORDERS slot. */
  pairs: [IncomePairProgress, IncomePairProgress, IncomePairProgress]
}

export function createInitialIncomeProgress(): IncomeUnitProgress {
  const pairs = PAIR_LESSON_ORDERS.map(
    (lessonPair): IncomePairProgress => ({
      lessonPair,
      streamId: null,
      gameplayCompleted: false,
      analysisCompleted: false,
    }),
  ) as [IncomePairProgress, IncomePairProgress, IncomePairProgress]

  return { lesson1Completed: false, lesson2Completed: false, pairs }
}

// ─── Derived selectors ─────────────────────────────────────────────────────

export function usedStreamIds(progress: IncomeUnitProgress): StreamId[] {
  return progress.pairs
    .map((p) => p.streamId)
    .filter((id): id is StreamId => id !== null)
}

/** The pool the parchment scroll should offer — previously chosen streams are hidden. */
export function availableStreamChoices(progress: IncomeUnitProgress): StreamDefinition[] {
  const used = new Set(usedStreamIds(progress))
  return ALL_STREAM_IDS.filter((id) => !used.has(id)).map((id) => STREAM_REGISTRY[id])
}

export function isUnit2Unlocked(progress: IncomeUnitProgress): boolean {
  return progress.pairs.every((p) => p.analysisCompleted)
}

// ─── Automatic transitions ──────────────────────────────────────────────────

/**
 * Applies pending *automatic* transitions — currently just one: once only a
 * single stream remains unused, the final pair (Lesson 7&8) auto-assigns it
 * instead of showing a picker with a single option. Call this once whenever
 * progress is loaded, persist the result if it changed, then pass the
 * *returned* value into getNextIncomeScreen/resolveIncomeRoute.
 */
export function advanceIncomeProgress(progress: IncomeUnitProgress): IncomeUnitProgress {
  const lastIndex = progress.pairs.length - 1
  const lastPair = progress.pairs[lastIndex]
  if (lastPair.streamId) return progress

  const remaining = availableStreamChoices(progress)
  if (remaining.length !== 1) return progress // not yet down to the final choice

  return incomeProgressReducer(progress, {
    type: "CHOOSE_STREAM",
    pairIndex: lastIndex as 0 | 1 | 2,
    streamId: remaining[0].id,
  })
}

// ─── The router: "what should this player see next?" ─────────────────────

export type IncomeScreen =
  | { type: "lesson1" }
  | { type: "lesson2" }
  | { type: "streamChoice"; lessonOrder: number; options: StreamDefinition[] }
  | { type: "gameplay"; lessonOrder: number; stream: StreamDefinition }
  | { type: "analysis"; lessonOrder: number; stream: StreamDefinition }
  | { type: "unit2Entry" }

/**
 * Pure function: player progress in, next screen out. Assumes
 * `advanceIncomeProgress` has already been applied (and persisted) — this
 * function itself never mutates or auto-assigns anything.
 */
export function getNextIncomeScreen(progress: IncomeUnitProgress): IncomeScreen {
  if (!progress.lesson1Completed) return { type: "lesson1" }
  if (!progress.lesson2Completed) return { type: "lesson2" }

  for (const pair of progress.pairs) {
    const [gameplayOrder, analysisOrder] = pair.lessonPair

    if (!pair.streamId) {
      return { type: "streamChoice", lessonOrder: gameplayOrder, options: availableStreamChoices(progress) }
    }

    const stream = STREAM_REGISTRY[pair.streamId]
    if (!pair.gameplayCompleted) return { type: "gameplay", lessonOrder: gameplayOrder, stream }
    if (!pair.analysisCompleted) return { type: "analysis", lessonOrder: analysisOrder, stream }
    // else this pair is fully done — keep walking to the next one.
  }

  return { type: "unit2Entry" }
}

/**
 * Convenience adapter matching the `getNextLesson(currentLessonId)` shape.
 * Note: in a branching unit, `currentLessonId` alone can't determine "next"
 * — you need the player's full (already-advanced) progress object.
 */
export function resolveIncomeRoute(progress: IncomeUnitProgress): string {
  const screen = getNextIncomeScreen(progress)
  switch (screen.type) {
    case "lesson1": return "/map"
    case "lesson2": return "/lesson/gross-net-income"
    case "streamChoice": return `/income/choose?lesson=${screen.lessonOrder}`
    case "gameplay": return screen.stream.gameplayRoute
    case "analysis": return screen.stream.analysisRoute
    case "unit2Entry": return "/map-budget"
  }
}

// ─── State transitions ─────────────────────────────────────────────────────

export type IncomeAction =
  | { type: "COMPLETE_LESSON_1" }
  | { type: "COMPLETE_LESSON_2" }
  | { type: "CHOOSE_STREAM"; pairIndex: 0 | 1 | 2; streamId: StreamId }
  | { type: "COMPLETE_GAMEPLAY"; pairIndex: 0 | 1 | 2 }
  | { type: "COMPLETE_ANALYSIS"; pairIndex: 0 | 1 | 2 }

/**
 * Pure reducer. Callers (server actions) load progress, apply an action,
 * persist the result. Throws on illegal transitions (e.g. re-picking a used
 * stream) so bugs surface immediately instead of silently corrupting state.
 */
export function incomeProgressReducer(
  state: IncomeUnitProgress,
  action: IncomeAction,
): IncomeUnitProgress {
  switch (action.type) {
    case "COMPLETE_LESSON_1":
      return { ...state, lesson1Completed: true }

    case "COMPLETE_LESSON_2":
      return { ...state, lesson2Completed: true }

    case "CHOOSE_STREAM": {
      if (usedStreamIds(state).includes(action.streamId)) {
        throw new Error(`Stream "${action.streamId}" was already chosen this unit.`)
      }
      const pairs = [...state.pairs] as IncomeUnitProgress["pairs"]
      pairs[action.pairIndex] = { ...pairs[action.pairIndex], streamId: action.streamId }
      return { ...state, pairs }
    }

    case "COMPLETE_GAMEPLAY": {
      const pairs = [...state.pairs] as IncomeUnitProgress["pairs"]
      pairs[action.pairIndex] = { ...pairs[action.pairIndex], gameplayCompleted: true }
      return { ...state, pairs }
    }

    case "COMPLETE_ANALYSIS": {
      const pairs = [...state.pairs] as IncomeUnitProgress["pairs"]
      pairs[action.pairIndex] = { ...pairs[action.pairIndex], analysisCompleted: true }
      return { ...state, pairs }
    }

    default:
      return state
  }
}
