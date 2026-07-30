/**
 * Farming stream, Lesson: "Start Your First Farm!"
 *
 * Odd/Even pairing: this whole module drives Lesson 3 (the fixed farm
 * gameplay slot: see INCOME_ROUTES in app/lesson/[lessonId]/page.tsx).
 * The review lesson right after it is STATIC: same copy for every
 * player, teaching Principal vs. Interest in general, but it should
 * open by recapping *this specific player's* path using `eventLog`
 * (and whether they went into debt for Pest-Bugs or took Bink's
 * Quick-Zap Weeder deal), the same way the existing Lesson 2 recaps
 * Lesson 1's literal 20-coins-to-18-coins numbers.
 *
 * Story shape (see app/(main)/map/game-map.tsx for the stage machine
 * that drives this): Bloo explains the farm plot needs Pest-Bugs from
 * the Market to clear the weeds. While walking there, Bink interrupts
 * with a cheap "Quick-Zap Weeder" instead. Both instantly clear the
 * plot — the real difference is what it costs going forward: Pest-Bugs
 * clear it clean (town fronts you the coins as debt if you're short),
 * while the Weeder takes a flat fee out of every future crop sale,
 * forever. That's a real money commitment, so it's presented as one
 * official StoryScroll with both choices, not a plain dialogue choice.
 *
 * Scope note: this file is state + decision logic only; it does not
 * touch app/(main)/map/game-map.tsx. Placing the fenced plot west of
 * town center, drawing brown soil tiles, and adding Bink as a walkable,
 * pressable map entity is a separate, larger integration task against
 * that file.
 */

// ─── Plant registry ─────────────────────────────────────────────────────────

export type PlantId = "glowPumpkin" | "speedBerry" | "tallCorn" | "bubbleBean" | "sunRoot"
/** Store-only, never handed out by the random starter roll. */
export type StoreOnlyPlantId = "vaultVine"

export interface PlantDefinition {
  id: PlantId | StoreOnlyPlantId
  emoji: string
  name: string
  vibe: string
  /** The gameplay mechanic in plain terms: what actually happens as the player farms it. */
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
    mechanic: "Grow super quickly, but their sale value crashes fast if too many are sold at once.",
    concept: "Supply and Demand: flooding the market drops the price.",
    storeOnly: false,
  },
  speedBerry: {
    id: "speedBerry",
    emoji: "🍓",
    name: "Speed-Berries",
    vibe: "Bright red berries that practically glow with freshness.",
    mechanic: "Highly prized by traders, but spoil quickly if not sold within a set time.",
    concept: "Perishable Assets & Time Value: selling promptly maximizes return before it decays.",
    storeOnly: false,
  },
  tallCorn: {
    id: "tallCorn",
    emoji: "🌽",
    name: "Tall-Corn",
    vibe: "Towering, golden stalks that take their time.",
    mechanic: "Grows slowly and needs patience, but sells for a high price once it's ready.",
    concept: "Delayed Gratification & Long-Term Growth: waiting longer can pay off bigger.",
    storeOnly: false,
  },
  bubbleBean: {
    id: "bubbleBean",
    emoji: "🫧",
    name: "Bubble-Beans",
    vibe: "Fizzy, iridescent beans that pop if you look at them funny.",
    mechanic: "Sell price re-rolls randomly every morning (e.g. 1 coin one day, 15 the next, 2 the day after).",
    concept: "Market Volatility & High-Risk Assets: timing when you sell matters.",
    storeOnly: false,
  },
  sunRoot: {
    id: "sunRoot",
    emoji: "🌻",
    name: "Sun-Roots",
    vibe: "Cheerful, sturdy roots that never seem to have a bad day.",
    mechanic: "Yield a small, steady amount of coins on a fixed schedule, no drama, no active harvesting.",
    concept: "Passive Income & Stability: steady, low-risk recurring revenue.",
    storeOnly: false,
  },
  vaultVine: {
    id: "vaultVine",
    emoji: "🔒",
    name: "Vault-Vines",
    vibe: "Heavy, iron-like vines with thick, lock-shaped seed pods.",
    mechanic: "Store-only. Costs coins up front for specialized fertilizer to unlock the pods, which contain rare, valuable seeds.",
    concept: "Capital Investment & Upfront Costs: spending money on tools/equipment now for higher future returns.",
    storeOnly: true,
  },
}

const STARTER_PLANT_POOL: PlantId[] = ["glowPumpkin", "speedBerry", "tallCorn", "bubbleBean", "sunRoot"]

/** Every player gets one of the 5 non-store plants at random when their plot unlocks. */
export function rollStarterPlant(): PlantId {
  return STARTER_PLANT_POOL[Math.floor(Math.random() * STARTER_PLANT_POOL.length)]
}

