/**
 * Farming stream — Phase 1: Startup Capital & The Plot Permit.
 *
 * Odd/Even pairing: this whole module drives the dynamic half of the pair
 * (Lesson "gameplay" — whichever order slot the farm stream lands in, per
 * lib/income-progression.ts). The paired review lesson right after it is
 * STATIC — same copy for every player, teaching Principal vs. Interest in
 * general — but it should open by recapping *this specific player's* path
 * using `eventLog` (and which of 1A/1B/1C they took), the same way the
 * existing Lesson 2 recaps Lesson 1's literal 20-coins-to-18-coins numbers.
 * The end-of-lesson tax collection (see `collectEndOfLessonTax`) is what
 * feeds that recap and the "lesson complete" stats screen.
 *
 * Scope note: this file is state + decision logic only, matching how
 * lib/income-progression.ts and the earlier farm route logic were built —
 * it does not touch app/(main)/map/game-map.tsx. Placing the fenced plot
 * west of town center, drawing brown soil tiles, and adding the Banker /
 * Bink's vending machine / capital-cabin-qube NPCs as walkable, pressable
 * map entities is a separate, larger integration task against that file.
 */

// ─── Plant registry ─────────────────────────────────────────────────────────

export type PlantId = "glowPumpkin" | "chimeBerry" | "snapSprout" | "shimmerShroom" | "profitPalm"
/** Store-only — never handed out by the random starter roll. */
export type StoreOnlyPlantId = "vaultVine"

export interface PlantDefinition {
  id: PlantId | StoreOnlyPlantId
  emoji: string
  name: string
  vibe: string
  /** The gameplay mechanic in plain terms — what actually happens as the player farms it. */
  mechanic: string
  /** The financial-literacy concept this plant's mechanic is built to teach. */
  concept: string
  /** True only for Vault-Vines: not part of the random starter pool, store purchase only. */
  storeOnly: boolean
}

export const PLANT_REGISTRY: Record<PlantId | StoreOnlyPlantId, PlantDefinition> = {
  glowPumpkin: {
    id: "glowPumpkin",
    emoji: "🎃",
    name: "Glow-Pumpkins",
    vibe: "Bright neon, pulsing pumpkins.",
    mechanic: "Grow super quickly, but their sale value drops fast if too many are planted/sold at once.",
    concept: "Supply and Demand — flooding the market drops the price.",
    storeOnly: false,
  },
  chimeBerry: {
    id: "chimeBerry",
    emoji: "🔔",
    name: "Chime-Berries",
    vibe: "Tiny, golden, bell-shaped berries.",
    mechanic: "Highly prized by traders, but spoil quickly if not sold or preserved within a set time.",
    concept: "Perishable Assets & Time Value — selling promptly maximizes return before it decays.",
    storeOnly: false,
  },
  snapSprout: {
    id: "snapSprout",
    emoji: "🌱",
    name: "Snap-Sprouts",
    vibe: "Grumpy, carnivorous-looking venus flytraps.",
    mechanic: "Naturally fend off pests on their own, but need upfront protection/insurance to guard the main harvest.",
    concept: "Protective Assets & Risk Mitigation — paying up front to protect your main income stream.",
    storeOnly: false,
  },
  shimmerShroom: {
    id: "shimmerShroom",
    emoji: "🍄",
    name: "Shimmer-Shrooms",
    vibe: "Mysterious, rainbow mushrooms.",
    mechanic: "Sell price re-rolls randomly every morning (e.g. 1 coin one day, 15 the next, 2 the day after).",
    concept: "Market Volatility & High-Risk Assets — timing when you sell matters.",
    storeOnly: false,
  },
  profitPalm: {
    id: "profitPalm",
    emoji: "🌴",
    name: "Profit-Palms",
    vibe: "Miniature coconut trees.",
    mechanic: "Yield a small amount of coins on a fixed schedule (e.g. 1 coin every 2 minutes) with no active harvesting.",
    concept: "Passive Income & Yield — steady recurring revenue without ongoing labor.",
    storeOnly: false,
  },
  vaultVine: {
    id: "vaultVine",
    emoji: "🔒",
    name: "Vault-Vines",
    vibe: "Heavy, iron-like vines with thick, lock-shaped seed pods.",
    mechanic: "Store-only. Costs coins up front for specialized fertilizer to unlock the pods, which contain rare, valuable seeds.",
    concept: "Capital Investment & Upfront Costs — spending money on tools/equipment now for higher future returns.",
    storeOnly: true,
  },
}

