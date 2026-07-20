/**
 * Unit 1 (Income) CYOA progression engine.
 *
 * Why this exists separately from db/queries.ts's GAME_LESSON_KEYS/INCOME_ROUTES tables:
 * those tables assume lesson `order` maps to exactly one fixed route for every player.
 * That breaks the moment lesson 3/4 (and later 5/6, 7/8, 9/10) can be any of 4 different
 * content modules depending on a runtime choice. This module is the single source of
 * truth for "given what this player has done, what should they see next" — everything
 * else (the [lessonId] router, the /learn tile list, the StoryScroll's option pool)
 * should call into it rather than re-deriving progression logic.
 *
 * Persistence: store one `IncomeUnitProgress` blob as JSON in a new nullable column,
 * e.g. `userProgress.incomeProgress: text("income_progress")` — same pattern as the
 * existing `jobData` column, just scoped to this unit instead of a flat flag bag.
 */

// ─── Income streams (the 4 scroll options) ───────────────────────────────────

export type StreamId = "harvest" | "farm" | "fish" | "rumors"

export const ALL_STREAM_IDS: readonly StreamId[] = ["harvest", "farm", "fish", "rumors"]

export interface StreamDefinition {
  id: StreamId
  icon: string
  /** Button text shown on the parchment scroll. */
  choiceText: string
  /** Short internal label, e.g. for teacher-facing dashboards. */
  label: string
  /** The financial-literacy concept this stream's gameplay+analysis pair teaches. */
  concept: string
  /** Route for the odd (gameplay) half of the pair. */
  gameplayRoute: string
  /** Route for the even (analysis/quiz) half of the pair. */
  analysisRoute: string
}

export const STREAM_REGISTRY: Record<StreamId, StreamDefinition> = {
  harvest: {
    id: "harvest",
    icon: "🍓",
    choiceText: "Harvest and barter for coins.",
    label: "Berry Harvesting",
    concept: "Income Tax Withholding",
    gameplayRoute: "/map-l3/harvest",
    analysisRoute: "/lesson/income-tax-withholding",
  },
  farm: {
    id: "farm",
    icon: "🪓",
    choiceText: "Ask about starting a sustainable farm.",
    label: "Sustainable Farming",
    concept: "Labor vs. Capital Investment",
    gameplayRoute: "/map-l3/farm",
    analysisRoute: "/lesson/labor-vs-capital",
  },
  fish: {
    id: "fish",
    icon: "🎣",
    choiceText: "Explore the coast for fish.",
    label: "Coastal Fishing",
    concept: "Variable Income & Supply Costs",
    gameplayRoute: "/map-l3/fish",
    analysisRoute: "/lesson/variable-income",
  },
  rumors: {
    id: "rumors",
    icon: "📜",
    choiceText: "Listen to local rumors first.",
    label: "Local Rumors",
    concept: "Risk vs. Return & Information Asymmetry",
    gameplayRoute: "/map-l3/rumors",
    analysisRoute: "/lesson/risk-vs-return",
  },
}

// ─── State schema ──────────────────────────────────────────────────────────

/** One gameplay+analysis pair the player has chosen (or is about to choose). */
export interface IncomePairProgress {
  /** 1st pair the player picks, 2nd pair, 3rd, 4th. Not a lesson "order" number. */
  slot: 1 | 2 | 3 | 4
  streamId: StreamId | null
  gameplayCompleted: boolean
  analysisCompleted: boolean
}

export type GraduationPath = "unit2" | "completing" | null

export interface IncomeUnitProgress {
  lesson1Completed: boolean
  lesson2Completed: boolean
  /** Grows one entry at a time as the player makes each scroll choice. Max length 4. */
  pairs: IncomePairProgress[]
  /** Has the Path A / Path B crossroad been shown at least once? */
  graduationOffered: boolean
  graduationPath: GraduationPath
  unit2Unlocked: boolean
}