/** The other 4 starter plants the player *didn't* roll, shown locked in the Market. */
export function lockedPlantsFor(assigned: PlantId | null): PlantDefinition[] {
  return STARTER_PLANT_POOL.filter((id) => id !== assigned).map((id) => PLANT_REGISTRY[id])
}

/** Draw the fenced plot's tiles in this color, brown soil, west of the town-center building. */
export const FARM_SOIL_TILE_COLOR = "#4a2f14"

// ─── Bink ────────────────────────────────────────────────────────────────

/**
 * Kid-friendly framing of Bink's motive: he's not just "mean," he wants to
 * build one giant store that sells everything so nobody needs small farms
 * like the player's; the player's little plot is early competition he'd
 * rather not have around.
 */
export function binkMallPitchLine(plant: PlantDefinition): string {
  return `Bink wants to build a giant "Mega-${plant.name} Mall" on the island, one huge store that sells everything, so people stop needing small farms like yours. He's not thrilled you're here first. 😤`
}

// ─── State ──────────────────────────────────────────────────────────────────

export const FARM_PLOT_ROWS = 4
export const FARM_PLOT_COLS = 4
export const SEEDS_NEEDED = FARM_PLOT_ROWS * FARM_PLOT_COLS // 16

export interface FarmPlotState {
  plotUnlocked: boolean
  assignedPlant: PlantId | null

  // Bink's Quick-Zap Weeder route (permanent, once taken).
  usedBinkWeeder: boolean
  /** Permanent: flat coins Bink takes out of every future crop sale. 0 if the player went the clean Pest-Bugs route. */
  binkFeePerSale: number

  // Seeds & planting.
  seedsOwned: number
  rowsPlanted: boolean[]
  rowsHarvested: boolean[]

  /** Coins earned from actual gameplay (harvesting/selling) this lesson, base for the end-of-lesson tax. */
  totalEarningsThisLesson: number

  eventLog: string[]
}

export function createInitialFarmPlotState(): FarmPlotState {
  return {
    plotUnlocked: false,
    assignedPlant: null,
    usedBinkWeeder: false,
    binkFeePerSale: 0,
    seedsOwned: 0,
    rowsPlanted: new Array(FARM_PLOT_ROWS).fill(false),
    rowsHarvested: new Array(FARM_PLOT_ROWS).fill(false),
    totalEarningsThisLesson: 0,
    eventLog: [],
  }
}

function logEvent(state: FarmPlotState, message: string): FarmPlotState {
  return { ...state, eventLog: [...state.eventLog, message] }
}

// ─── Tunable constants ──────────────────────────────────────────────────────

export const PEST_BUG_COST = 100 // what the Market charges for a jar of weed-eating bugs
export const FARM_WEEDER_COST = 5 // Bink's Quick-Zap Weeder, one-time
export const FARM_WEEDER_FEE_PER_SALE = 5 // Bink's permanent cut of every future crop sale
export const SEED_PACK_SIZE = 8 // seeds per pack, 2 packs covers all 16 plots
export const SEED_PACK_COST = 20
export const FARM_ROW_SALE_VALUE = 20 // gross coins earned harvesting+selling one row
export const END_OF_LESSON_TAX_RATE = 0.10

/**
 * Clear the plot with Pest-Bugs from the Market — the clean route. Costs
 * `PEST_BUG_COST` coins outright; if the player can't cover it, the town
 * fronts the difference as debt (coins simply go negative — the caller's
 * HUD should render negative coins in red). No ongoing fees either way.
 * trigger: PestBugsPurchasedAnimation
 */
export function clearPlotWithPestBugs(state: FarmPlotState): { state: FarmPlotState; coinsDelta: number; triggers: string[] } {
  const plant = rollStarterPlant()
  const next: FarmPlotState = { ...state, plotUnlocked: true, assignedPlant: plant }
  return {
    state: logEvent(next, `Bought Pest-Bugs for ${PEST_BUG_COST} coins (town covered any shortfall as debt). The weeds are cleared! Starter plant: ${PLANT_REGISTRY[plant].name}.`),
    coinsDelta: -PEST_BUG_COST,
    triggers: ["PestBugsPurchasedAnimation"],
  }
}

/**
 * Clear the plot with Bink's Quick-Zap Weeder — the cheap route. Only
 * `FARM_WEEDER_COST` coins now, but Bink permanently takes `FARM_WEEDER_FEE_PER_SALE`
 * coins out of every future crop sale, forever. The trap is that it feels
 * free today and only costs you later.
 * trigger: BinkWeederAnimation
 */