const STARTER_PLANT_POOL: PlantId[] = ["glowPumpkin", "chimeBerry", "snapSprout", "shimmerShroom", "profitPalm"]

/** Every player gets one of the 5 non-store plants at random when their plot unlocks. */
export function rollStarterPlant(): PlantId {
  return STARTER_PLANT_POOL[Math.floor(Math.random() * STARTER_PLANT_POOL.length)]
}

/** Draw the fenced plot's tiles in this color — brown soil, west of the town-center building. */
export const FARM_SOIL_TILE_COLOR = "#7a5a1a"

// ─── Bink ────────────────────────────────────────────────────────────────

/**
 * Kid-friendly framing of Bink's motive: he's not just "mean," he wants to
 * build one giant store that sells everything so nobody needs small farms
 * like the player's — the player's little plot is early competition he'd
 * rather not have around.
 */
export function binkMallPitchLine(plant: PlantDefinition): string {
  return `Bink wants to build a giant "Mega-${plant.name} Mall" on the island — one huge store that sells everything, so people stop needing small farms like yours. He's not thrilled you're here first. 😤`
}

export const BINK_INTRO: string[] = [
  "Well, well. Another little farm popping up.",
  "I'm building something BIG here — the Mega-Mall. One giant store, everything you need, no more little plots.",
  "Small farms like yours? Cute. But you're in my way.",
  "Don't worry, I'm sure we can... work something out. 😏",
]

// ─── State ──────────────────────────────────────────────────────────────────

export interface FarmPlotState {
  playerMoney: number
  plotUnlocked: boolean
  assignedPlant: PlantId | null

  // Choice 1A — Town Banker loan
  loanActive: boolean
  /** Coins owed to the Banker every time a batch of `loanFeeBatchSize` plants is sold. */
  loanFeePerBatch: number
  /** Fill-in-the-blank from the design doc — tune freely; 5 is a reasonable starting batch size. */
  loanFeeBatchSize: number

  // Choice 1B — Bink's "Fast-Cash" machine (permanent, once taken)
  binkFastCashUsed: boolean
  /** Permanent: player can never buy/unlock additional farmland after taking this route. */
  landPurchaseLocked: boolean
  /** Permanent: this fraction of every future crop sale goes to Bink. */
  binkCropInterestRate: number

  // Choice 1C — Bug squad dig-up
  foundAssetBonus: number
  /** Owed to the Governor because the coin jar was dug up on shared/public land. */
  governorShareOwed: number

  /** Coins earned from actual gameplay (harvesting/selling) this lesson — base for the end-of-lesson tax. */
  totalEarningsThisLesson: number

  eventLog: string[]
}

export function createInitialFarmPlotState(): FarmPlotState {
  return {
    playerMoney: 0,
    plotUnlocked: false,
    assignedPlant: null,
    loanActive: false,
    loanFeePerBatch: 0,
    loanFeeBatchSize: 5,
    binkFastCashUsed: false,
    landPurchaseLocked: false,
    binkCropInterestRate: 0,
    foundAssetBonus: 0,
    governorShareOwed: 0,
    totalEarningsThisLesson: 0,
    eventLog: [],
  }
}

function logEvent(state: FarmPlotState, message: string): FarmPlotState {
  return { ...state, eventLog: [...state.eventLog, message] }
}

// ─── Tunable constants ──────────────────────────────────────────────────────