export function createInitialIncomeProgress(): IncomeUnitProgress {
  return {
    lesson1Completed: false,
    lesson2Completed: false,
    pairs: [],
    graduationOffered: false,
    graduationPath: null,
    unit2Unlocked: false,
  }
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

export function completedPairCount(progress: IncomeUnitProgress): number {
  return progress.pairs.filter((p) => p.analysisCompleted).length
}

// ─── The router: "what should this player see next?" ─────────────────────

export type IncomeScreen =
  | { type: "lesson1" }
  | { type: "lesson2" }
  | { type: "streamChoice"; pairSlot: 1 | 2 | 3 | 4; options: StreamDefinition[] }
  | { type: "gameplay"; pairSlot: 1 | 2 | 3 | 4; stream: StreamDefinition }
  | { type: "analysis"; pairSlot: 1 | 2 | 3 | 4; stream: StreamDefinition }
  | { type: "graduationCrossroad" }
  | { type: "unit2Entry" }
  | { type: "unitComplete" }

/**
 * Pure function: player progress in, next screen out. No side effects, no I/O —
 * easy to unit test and safe to call from both server components and client state.
 */
export function getNextIncomeScreen(progress: IncomeUnitProgress): IncomeScreen {
  // Baseline: identical for everyone.
  if (!progress.lesson1Completed) return { type: "lesson1" }
  if (!progress.lesson2Completed) return { type: "lesson2" }

  // Walk recorded pairs in order; the first one that isn't fully done is "current".
  for (const pair of progress.pairs) {
    if (!pair.streamId) {
      return { type: "streamChoice", pairSlot: pair.slot, options: availableStreamChoices(progress) }
    }
    const stream = STREAM_REGISTRY[pair.streamId]
    if (!pair.gameplayCompleted) return { type: "gameplay", pairSlot: pair.slot, stream }
    if (!pair.analysisCompleted) return { type: "analysis", pairSlot: pair.slot, stream }
    // else: this pair is fully done, keep walking.
  }

  const completed = completedPairCount(progress)

  // No pair has been started yet at all → this is the very first scroll (slot 1).
  if (progress.pairs.length === 0) {
    return { type: "streamChoice", pairSlot: 1, options: availableStreamChoices(progress) }
  }

  // Exactly 2 pairs done and the crossroad hasn't been resolved yet → offer it.
  if (completed === 2 && progress.graduationPath === null) {
    return { type: "graduationCrossroad" }
  }

  // Player already chose Path A → send them to Unit 2 every time they land here.
  if (progress.graduationPath === "unit2") {
    return { type: "unit2Entry" }
  }

  // Path B (or already past the crossroad, still finishing Unit 1) → offer the
  // next unused stream, if any remain.
  if (completed < ALL_STREAM_IDS.length) {
    const nextSlot = (completed + 1) as 1 | 2 | 3 | 4
    return { type: "streamChoice", pairSlot: nextSlot, options: availableStreamChoices(progress) }
  }

  // All 4 streams finished.
  return { type: "unitComplete" }
}

/**
 * Convenience adapter matching the `getNextLesson(currentLessonId)` shape.
 * Note: in a branching unit, `currentLessonId` alone can't determine "next" —
 * you need the player's full progress. This just resolves progress → a route
 * string, which is what a page component actually needs to redirect to.
 */
export function resolveIncomeRoute(progress: IncomeUnitProgress): string {
  const screen = getNextIncomeScreen(progress)
  switch (screen.type) {
    case "lesson1": return "/map"
    case "lesson2": return "/lesson/gross-net-income"
    case "streamChoice": return `/income/choose?slot=${screen.pairSlot}`
    case "gameplay": return screen.stream.gameplayRoute
    case "analysis": return screen.stream.analysisRoute
    case "graduationCrossroad": return "/income/graduation"
    case "unit2Entry": return "/map-budget"
    case "unitComplete": return "/learn"
  }
}

// ─── State transitions ─────────────────────────────────────────────────────

export type IncomeAction =
  | { type: "COMPLETE_LESSON_1" }
  | { type: "COMPLETE_LESSON_2" }
  | { type: "CHOOSE_STREAM"; pairSlot: 1 | 2 | 3 | 4; streamId: StreamId }
  | { type: "COMPLETE_GAMEPLAY"; pairSlot: 1 | 2 | 3 | 4 }
  | { type: "COMPLETE_ANALYSIS"; pairSlot: 1 | 2 | 3 | 4 }
  | { type: "CHOOSE_GRADUATION_PATH"; path: "unit2" | "completing" }

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
      const newPair: IncomePairProgress = {
        slot: action.pairSlot,
        streamId: action.streamId,
        gameplayCompleted: false,
        analysisCompleted: false,
      }
      const existingIdx = state.pairs.findIndex((p) => p.slot === action.pairSlot)
      const pairs = [...state.pairs]
      if (existingIdx >= 0) pairs[existingIdx] = newPair
      else pairs.push(newPair)
      return { ...state, pairs }
    }

    case "COMPLETE_GAMEPLAY":
      return {
        ...state,
        pairs: state.pairs.map((p) =>
          p.slot === action.pairSlot ? { ...p, gameplayCompleted: true } : p,
        ),
      }

    case "COMPLETE_ANALYSIS": {
      const pairs = state.pairs.map((p) =>
        p.slot === action.pairSlot ? { ...p, analysisCompleted: true } : p,
      )
      const completed = pairs.filter((p) => p.analysisCompleted).length
      return { ...state, pairs, unit2Unlocked: state.unit2Unlocked || completed >= 2 }
    }

    case "CHOOSE_GRADUATION_PATH":
      return { ...state, graduationPath: action.path, graduationOffered: true }

    default:
      return state
  }
}