export function clearPlotWithBinkWeeder(state: FarmPlotState): { state: FarmPlotState; coinsDelta: number; triggers: string[] } {
  const plant = rollStarterPlant()
  const next: FarmPlotState = {
    ...state,
    plotUnlocked: true,
    assignedPlant: plant,
    usedBinkWeeder: true,
    binkFeePerSale: FARM_WEEDER_FEE_PER_SALE,
  }
  return {
    state: logEvent(
      next,
      `Used Bink's Quick-Zap Weeder for ${FARM_WEEDER_COST} coins. The weeds are cleared, but Bink now permanently takes ${FARM_WEEDER_FEE_PER_SALE} coins from every crop sale. Starter plant: ${PLANT_REGISTRY[plant].name}.`,
    ),
    coinsDelta: -FARM_WEEDER_COST,
    triggers: ["BinkWeederAnimation"],
  }
}

/**
 * Buy one seed pack (8 seeds) at the Market, one click, repeatable until
 * the player has all 16 seeds they need.
 */
export function buySeedPack(state: FarmPlotState, coins: number): { state: FarmPlotState; coinsDelta: number; triggers: string[]; success: boolean } {
  if (coins < SEED_PACK_COST) {
    return {
      state: logEvent(state, `Tried to buy a seed pack but had fewer than ${SEED_PACK_COST} coins.`),
      coinsDelta: 0,
      triggers: ["NotEnoughCoinsAnimation"],
      success: false,
    }
  }
  const next: FarmPlotState = {
    ...state,
    seedsOwned: state.seedsOwned + SEED_PACK_SIZE,
  }
  return {
    state: logEvent(next, `Bought a ${SEED_PACK_SIZE}-seed pack for ${SEED_PACK_COST} coins.`),
    coinsDelta: -SEED_PACK_COST,
    triggers: ["SeedPackPurchasedAnimation"],
    success: true,
  }
}

/**
 * Plant one row of the plot (uses `FARM_PLOT_COLS` seeds from inventory).
 * No-op if that row is already planted or there aren't enough seeds.
 */
export function plantRow(state: FarmPlotState, rowIndex: number): { state: FarmPlotState; success: boolean } {
  if (state.rowsPlanted[rowIndex] || state.seedsOwned < FARM_PLOT_COLS) return { state, success: false }
  const rowsPlanted = [...state.rowsPlanted]
  rowsPlanted[rowIndex] = true
  const next: FarmPlotState = {
    ...state,
    seedsOwned: state.seedsOwned - FARM_PLOT_COLS,
    rowsPlanted,
  }
  return { state: logEvent(next, `Planted row ${rowIndex + 1}.`), success: true }
}

/**
 * Harvest + sell one planted row. Nets `FARM_ROW_SALE_VALUE` coins, minus
 * Bink's flat per-sale fee if the player took the Weeder route.
 */
export function harvestRow(state: FarmPlotState, rowIndex: number): { state: FarmPlotState; coinsDelta: number; success: boolean } {
  if (!state.rowsPlanted[rowIndex] || state.rowsHarvested[rowIndex]) return { state, coinsDelta: 0, success: false }
  const rowsHarvested = [...state.rowsHarvested]
  rowsHarvested[rowIndex] = true
  const net = Math.max(0, FARM_ROW_SALE_VALUE - state.binkFeePerSale)
  const next: FarmPlotState = {
    ...state,
    rowsHarvested,
    totalEarningsThisLesson: state.totalEarningsThisLesson + net,
  }
  return {
    state: logEvent(
      next,
      `Harvested & sold row ${rowIndex + 1} for ${net} coins${state.binkFeePerSale > 0 ? ` (Bink took ${state.binkFeePerSale})` : ""}.`,
    ),
    coinsDelta: net,
    success: true,
  }
}

// ─── End-of-lesson tax collection ──────────────────────────────────────────

export type TaxCollector = "banker" | "bink"

/** Which NPC shows up to collect, based on whether the player took Bink's Weeder. */
export function collectorForState(state: FarmPlotState): TaxCollector {
  return state.usedBinkWeeder ? "bink" : "banker"
}

/**
 * Standard 10% end-of-lesson tax on whatever the player earned via actual
 * gameplay this lesson (harvesting/selling), collected by whichever NPC
 * matches their route. Bloo reminds the player this is coming before the
 * lesson-complete stats screen.
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
  return {
    state: logEvent(state, `${collector} collected the standard 10% end-of-lesson tax: -${amountCollected} coins.`),
    collector,
    amountCollected,
    triggers: [`${collector}CollectsTaxAnimation`],
  }
}