export const PLOT_CLEARING_COST = 100 // what the capital-cabin qube charges for seeds + land clearing
export const BANKER_LOAN_PRINCIPAL = 100
export const BANKER_LOAN_FEE_PER_BATCH = 12
export const BINK_FAST_CASH_PAYOUT = 5
export const BINK_PERMANENT_CROP_INTEREST_RATE = 0.10
export const BUG_SQUAD_FOUND_ASSET = 100
export const GOVERNOR_FOUND_ASSET_SHARE = 0.30 // tune this — "give some to the governor" isn't quantified in the design doc
export const END_OF_LESSON_TAX_RATE = 0.10

// ─── Phase 1 choices (1A / 1B / 1C) ─────────────────────────────────────────

export type Phase1ChoiceID = "1A" | "1B" | "1C"

export const PHASE_1_CONTENT = {
  title: "The Startup Capital & The Plot Permit",
  body: `To clear the land and buy your first seeds, you need ${PLOT_CLEARING_COST} coins. You head for the Banker — but Bink slams down a shiny "Fast-Cash" machine right in front of your gate first. What's your move?`,
  choices: [
    { id: "1A" as const, icon: "🏦", text: "Take a standard 100-coin loan from the Town Banker." },
    { id: "1B" as const, icon: "🎰", text: "Use Bink's \"Fast-Cash\" machine for 5 quick coins." },
    { id: "1C" as const, icon: "🐛", text: "Hire wild island bugs with rotten berries to dig for free." },
  ],
}

/**
 * Choice 1A, step 1 — sign the Banker's papers.
 * trigger: BankerSignPapersAnimation
 * Result: +100 coins now, but 12 coins owed to the Banker every time a
 * 5-plant batch is sold later — the loan isn't free, it's principal + a
 * recurring fee (this is the seed of the paired review lesson's "interest"
 * explanation).
 */
export function takeBankerLoan(state: FarmPlotState): { state: FarmPlotState; triggers: string[] } {
  const next: FarmPlotState = {
    ...state,
    playerMoney: state.playerMoney + BANKER_LOAN_PRINCIPAL,
    loanActive: true,
    loanFeePerBatch: BANKER_LOAN_FEE_PER_BATCH,
  }
  return {
    state: logEvent(
      next,
      `Took a ${BANKER_LOAN_PRINCIPAL}-coin loan. Owe the Banker ${BANKER_LOAN_FEE_PER_BATCH} coins per ${state.loanFeeBatchSize}-plant batch sold.`,
    ),
    triggers: ["BankerSignPapersAnimation"],
  }
}

/**
 * Choice 1B — insert a berry into Bink's Fast-Cash machine.
 * trigger: BinkFastCashAnimation, then BinkFinePrintRevealAnimation
 * Result: a tiny payout now (5 coins — not nearly enough to clear the
 * land alone) in exchange for two PERMANENT penalties: the player can
 * never unlock additional farmland again, and Bink now takes 10% off
 * every future crop sale, forever. The trap is that it *feels* free.
 */
export function useBinkFastCash(state: FarmPlotState): { state: FarmPlotState; triggers: string[] } {
  const next: FarmPlotState = {
    ...state,
    playerMoney: state.playerMoney + BINK_FAST_CASH_PAYOUT,
    binkFastCashUsed: true,
    landPurchaseLocked: true,
    binkCropInterestRate: BINK_PERMANENT_CROP_INTEREST_RATE,
  }
  return {
    state: logEvent(
      next,
      `Used Bink's Fast-Cash machine for ${BINK_FAST_CASH_PAYOUT} coins. Permanently owes Bink ${
        BINK_PERMANENT_CROP_INTEREST_RATE * 100
      }% of every future crop sale, and can never buy more farmland.`,
    ),
    triggers: ["BinkFastCashAnimation", "BinkFinePrintRevealAnimation"],
  }
}

/**
 * Choice 1C — scatter rotten berries, let the bug squad dig.
 * trigger: BugSquadDigAnimation, then FoundAssetJarAnimation
 * Result: the plot is cleared AND funded instantly (no need to pay the
 * capital-cabin qube at all) via a dug-up coin jar — but because it was
 * found on shared/public land, a share of it is owed to the Governor.
 * This is the only Phase 1 route that unlocks the plot directly.
 */
export function hireBugSquad(state: FarmPlotState): { state: FarmPlotState; triggers: string[] } {
  const governorShare = Math.round(BUG_SQUAD_FOUND_ASSET * GOVERNOR_FOUND_ASSET_SHARE)
  const next: FarmPlotState = {
    ...state,
    foundAssetBonus: BUG_SQUAD_FOUND_ASSET,
    playerMoney: state.playerMoney + BUG_SQUAD_FOUND_ASSET,
    governorShareOwed: state.governorShareOwed + governorShare,
    plotUnlocked: true,
    assignedPlant: state.assignedPlant ?? rollStarterPlant(),
  }
  return {
    state: logEvent(
      next,
      `Bug squad cleared the land for free and dug up ${BUG_SQUAD_FOUND_ASSET} old coins — but ${governorShare} of that is owed to the Governor as a found-asset share.`,
    ),
    triggers: ["BugSquadDigAnimation", "FoundAssetJarAnimation"],
  }
}

export function applyPhase1Choice(
  choiceID: Phase1ChoiceID,
  state: FarmPlotState,
): { state: FarmPlotState; triggers: string[] } {
  if (choiceID === "1A") return takeBankerLoan(state)
  if (choiceID === "1B") return useBinkFastCash(state)
  return hireBugSquad(state)
}

/**
 * Shared step for 1A/1B: once the player has saved up 100 coins (from the
 * loan, from fast-cash plus earned gameplay coins, or however else), they
 * pay the qube guarding the town capital cabin to actually clear the land.
 * 1C skips this entirely — the bugs already did it for free.
 * trigger: PlotUnlockedAnimation
 */
export function payForPlotClearing(state: FarmPlotState): { state: FarmPlotState; triggers: string[] } {
  if (state.plotUnlocked) return { state, triggers: [] }
  if (state.playerMoney < PLOT_CLEARING_COST) {
    return {
      state: logEvent(state, `Tried to pay for plot clearing but had fewer than ${PLOT_CLEARING_COST} coins.`),
      triggers: ["NotEnoughCoinsAnimation"],
    }
  }
  const plant = rollStarterPlant()
  const next: FarmPlotState = {
    ...state,
    playerMoney: state.playerMoney - PLOT_CLEARING_COST,
    plotUnlocked: true,
    assignedPlant: plant,
  }
  return {
    state: logEvent(next, `Paid ${PLOT_CLEARING_COST} coins to clear the plot. Starter plant: ${PLANT_REGISTRY[plant].name}.`),
    triggers: ["PlotUnlockedAnimation"],
  }
}

// ─── End-of-lesson tax collection ──────────────────────────────────────────

export type TaxCollector = "banker" | "bink" | "governor"

/** Which NPC shows up to collect, based on which Phase 1 route the player took. */
export function collectorForState(state: FarmPlotState): TaxCollector {
  if (state.binkFastCashUsed) return "bink"
  if (state.governorShareOwed > 0) return "governor"
  return "banker"
}

/**
 * Standard 10% end-of-lesson tax on whatever the player earned via actual
 * gameplay this lesson (harvesting/selling), collected by whichever NPC
 * matches their Phase 1 route. Bloo reminds the player this is coming
 * before the lesson-complete stats screen.
 * trigger: `${collector}CollectsTaxAnimation`
 */
export function collectEndOfLessonTax(state: FarmPlotState): {
  state: FarmPlotState
  collector: TaxCollector
  amountCollected: number
  triggers: string[]
} {
  const collector = collectorForState(state)
  const amountCollected = Math.round(state.totalEarningsThisLesson * END_OF_LESSON_TAX_RATE)
  const next: FarmPlotState = {
    ...state,
    playerMoney: state.playerMoney - amountCollected,
  }
  return {
    state: logEvent(next, `${collector} collected the standard 10% end-of-lesson tax: -${amountCollected} coins.`),
    collector,
    amountCollected,
    triggers: [`${collector}CollectsTaxAnimation`],
  }
}
