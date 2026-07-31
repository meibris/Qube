"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { saveGameLesson } from "@/actions/game-lesson"
import {
  SHARED_SPEED, SHARED_PLAYER_R,
  SUSTENANCE_MAX, SUSTENANCE_DRAIN, BERRY_SUSTENANCE,
  HARVEST_BERRIES, HARVEST_COOLDOWN,
  FOLIAGE_REGEN, FOLIAGE_RANGE,
  TREE_HIT_R, BUSH_HIT_R, TREE_HIT_OY, BUSH_HIT_OY,
  MUSHROOM_HIT_R, WOOD_HIT_R, MUSHROOM_HIT_OY, WOOD_HIT_OY,
  NPC_HALF, NPC_SPEED,
  type ImgMap, type Inventory, freshInventory, claimInventorySlot,
  drawInventoryPanel, inventoryPanelHeight, inventorySlotIndexAt, swapInventorySlots,
  inventoryItemCount, type InventoryDrag,
  drawSharedPlayer, drawDialogBox, drawChoiceDialogBox, wrapCanvasText,
} from "@/lib/game-shared"
import {
  PLANT_REGISTRY, FARM_SOIL_TILE_COLOR,
  createInitialFarmPlotState, clearPlotWithPestBugs, clearPlotWithBinkWeeder,
  buySeedPack, plantRow, harvestRow,
  FARM_PLOT_ROWS, FARM_PLOT_COLS, SEEDS_NEEDED, SEED_PACK_SIZE,
  PEST_BUG_COST, SEED_PACK_COST, FARM_WEEDER_COST, FARM_WEEDER_FEE_PER_SALE,
  type FarmPlotState, type PlantDefinition,
} from "@/lib/farm-plot"
import { StoryScroll, type StoryScrollData } from "@/components/story-scroll"
import { FarmMarket, FARM_BREAD_COST } from "@/components/farm-market"
// sustenanceSpeedMult intentionally omitted, speed is flat regardless of energy

// ─── Dialogue typewriter ───────────────────────────────────────────────────
// Advances a per-frame reveal counter for whatever line is currently on
// screen; resets automatically whenever the line text changes.
const TYPE_SPEED = 1.4 // chars revealed per frame (~fastish at 60fps); single global knob for every dialogue box, present and future
function typeReveal(s: { typeText: string; typeChars: number }, text: string): number {
  if (s.typeText !== text) { s.typeText = text; s.typeChars = 0 }
  s.typeChars = Math.min(text.length, s.typeChars + TYPE_SPEED)
  return Math.floor(s.typeChars)
}

export type MapVariant = "lesson1" | "lessonFarm" | "lessonBudget" | "lessonLoans" | "lessonInvest" | "lessonFish"

// ─── World constants ──────────────────────────────────────────────────────────
const TS=32, MAP_W=88, MAP_H=58
const SPEED=SHARED_SPEED, PLAYER_R=SHARED_PLAYER_R
const MAP_DRAIN = 1 / (60 * 5) // 1% every 5 seconds at 60fps

// ─── Lesson 1 constants ───────────────────────────────────────────────────────
const L1_NPC_MAX_TRADES=5, L1_NPC_BUY_RESET=7200
const L1_TIP_COINS=2, L1_FORAGE_GOAL=10

// ─── Lesson Farm constants ────────────────────────────────────────────────────
// Plot sits just west of the Income Center (the "town center" building), same
// shared island every lesson plays on, just a new patch of ground + NPCs.
// 4×4 grid (16 spots) so "2 seed packs of 8" cleanly covers the whole plot.
const FARM_PLOT_C1=29, FARM_PLOT_C2=32, FARM_PLOT_R1=34, FARM_PLOT_R2=37
// Bink loiters on the path toward the Market — that's where he interrupts.
const FARM_BINK_C=63, FARM_BINK_R=43
const FARM_BINK_X=(FARM_BINK_C+0.5)*TS, FARM_BINK_Y=(FARM_BINK_R+0.5)*TS
const FARM_INTERACT=TS*2.2
const FARM_ROW_CENTERS=Array.from({length:FARM_PLOT_ROWS},(_,i)=>({
  wx:(FARM_PLOT_C1+FARM_PLOT_C2+1)/2*TS,
  wy:(FARM_PLOT_R1+i+0.5)*TS,
}))

// ─── Foliage draw sizes ───────────────────────────────────────────────────────
const TREE_DW=64, TREE_DH=64, BUSH_DW=48, BUSH_DH=24
// Sprite cells (16px grid) in Basic_Grass_Biom_things.png — single mushroom
// cap at col 5/row 0, a cut log at col 5/row 2.
const MUSHROOM_SPRITE:[number,number]=[5*16,0*16]
const WOOD_SPRITE:[number,number]=[5*16,2*16]

// ─── Lesson 1 stages ──────────────────────────────────────────────────────────
// Linear flow: Bloo teaches move/harvest/eat → a quick pitch on foraging →
// free foraging until 10 items → walk to the Market and sell everything → wrap-up.
// No taxes, no gross-income talk — just the basic gather → sell loop.
const L1_INTRO=0, L1_HARVEST=1, L1_TOUR=2, L1_FORAGE=3
const L1_SELL_INTRO=4, L1_SELLING=5, L1_WRAP_UP=6, L1_COMPLETE=7

// ─── Lesson Farm stages ───────────────────────────────────────────────────────
// Linear flow: Bloo explains the plot needs Pest-Bugs from the Market →
// walking there, Bink interrupts with his cheap Quick-Zap Weeder → an
// official StoryScroll (both options clear the plot instantly; the real
// difference is debt-if-short vs a forever per-sale fee) → plant reveal →
// Bloo pitches buying seeds (no funding decision this time, just go buy
// them) → buy seed packs → plant each row → harvest & sell each row → wrap-up.
const FARM_TALK_BLOO=0, FARM_TO_MARKET=1, FARM_BINK_INTERRUPT=2, FARM_CLEAR_CHOICE=3
const FARM_RESOLVE_CLEARING=4, FARM_PLANT_REVEAL=5, FARM_SEEDS_PITCH=6, FARM_TO_MARKET_SEEDS=7
const FARM_PLANTING=8, FARM_HARVEST=9, FARM_WRAP_UP=10, FARM_COMPLETE=11

// ─── Lesson Budget (Lesson 10) stages ────────────────────────────────────────
const LB_INTRO=0, LB_EXPLORE=1, LB_BLOO_BUDGET=2, LB_COMPLETE=3
// ─── Lesson Invest (Lesson 37) constants ─────────────────────────────────────
const LIV_INTRO=0,LIV_BOAT=1,LIV_TRADE=2,LIV_COMPLETE=3
const LIV_TRADES_NEEDED=4,LIV_START_BERRIES=8,LIV_BOAT_SPEED=0.5
// Trade items: 0=Bread, 1=Seeds, 2=Wood
const LIV_BREAD_COST=1,LIV_SEED_COST=2,LIV_WOOD_COST=3
const LIV_SEED_BERRY_YIELD=5,LIV_SEED_GROW_FRAMES=900,LIV_WOOD_COINS=7
// Port position: north shore of main island near top-center
const LIV_PORT_C=41,LIV_PORT_R=17
const LIV_PORT_X=(LIV_PORT_C+0.5)*TS,LIV_PORT_Y=(LIV_PORT_R+0.5)*TS
// Boat: starts in water above the dock, moves north off screen
const LIV_BOAT_X=(LIV_PORT_C+0.5)*TS,LIV_BOAT_START_Y=11*TS
// ─── Lesson Loans (Lesson 19) stages ─────────────────────────────────────────
const LL_INTRO=0, LL_EXPLORE=1, LL_BLOO_TALK=2, LL_BANK=3, LL_COMPLETE=4
const LB_NPC_MAX_TRADES=5, LB_NPC_BUY_RESET=7200
const LB_COIN_PER_BERRY=1, LB_TIP_COINS=2

// ─── Lesson Fish (Lesson 5) stages ────────────────────────────────────────────
// Linear flow: Bloo explains the pier needs gear → walking toward the Market
// Tallo interrupts with a cheap-but-risky rod to borrow → a dialogue choice
// isn't enough here since real money's on the line, so it's an official
// StoryScroll (buy vs borrow) → buy bait at the Market → head to the pier and
// fish a short session → wrap-up.
const FISH_TALK_BLOO=0, FISH_TO_MARKET=1, FISH_TALLO_INTERRUPT=2, FISH_ROD_CHOICE=3
const FISH_BUY_BAIT=4, FISH_TO_PIER=5, FISH_FISHING=6, FISH_WRAP_UP=7, FISH_COMPLETE=8
const FISH_ROD_COST=100, FISH_BAIT_COST=10, FISH_BORROW_COST=5
const FISH_BORROW_SNAP_CHANCE=0.25, FISH_CASTS_NEEDED=3
// Tallo loiters just outside the Community Cottage, that's where the town
// lets you borrow gear (like a cheap spare fishing rod) for a small price.
const FISH_TALLO_C=11, FISH_TALLO_R=29
const FISH_TALLO_X=(FISH_TALLO_C+0.5)*TS, FISH_TALLO_Y=(FISH_TALLO_R+0.5)*TS
// The pier reuses the Lesson Invest port dock, same shared island, just a
// different lesson using the same waterfront prop.
const FISH_PIER_X=LIV_PORT_X, FISH_PIER_Y=LIV_PORT_Y+TS
const FISH_INTERACT=TS*2.2
// asking prices for each BUILDING_DEFS entry; 0 = not for sale (bank)
const HOUSE_PRICES=[0,500,350,400,800]

// ─── Lesson 1 dialogues ───────────────────────────────────────────────────────
const L1_BLOO_INTRO: string[] = [
  "Hi! Welcome to the island. I'm Bloo, your guide! 👋",
  "Before you can build anything or run a town, you need to learn how the island works.",
  "Move around with WASD or the arrow keys.",
  "See those trees and bushes? Walk up and press [Z] to harvest berries!",
  "You also need to eat to stay alive, press [X] to eat a berry.",
  "Go try it, harvest a berry and eat it!",
]
const L1_BLOO_HARVEST_REMIND: string[] = [
  "Head to one of those trees or bushes and press [Z] to harvest!",
  "Once you have berries, press [X] to eat one. Stay fed!",
]
const L1_BLOO_TOUR: string[] = [
  "Nice! Exploring takes energy, and eating keeps you going. Now let's talk about earning.",
  "This island is full of things to gather: berries on bushes and trees, mushrooms on the ground, and wood near fallen branches.",
  "Everything here can be picked up and sold at the Market. It's the most basic income source!",
  `Collect ${L1_FORAGE_GOAL} items, any mix you want, then sell them at the Market! Go!`,
]
const L1_BLOO_SELL_INTRO: string[] = [
  "Nice haul! Let's go sell it at the Market.",
  "Those colored squares wandering around? Walk up to any of them and press [Z] to sell.",
  "Each one can only buy 5 items at a time, so visit a few if you've got lots!",
  "Psst… the green Market Trader sometimes tosses in a bonus coin for rare mushrooms. 👀",
]
const L1_BLOO_WRAP_UP: string[] = [
  "Great job! You learned how to move, gather, eat, and sell.",
  "Foraging is your first income source, now you know how coins flow through the island!",
  "Now that you understand the basics, we can explore more ways to earn coins.",
  "Farming, fishing, crafting… your island has lots of opportunities!",
]

const NPC_NAMES = ["Budget Rep","Savings Banker","Tax Agent","Market Trader"]
const L1_NPC_OFFER: string[] = [
  "Budget's tight, but I'll buy a berry for 1 coin.",
  "Oh, fresh berries! I'll take one, 1 coin each.",
  "... Fine. 1 coin per berry. Make it quick.",
  "Welcome! I'll buy a berry for 1 coin, and hey, I might have a little extra for you! 😉",
]
const L1_NPC_SOLD: string[] = [
  "Thanks. Every coin counts, remember that!",
  "Mmm, fresh! Come back if you have more.",
  "Hmph. I suppose it was worth it.",
  "Here you go, and keep the extra change! You're doing great, kid! 🎉",
]
const L1_NPC_FULL: string[] = [
  "I've had my fill for now. Come back in a bit!",
  "All stocked up! Give me a couple minutes.",
  "I don't need any more right now.",
  "Love the hustle, but I'm all stocked up! Come back soon!",
]
const L1_NPC_NO_BERRY: string[] = [
  "You don't have any berries right now!",
  "Bring me some berries and we can deal.",
  "No berries, no coins. Simple as that.",
  "Come back with berries and I'll buy!",
]


// ─── Lesson Farm dialogues ──────────────────────────────────────────────────────
const FARM_BLOO_INTRO: string[] = [
  "Your island needs a steady income source, farming is perfect for that! 🌾",
  "I dug out a small plot of land you can use.",
  "It's just west of the town center, overgrown with weeds, but the soil underneath looks rich.",
  `We need to clear the weeds first. The Market sells Pest-Bugs that can clear the whole plot instantly, but they cost ${PEST_BUG_COST} coins. Let's go check it out.`,
]
// Back-and-forth exchange while walking toward the Market — speaker alternates
// per line. Bink never actually spells out the real cost; Bloo gets suspicious
// and asks, but Bink only half-answers. The player finds out what "convenience
// fee" really meant later, at harvest time.
const FARM_BINK_INTERRUPT_LINES: string[] = [
  "Forget the Market! My Quick-Zap Weeder clears the plot instantly.",
  `Only ${FARM_WEEDER_COST} coins to use it!`,
  "Wait… what's the catch, Bink?",
  "Catch? Ha! There's no big catch. Maybe a tiny convenience fee here and there. Barely worth mentioning!",
  "Hmm… convenient for who, exactly?",
]
const FARM_BINK_INTERRUPT_SPEAKERS: ("Bink"|"Bloo")[] = ["Bink","Bink","Bloo","Bink","Bloo"]
const FARM_CLEAR_CHOICE_PROMPT = "So — Pest-Bugs at the Market, or Bink's Weeder right here?"
const FARM_CLEAR_CHOICE_OPTIONS = [
  { id: "bugs", icon: "🐛", text: `Buy Pest-Bugs at the Market (${PEST_BUG_COST} coins).` },
  { id: "weeder", icon: "⚡", text: `Use Bink's Quick-Zap Weeder (${FARM_WEEDER_COST} coins).` },
]
function plantRevealLines(plant: PlantDefinition): string[] {
  return [
    `Whoa, look at that! ${plant.emoji} ${plant.name}!`,
    plant.vibe,
    plant.mechanic,
    `That's actually teaching you about ${plant.concept}, pretty cool, huh?`,
  ]
}
const FARM_SEEDS_PITCH_LINES: string[] = [
  "Whoa, both choices cleared the plot! One's expensive but clean, the other's cheap but suspicious.",
  "Now we need seeds! Two packs will fill all 16 tiles.",
  `Seed Packs are ${SEED_PACK_COST} coins each at the Market, let's go grab 2!`,
]
const FARM_WRAP_UP_LINES: string[] = [
  "Farming is a steady income source.",
  "Some tools cost more upfront, others cost more later.",
  "From now on, you must choose how you earn.",
]

// ─── Lesson Budget dialogues ──────────────────────────────────────────────────
const LB_BLOO_INTRO: string[] = [
  "Hey there! Welcome back to the island. Here, I scraped together 10 berries for you. 🍒",
  "Keep eating them, your energy drains over time. Press [X] to eat!",
  "I heard there are some properties for sale around here.",
  "Walk up to any building and press [Z] to check out the price!",
]
const LB_BLOO_BUDGET_TALK: string[] = [
  "Wow, that's expensive! But don't panic, this is exactly why budgets matter. 📊",
  "A budget helps you plan: track what you earn, what you spend, and what you save.",
  "Start saving now, and you could work toward something like that someday!",
]
const LL_BLOO_INTRO: string[] = [
  "Hey! Things are a bit tough on the island right now. 😅",
  "There are some properties for sale around here.",
  "Walk up to any building and press [Z] to check out the price!",
]
const LL_BLOO_LOAN: string[] = [
  "You don't have enough money? Sorry, I can't help, I'm struggling too. 😬",
  "Looks like you'll need a loan!",
  "Head to that blue building in the center, it's the bank. They can help you!",
]

// ─── Lesson Invest dialogues ──────────────────────────────────────────────────
const LIV_BLOO_INTRO: string[] = [
  "Welcome to the Island Trading Center! 🌊",
  "See that dock to the north? Our island ships goods to distant islands from there.",
  "Each island specializes in something, ours grows the best berries around!",
  "When we produce more than we need, we ship the surplus to islands that want it.",
  "They send back goods or coins we can't produce ourselves, that's how trade works.",
  "There's a trade vessel at the dock right now. Let's watch it depart!",
]
const LIV_BLOO_BOAT: string[] = [
  "See that vessel heading north? It's carrying our berries to the Northern Archipelago.",
  "They can't grow berries up there, so ours are very valuable to them.",
  "In exchange, they'll send back timber we need to expand these very docks.",
  "Both islands end up better off, that's the whole point of trade.",
  "Ports like this one connect islands that each have something the other needs.",
  "Your turn! Walk to the Port Trader at the dock and press [Z] to trade.",
]

// ─── Lesson Fish dialogues ─────────────────────────────────────────────────────
const FISH_BLOO_INTRO: string[] = [
  "Your farm is running great… now it's time to unlock another income source: Fishing! 🎣",
  "The pier is ready, all you need is gear.",
  "See that sign? \"Fishing Allowed: Gear + Bait Required.\" You don't own any equipment yet.",
  `A Basic Rod costs ${FISH_ROD_COST} coins at the Market, and bait is ${FISH_BAIT_COST} coins a can. Let's go check it out!`,
]
const FISH_TALLO_INTERRUPT_LINES: string[] = [
  "Whoa there! Heading to buy a rod?",
  `We keep spares right here at the Community Cottage, you can borrow one instead, only ${FISH_BORROW_COST} coins for the whole lesson!`,
  "It works fine... mostly. If it snaps, you'll lose whatever you were reeling in.",
  "So, buy a rod of your own, or borrow mine? Your call!",
]
function fishRodScroll(coins:number): StoryScrollData {
  return {
    title: "Gear Up for Fishing",
    body: `You've got ${coins} coins. A Basic Rod costs ${FISH_ROD_COST} coins, yours to keep, no breakage risk. Tallo's spare rod is only ${FISH_BORROW_COST} coins, but it has a ${Math.round(FISH_BORROW_SNAP_CHANCE*100)}% chance of snapping each cast, and if it snaps, you lose that catch.`,
    choices: [
      { id: "buy", icon: "🎣", text: `Buy the Basic Rod (${FISH_ROD_COST} coins).` },
      { id: "borrow", icon: "🤝", text: `Borrow Tallo's rod (${FISH_BORROW_COST} coins).` },
    ],
  }
}
function fishWrapLines(rodBorrowed:boolean): string[] {
  const bloo=[
    "Fishing is another way your town earns money.",
    "Some income sources are stable, others are risky. Today you chose how you wanted to earn.",
    "Now your town has two income sources, farming and fishing. More income means more ways to grow your island!",
  ]
  return rodBorrowed?[...bloo,"Thanks for trying it out! Bring it back anytime… if it's still in one piece. -Tallo"]:bloo
}

// ─── Island shapes ────────────────────────────────────────────────────────────
interface Island { cr:number; cc:number; rx:number; ry:number }
const ISLANDS: Island[] = [
  { cr:29, cc:37, rx:17, ry:14 },
  { cr:26, cc:9,  rx:9,  ry:8  },
  { cr:11, cc:63, rx:8,  ry:8  },
  { cr:40, cc:69, rx:8,  ry:8  },
  { cr:10, cc:48, rx:2.05, ry:1.1 },   // tiny stepping-stone island between the main island and Tax Office island
]
function isLand(r:number, c:number): boolean {
  for (const isl of ISLANDS) {
    const nx=(c-isl.cc)/isl.rx, ny=(r-isl.cr)/isl.ry
    const dist=Math.sqrt(nx*nx+ny*ny), angle=Math.atan2(ny,nx)
    const wobble=0.08*Math.sin(angle*5+1.1)+0.05*Math.sin(angle*9-0.7)
    if (dist < 1+wobble) return true
  }
  return false
}

// ─── Building metadata ────────────────────────────────────────────────────────
interface BuildingDef { tile:TileID; r1:number; r2:number; c1:number; c2:number; color:string; border:string; label:string[]; svg:string }
const WATER=0, GRASS=1, FLOWER=2, PATH=3
const B_INCOME=4, B_TAX=5, B_BUDGET=6, B_SAVINGS=7, B_MARKET=8
type TileID = 0|1|2|3|4|5|6|7|8
const BUILDING_DEFS: BuildingDef[] = [
  { tile:B_INCOME,  r1:19, r2:23, c1:27, c2:32, color:"#3b82f6", border:"#1d4ed8", label:[], svg:"house" },
  { tile:B_BUDGET,  r1:31, r2:35, c1:39, c2:44, color:"#8b5cf6", border:"#6d28d9", label:["Budget","HQ"],     svg:"cabin" },
  { tile:B_SAVINGS, r1:24, r2:28, c1:5,  c2:10, color:"#f59e0b", border:"#b45309", label:["Community","Cottage"],  svg:"tallcabin" },
  { tile:B_TAX,     r1:9,  r2:13, c1:60, c2:65, color:"#ef4444", border:"#b91c1c", label:["The","Bank"],    svg:"tallhouse" },
  { tile:B_MARKET,  r1:38, r2:42, c1:66, c2:71, color:"#10b981", border:"#065f46", label:["Market"],          svg:"markethouse" },
]
const ENTRANCES = [
  { name:"Income Center", wx:30*TS, wy:24*TS },
  { name:"Budget HQ",     wx:42*TS, wy:36*TS },
  { name:"Community Cottage", wx:8*TS,  wy:29*TS },
  { name:"The Bank",      wx:63*TS, wy:14*TS },
  { name:"Market",        wx:69*TS, wy:43*TS },
]

// ─── Map generation ───────────────────────────────────────────────────────────
const GRASS_LAYER: number[][] = []
const FLOWER_MAP:  boolean[][] = []

function buildMap(): TileID[][] {
  const m: TileID[][] = Array.from({length:MAP_H}, () => new Array<TileID>(MAP_W).fill(WATER))
  const fill = (r1:number, r2:number, c1:number, c2:number, t:TileID) => {
    for (let r=Math.max(0,r1); r<=Math.min(MAP_H-1,r2); r++)
      for (let c=Math.max(0,c1); c<=Math.min(MAP_W-1,c2); c++) m[r][c]=t
  }
  const diag = (r1:number, c1:number, r2:number, c2:number, t:TileID) => {
    const dr=r2-r1, dc=c2-c1, steps=Math.max(Math.abs(dr),Math.abs(dc))
    for (let i=0; i<=steps; i++) {
      const r=Math.round(r1+dr*i/steps), c=Math.round(c1+dc*i/steps)
      if (r>=0&&r<MAP_H&&c>=0&&c<MAP_W) m[r][c]=t
      if (Math.abs(dc)>=Math.abs(dr)) { if (r+1>=0&&r+1<MAP_H&&c>=0&&c<MAP_W) m[r+1][c]=t }
      else { if (r>=0&&r<MAP_H&&c+1>=0&&c+1<MAP_W) m[r][c+1]=t }
    }
  }
  for (let r=0; r<MAP_H; r++) for (let c=0; c<MAP_W; c++) if (isLand(r,c)) m[r][c]=GRASS
  // Split the main island: the north half (Income Center) sits 1 block higher,
  // the south half (Budget HQ, farm plot) sits 2 blocks lower, so the water
  // gap between them is wider than the original 2-row notch.
  for (let c=20; c<=54; c++) for (const rr of [24,25,26,27,28]) if (m[rr][c]===GRASS) m[rr][c]=WATER
  // Main island roads (interior, no water-edge bridge artifacts)
  fill(21,22,25,51,PATH)    // top horizontal road (cleanly inland c=25–51)
  fill(30,31,22,54,PATH)    // bottom horizontal road (inland c=22–54)
  fill(21,31,40,41,PATH)    // interior vertical connector, bridges the split
  fill(26,30,36,46,PATH)    // wide patch above Budget HQ, connects to the bridge
  fill(18,21,29,30,PATH); fill(18,18,29,33,PATH)
  fill(30,36,43,44,PATH); fill(30,30,38,44,PATH)
  fill(26,29,9,14,PATH);  fill(23,26,7,8,PATH);   fill(23,23,7,11,PATH)
  fill(10,15,56,58,PATH); fill(10,10,56,63,PATH)
  fill(40,43,62,64,PATH); fill(40,40,62,69,PATH);  fill(39,40,62,63,PATH)
  {
    const scatter = (r:number, c:number, pct:number) => {
      if (r<0||r>=MAP_H||c<0||c>=MAP_W||m[r][c]!==PATH) return
      let pn=0
      if (m[r-1]?.[c]===PATH) pn++; if (m[r+1]?.[c]===PATH) pn++
      if (m[r]?.[c-1]===PATH) pn++; if (m[r]?.[c+1]===PATH) pn++
      if (pn>=3) return
      if (((r*1337+c*7919)%100)/100 < pct) m[r][c]=GRASS
    }
    for (const b of BUILDING_DEFS) {
      const {r1,r2,c1,c2}=b
      fill(r1-3,r1-1,c1-1,c2+1,PATH)
      fill(r1,r2,c1-1,c1-1,PATH)
      fill(r1,r2,c2+1,c2+1,PATH)
      fill(r2+1,r2+2,c1-2,c2+2,PATH)
      for (let c=c1-2; c<=c2+2; c++) {
        scatter(r2+2,c,0.42)
        if (c<c1-1||c>c2+1) scatter(r2+1,c,0.55)
      }
    }
  }
  for (const b of BUILDING_DEFS) fill(b.r1,b.r2,b.c1,b.c2,b.tile)
  // Remove floating bridge planks above Income Center (building surround put PATH in water zone)
  fill(16,16,26,28,WATER)
  fill(17,17,26,27,WATER)
  // Trim stray shoreline nubs poking out from the island wobble shape
  fill(18,18,11,13,WATER)   // small north nub above Savings Bank island
  fill(9,14,69,71,WATER)    // east-side bulge on Tax Office island
  // Extend the main island's north cape toward the little stepping-stone
  // island, tapering as it goes, fills in the ragged edge without touching
  // it. Only turns WATER into GRASS so it never overwrites the road.
  {
    const growLand = (r1:number, r2:number, c1:number, c2:number) => {
      for (let r=r1; r<=r2; r++) for (let c=c1; c<=c2; c++) if (m[r][c]===WATER) m[r][c]=GRASS
    }
    growLand(20,22,44,51)
    growLand(18,19,44,51)
    growLand(16,17,45,50)
    growLand(14,15,46,49)
  }
  // Inter-island bridge tiles (see BRIDGES/drawBridges below) stay WATER here;
  // they're drawn as wooden bridge sprites over the water, not sandy path.
  // Decorative patches: small grass tufts inside courtyards and sandy
  // patches inside grass fields, for visual variety.
  {
    const patch = (cells:[number,number][], t:TileID) => { for (const [r,c] of cells) m[r][c]=t }
    patch([[21,4],[22,4],[22,5],[23,4],[24,4],[25,4],[26,4],[27,4],[28,4]], GRASS) // Savings Bank courtyard, west side
    patch([[16,38],[17,38],[17,39],[18,38]], PATH)   // Income Center field, west patch
    patch([[17,48],[17,49],[18,48]], PATH)           // Income Center field, east patch
    patch([[29,40],[29,41],[30,40],[30,41]], GRASS)  // bridge over the split, grass tuft
    patch([[35,33],[35,34],[36,33],[36,34]], PATH)   // Budget HQ / farm courtyard, near Bink
    patch([[6,60],[6,61],[7,61]], GRASS)             // Tax Office courtyard, north patch
    patch([[14,63],[15,63]], GRASS)                  // Tax Office courtyard, south patch
    patch([[35,68],[35,69],[36,68]], GRASS)          // Market courtyard, north patch
    patch([[29,27],[29,28]], PATH)                   // Budget HQ / farm courtyard, west patch
    patch([[29,34],[29,35]], PATH)                   // Budget HQ / farm courtyard, middle patch
    patch([[29,36],[29,37]], PATH)                   // Budget HQ / farm courtyard, east patch
  }
  for (let r=0; r<MAP_H; r++) { GRASS_LAYER.push(new Array(MAP_W).fill(0)); FLOWER_MAP.push(new Array(MAP_W).fill(false)) }
  const seeds: {r:number;c:number;type:number}[] = []
  const prng = (n:number) => ((n*1664525+1013904223)&0xffffffff)>>>0
  let state=42
  for (let i=0; i<35; i++) {
    state=prng(state); const r=(state%MAP_H+MAP_H)%MAP_H
    state=prng(state); const c=(state%MAP_W+MAP_W)%MAP_W
    state=prng(state); const type=state%6
    seeds.push({r,c,type})
  }
  for (let r=0; r<MAP_H; r++) for (let c=0; c<MAP_W; c++) {
    if (m[r][c]!==GRASS&&m[r][c]!==FLOWER) continue
    let best=Infinity, bestType=0
    for (const s of seeds) { const d=(r-s.r)**2+(c-s.c)**2; if (d<best) { best=d; bestType=s.type } }
    GRASS_LAYER[r][c]=bestType
  }
  const flowerCenters=[[17,4],[19,14],[22,32],[35,30],[37,50],[13,68],[7,67],[42,74],[41,52],[21,25]]
  for (const [fr,fc] of flowerCenters) {
    for (let r=fr-5; r<=fr+5; r++) for (let c=fc-5; c<=fc+5; c++) {
      if (r<0||r>=MAP_H||c<0||c>=MAP_W||m[r][c]!==GRASS) continue
      const dist=Math.sqrt((r-fr)**2+(c-fc)**2); if (dist>5) continue
      let tooClose=false
      for (let dr=-1; dr<=1&&!tooClose; dr++) for (let dc=-1; dc<=1&&!tooClose; dc++) {
        const nr=r+dr, nc=c+dc; if (nr<0||nr>=MAP_H||nc<0||nc>=MAP_W) continue
        const t=m[nr][nc]; if (t===PATH||t>=B_INCOME||t===WATER) tooClose=true
      }
      if (tooClose) continue
      const prob=1-dist/5, hash=((r*1337+c*7919)%100)/100
      if (hash < prob*0.7) FLOWER_MAP[r][c]=true
    }
  }
  return m
}
const MAP = buildMap()

// ─── Grass edge tiles (border water) ──────────────────────────────────────────
const GRASS_EDGE: boolean[][] = (() => {
  const edge = Array.from({length:MAP_H}, () => new Array<boolean>(MAP_W).fill(false))
  for (let r=0; r<MAP_H; r++) for (let c=0; c<MAP_W; c++) {
    if (MAP[r][c]!==GRASS) continue
    const nbrs = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
    if (nbrs.some(([nr,nc]) => nr>=0&&nr<MAP_H&&nc>=0&&nc<MAP_W&&MAP[nr][nc]===WATER)) edge[r][c]=true
  }
  return edge
})()

// ─── Path edge tiles (border water directly; wet grass alone doesn't count) ──
const PATH_EDGE: boolean[][] = (() => {
  const edge = Array.from({length:MAP_H}, () => new Array<boolean>(MAP_W).fill(false))
  for (let r=0; r<MAP_H; r++) for (let c=0; c<MAP_W; c++) {
    if (MAP[r][c]!==PATH) continue
    const nbrs = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
    if (nbrs.some(([nr,nc]) => nr>=0&&nr<MAP_H&&nc>=0&&nc<MAP_W&&MAP[nr][nc]===WATER)) edge[r][c]=true
  }
  return edge
})()

// ─── Image loading ────────────────────────────────────────────────────────────
async function loadImages(): Promise<ImgMap> {
  const pngNames=["grass1","grass2","grass3","grass4","grass5","grass6","grassflower1","grassflower2","path1","path2","path3","path4","path5","path6","water1","water2"]
  const woodSvgNames=["house","cabin","tallcabin","tallhouse","markethouse"]
  const imgs: ImgMap = {}
  return Promise.all([
    ...pngNames.map(n=>new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs[n]=img;res()};img.onerror=()=>res();img.src=`/${n}.png`})),
    ...woodSvgNames.map(n=>new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs[n]=img;res()};img.onerror=()=>res();img.src=`/woodbuildings/${n}.svg`})),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["bridgePiece"]=img;res()};img.onerror=()=>res();img.src="/bridge-piece.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["berry"]=img;res()};img.onerror=()=>res();img.src="/strawberry.svg"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["apple"]=img;res()};img.onerror=()=>res();img.src="/apple.svg"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["bread"]=img;res()};img.onerror=()=>res();img.src="/bread.svg"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["coin"]=img;res()};img.onerror=()=>res();img.src="/coin.svg"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["treeApples"]=img;res()};img.onerror=()=>res();img.src="/treeApples.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["treeNoApples"]=img;res()};img.onerror=()=>res();img.src="/treeNoApples.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["bushBerry"]=img;res()};img.onerror=()=>res();img.src="/BushBerry.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["bushNoBerry"]=img;res()};img.onerror=()=>res();img.src="/BushNoBerry.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["outdoorDecor"]=img;res()};img.onerror=()=>res();img.src="/Outdoor decoration/Outdoor_Decor_Free.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["biomThings"]=img;res()};img.onerror=()=>res();img.src="/Basic_Grass_Biom_things.png"}),
  ]).then(()=>imgs)
}

// ─── Tile selectors ───────────────────────────────────────────────────────────
function grassImg(imgs:ImgMap,r:number,c:number){return imgs[`grass${(GRASS_LAYER[r]?.[c]??0)+1}`]??null}
function flowerImg(imgs:ImgMap,r:number,c:number){return imgs[`grassflower${((r*7+c*13)%2)+1}`]??null}
function waterImg(imgs:ImgMap,frame:number,r:number,c:number){return imgs[`water${Math.floor(frame/25+Math.floor((r+c)*0.4))%2+1}`]??null}
function pathImg(imgs:ImgMap,r:number,c:number){
  const isPath=(nr:number,nc:number)=>nr>=0&&nr<MAP_H&&nc>=0&&nc<MAP_W&&MAP[nr][nc]===PATH
  const u=isPath(r-1,c),d=isPath(r+1,c),l=isPath(r,c-1),ri=isPath(r,c+1)
  const sides=[u,d,l,ri].filter(Boolean).length
  let v:string
  if(sides===4||(u&&d&&l)||(u&&d&&ri)||(u&&l&&ri)||(d&&l&&ri)){const h=(r*7+c*13)%3;v=h===0?"path5":h===1?"path6":"path1"}
  else if(sides<=1){v=((r*3+c*5)%5===0)?"path2":"path1"}
  else{const h=(r*11+c*7)%10;v=h===0?"path3":h===1?"path4":h===2?"path2":"path1"}
  return imgs[v]??null
}

// ─── Collision ────────────────────────────────────────────────────────────────
interface BuildingBounds{wx1:number;wy1:number;wx2:number;wy2:number}
let BUILDING_PIXEL_BOUNDS:BuildingBounds[][]=[]
function buildingRects(svg:string,ox:number,oy:number,dw:number,dh:number):BuildingBounds[]{
  switch(svg){
    case"house":case"cabin":return[
      {wx1:ox+dw*0.18,wy1:oy+dh*0.30,wx2:ox+dw*0.82,wy2:oy+dh*0.50},
      {wx1:ox+dw*0.04,wy1:oy+dh*0.50,wx2:ox+dw*0.96,wy2:oy+dh},
    ]
    case"tallhouse":return[
      {wx1:ox+dw*0.14,wy1:oy+dh*0.28,wx2:ox+dw*0.86,wy2:oy+dh*0.52},
      {wx1:ox+dw*0.04,wy1:oy+dh*0.52,wx2:ox+dw*0.96,wy2:oy+dh},
    ]
    case"tallcabin":return[
      {wx1:ox+dw*0.10,wy1:oy+dh*0.25,wx2:ox+dw*0.90,wy2:oy+dh*0.50},
      {wx1:ox+dw*0.04,wy1:oy+dh*0.50,wx2:ox+dw*0.96,wy2:oy+dh},
    ]
    default:return[{wx1:ox,wy1:oy,wx2:ox+dw,wy2:oy+dh}]
  }
}
function computeBuildingBounds(imgs:ImgMap){
  BUILDING_PIXEL_BOUNDS=BUILDING_DEFS.map(b=>{
    const bw=(b.c2-b.c1+1)*TS,bh=(b.r2-b.r1+1)*TS
    const svgImg=imgs[b.svg]
    if(!svgImg)return[{wx1:b.c1*TS,wy1:b.r1*TS,wx2:(b.c2+1)*TS,wy2:(b.r2+1)*TS}]
    const iw=svgImg.naturalWidth||bw,ih=svgImg.naturalHeight||bh
    const scale=Math.min(bw/iw,bh/ih),dw=iw*scale,dh=ih*scale
    const ox=b.c1*TS+(bw-dw)/2,oy=b.r1*TS+bh-dh
    return buildingRects(b.svg,ox,oy,dw,dh)
  })
}
// ─── Inter-island bridges ───────────────────────────────────────────────────
// Bridges are built from a single repeatable tile (public/bridge-piece.png),
// laid end-to-end across the gap, no stretched single image. Four pieces
// fill the length of one game tile (each piece is TS/4 long along the
// bridge's direction of travel, TS across it); every piece is drawn rotated
// an extra 90° from its orientation's natural alignment.
//
// Each span is only a starting point (cx,cy) + direction — the actual
// length is discovered at load time by walking outward from that point
// while the map tile is still WATER, so the bridge (both its sprite and
// its walkable footprint) stops exactly at the shoreline: never spilling
// onto land, and never wider than the single tile row/column it walks.
const BRIDGE_PIECES_PER_TILE=4  // bridge-piece.png tiles per game-tile, lengthwise
const BRIDGE_PIECE_LEN=TS/BRIDGE_PIECES_PER_TILE // px length of one piece along the bridge
interface BridgeSpan{cx:number;cy:number;orientation:"h"|"v"}
const BRIDGES: BridgeSpan[] = [
  {cx:19,   cy:22.5, orientation:"h"}, // Community Cottage island <-> main island, upper crossing
  {cx:18.5, cy:29.5, orientation:"h"}, // Community Cottage island <-> main island, lower crossing
  {cx:48,   cy:12.5, orientation:"v"}, // main island cape <-> little stepping-stone island
  {cx:53,   cy:9.5,  orientation:"h"}, // little stepping-stone island <-> Bank island
  {cx:60,   cy:33.5, orientation:"h"}, // main island <-> Market island
]
interface BridgeCell{r:number;c:number;orientation:"h"|"v"}
function bridgeCells(b:BridgeSpan):BridgeCell[]{
  if(b.orientation==="h"){
    const r=Math.floor(b.cy)
    let c0=Math.floor(b.cx),c1=c0
    while(c0>0&&MAP[r][c0-1]===WATER)c0--
    while(c1<MAP_W-1&&MAP[r][c1+1]===WATER)c1++
    const cells:BridgeCell[]=[];for(let c=c0;c<=c1;c++)cells.push({r,c,orientation:"h"});return cells
  }
  const c=Math.floor(b.cx)
  let r0=Math.floor(b.cy),r1=r0
  while(r0>0&&MAP[r0-1][c]===WATER)r0--
  while(r1<MAP_H-1&&MAP[r1+1][c]===WATER)r1++
  const cells:BridgeCell[]=[];for(let r=r0;r<=r1;r++)cells.push({r,c,orientation:"v"});return cells
}
const BRIDGE_CELLS: BridgeCell[] = BRIDGES.flatMap(bridgeCells)
const BRIDGE_TILES: Set<string> = new Set(BRIDGE_CELLS.map(({r,c})=>`${r},${c}`))
function drawBridges(ctx:CanvasRenderingContext2D,camX:number,camY:number,imgs:ImgMap){
  const img=imgs["bridgePiece"]
  if(!img)return
  for(const cell of BRIDGE_CELLS){
    // base orientation rotation (h:0°, v:90°) plus an extra 90° flip
    const rotation=(cell.orientation==="v"?Math.PI/2:0)+Math.PI/2
    for(let i=0;i<BRIDGE_PIECES_PER_TILE;i++){
      let wx:number,wy:number
      if(cell.orientation==="h"){
        wx=cell.c*TS+(i+0.5)*BRIDGE_PIECE_LEN
        wy=(cell.r+0.5)*TS
      }else{
        wx=(cell.c+0.5)*TS
        wy=cell.r*TS+(i+0.5)*BRIDGE_PIECE_LEN
      }
      ctx.save()
      ctx.translate(wx-camX,wy-camY)
      ctx.rotate(rotation)
      ctx.drawImage(img,-TS/2,-BRIDGE_PIECE_LEN/2,TS,BRIDGE_PIECE_LEN)
      ctx.restore()
    }
  }
}
function isBlocking(wx:number,wy:number):boolean{
  const c=Math.floor(wx/TS),r=Math.floor(wy/TS)
  if(r<0||r>=MAP_H||c<0||c>=MAP_W)return true
  if(BRIDGE_TILES.has(`${r},${c}`))return false
  const t=MAP[r][c]
  if(t===WATER)return true
  if(t>=B_INCOME){
    const bi=BUILDING_DEFS.findIndex(b=>b.tile===t)
    if(bi<0)return false
    return BUILDING_PIXEL_BOUNDS[bi].some(rect=>wx>=rect.wx1&&wx<rect.wx2&&wy>=rect.wy1&&wy<rect.wy2)
  }
  return false
}

// ─── Ambient ground decor (mushrooms, fallen logs, lily pads) ─────────────────
// Sprites come from Basic_Grass_Grass_Biom_things.png, a 9x5 grid of 16px tiles.
// Row 1 cols 4-7: mushrooms. Row 3 col 6: fallen log. Row 5 cols 8-9: lily pads.
const BIOM_TS=16
const MUSHROOM_SRC=[3,4,5,6].map(ci=>({sx:ci*BIOM_TS,sy:0*BIOM_TS}))
const LOG_SRC={sx:5*BIOM_TS,sy:2*BIOM_TS}
const LILY_SRC=[7,8].map(ci=>({sx:ci*BIOM_TS,sy:4*BIOM_TS}))
function biomHash(r:number,c:number,salt:number){return ((r*92821+c*68917+salt*104729)%1000+1000)%1000}
// Ambient mushrooms are purely decorative (not the harvestable FoliageNode
// kind), but still get a tiny collision footprint so the player doesn't
// visually clip straight through them.
const AMBIENT_DECOR_HIT_R=3
interface DecorNode{wx:number;wy:number;variant:number}
// Buildings sit on their own tiles, so a GRASS tile right at their foot has
// no GRASS_EDGE flag — without this check ambient mushrooms can spawn
// jammed against a building wall, which reads as random clutter rather
// than natural ground decor.
const nearBuilding=(r:number,c:number)=>BUILDING_DEFS.some(b=>r>=b.r1-1&&r<=b.r2+1&&c>=b.c1-1&&c<=b.c2+1)
const MUSHROOMS: DecorNode[] = (()=>{
  const nodes:DecorNode[]=[]
  for(let r=0;r<MAP_H;r++)for(let c=0;c<MAP_W;c++){
    if(MAP[r][c]!==GRASS||FLOWER_MAP[r]?.[c]||GRASS_EDGE[r]?.[c]||nearBuilding(r,c))continue
    if(biomHash(r,c,11)<15)nodes.push({wx:(c+0.5)*TS,wy:(r+0.55)*TS,variant:biomHash(r,c,23)%MUSHROOM_SRC.length})
  }
  return nodes
})()
interface WaterDecorNode{wx:number;wy:number;kind:"lily";variant:number}
const WATER_DECOR: WaterDecorNode[] = (()=>{
  const nodes:WaterDecorNode[]=[]
  for(let r=0;r<MAP_H;r++)for(let c=0;c<MAP_W;c++){
    if(MAP[r][c]!==WATER)continue
    const nearShore=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([nr,nc])=>nr>=0&&nr<MAP_H&&nc>=0&&nc<MAP_W&&(MAP[nr][nc]===GRASS||BRIDGE_TILES.has(`${nr},${nc}`)))
    if(nearShore&&biomHash(r,c,67)<140){
      nodes.push({wx:(c+0.5)*TS,wy:(r+0.5)*TS,kind:"lily",variant:biomHash(r,c,71)%LILY_SRC.length})
    }
  }
  return nodes
})()
interface LogNode{wx:number;wy:number}
function initLogs(foliage:FoliageNode[]):LogNode[]{
  const logs:LogNode[]=[]
  for(const t of foliage){
    if(t.type!=="tree")continue
    const h=biomHash(Math.round(t.wy/TS),Math.round(t.wx/TS),41)
    if(h>=500)continue // only about half the trees get a fallen log nearby
    const dc=h%2===0?1:-1, dr=Math.floor(h/2)%2===0?1:-1
    const c=Math.floor(t.wx/TS)+dc, r=Math.floor(t.wy/TS)+dr
    if(r<0||r>=MAP_H||c<0||c>=MAP_W||MAP[r][c]!==GRASS)continue
    const lx=(c+0.5)*TS, ly=(r+0.5)*TS
    if(foliage.some(n=>Math.hypot(n.wx-lx,n.wy-ly)<TS*0.8))continue
    logs.push({wx:lx,wy:ly})
  }
  return logs
}
function drawBiomDecor(ctx:CanvasRenderingContext2D,camX:number,camY:number,cw:number,ch:number,imgs:ImgMap,logs:LogNode[]){
  const img=imgs["biomThings"]
  if(!img)return
  const inView=(wx:number,wy:number)=>wx>camX-TS&&wx<camX+cw+TS&&wy>camY-TS&&wy<camY+ch+TS
  for(const n of WATER_DECOR){
    if(!inView(n.wx,n.wy))continue
    const src=LILY_SRC[n.variant]
    const dw=TS*0.55*1.8
    ctx.drawImage(img,src.sx,src.sy,BIOM_TS,BIOM_TS,n.wx-camX-dw/2,n.wy-camY-dw/2,dw,dw)
  }
  for(const n of MUSHROOMS){
    if(!inView(n.wx,n.wy))continue
    const src=MUSHROOM_SRC[n.variant]
    const dw=TS*0.55
    ctx.drawImage(img,src.sx,src.sy,BIOM_TS,BIOM_TS,n.wx-camX-dw/2,n.wy-camY-dw*0.9,dw,dw)
  }
  for(const n of logs){
    if(!inView(n.wx,n.wy))continue
    const dw=TS*0.9,dh=TS*0.5
    ctx.drawImage(img,LOG_SRC.sx,LOG_SRC.sy,BIOM_TS,BIOM_TS,n.wx-camX-dw/2,n.wy-camY-dh/2,dw,dh)
  }
}

function resolveMove(cx:number,cy:number,dx:number,dy:number){
  const pad=PLAYER_R-2
  const hx=isBlocking(cx+dx+pad,cy+pad)||isBlocking(cx+dx-pad,cy+pad)||isBlocking(cx+dx+pad,cy-pad)||isBlocking(cx+dx-pad,cy-pad)
  const hy=isBlocking(cx+pad,cy+dy+pad)||isBlocking(cx-pad,cy+dy+pad)||isBlocking(cx+pad,cy+dy-pad)||isBlocking(cx-pad,cy+dy-pad)
  return{x:Math.max(PLAYER_R,Math.min(MAP_W*TS-PLAYER_R,hx?cx:cx+dx)),y:Math.max(PLAYER_R,Math.min(MAP_H*TS-PLAYER_R,hy?cy:cy+dy))}
}
// Movement delta for this frame: click-and-hold pointer target takes priority
// over WASD/arrows (mirrors the diagonal-move feel; held pointer drives the
// player straight toward the world point last reported by the mouse/touch).
function computeMoveDelta(keys:Set<string>,spd:number,pointerDown:boolean,px:number,py:number,tx:number,ty:number){
  if(pointerDown){
    const ddx=tx-px,ddy=ty-py,dist=Math.hypot(ddx,ddy)
    if(dist<2)return{dx:0,dy:0}
    const s=Math.min(spd,dist)
    return{dx:ddx/dist*s,dy:ddy/dist*s}
  }
  let dx=0,dy=0
  if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A"))dx-=spd
  if(keys.has("ArrowRight")||keys.has("d")||keys.has("D"))dx+=spd
  if(keys.has("ArrowUp")||keys.has("w")||keys.has("W"))dy-=spd
  if(keys.has("ArrowDown")||keys.has("s")||keys.has("S"))dy+=spd
  if(dx&&dy){dx*=0.707;dy*=0.707}
  return{dx,dy}
}

// ─── NPC system ───────────────────────────────────────────────────────────────
interface NpcState{
  x:number;y:number;tx:number;ty:number;wait:number
  color:string;border:string
  bx1:number;bx2:number;by1:number;by2:number
  tradesDone:number;tradeTimer:number
  isTipNpc:boolean;tipUsed:boolean
  isMarket:boolean
}
function initNpcs(variant:MapVariant):NpcState[]{
  const W=2
  const npcs:NpcState[]=[
    {x:43.5*TS,y:36.5*TS,tx:43.5*TS,ty:36.5*TS,wait:60,color:"#8b5cf6",border:"#6d28d9",bx1:(39-W)*TS,bx2:(44+1+W)*TS,by1:(31-W)*TS,by2:(35+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:false,tipUsed:false,isMarket:false},
    {x:11.5*TS,y:29.5*TS,tx:11.5*TS,ty:29.5*TS,wait:60,color:"#f59e0b",border:"#b45309",bx1:(5-W)*TS,bx2:(10+1+W)*TS,by1:(24-W)*TS,by2:(28+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:false,tipUsed:false,isMarket:false},
    {x:57.5*TS,y:14.5*TS,tx:57.5*TS,ty:14.5*TS,wait:60,color:"#ef4444",border:"#b91c1c",bx1:(60-W)*TS,bx2:(65+1+W)*TS,by1:(9-W)*TS,by2:(13+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:false,tipUsed:false,isMarket:false},
    {x:63.5*TS,y:43.5*TS,tx:63.5*TS,ty:43.5*TS,wait:60,color:"#10b981",border:"#065f46",bx1:(66-W)*TS,bx2:(71+1+W)*TS,by1:(38-W)*TS,by2:(42+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:true,tipUsed:false,isMarket:false},
  ]
  if(variant==="lessonInvest"){
    // Port Trader (index 4), stays near the dock on the north shore
    npcs.push({x:LIV_PORT_X,y:LIV_PORT_Y,tx:LIV_PORT_X,ty:LIV_PORT_Y,wait:30,color:"#0d9488",border:"#0f766e",bx1:LIV_PORT_X-TS,bx2:LIV_PORT_X+TS,by1:LIV_PORT_Y-TS,by2:LIV_PORT_Y+TS,tradesDone:0,tradeTimer:0,isTipNpc:false,tipUsed:false,isMarket:false})
  }
  return npcs
}
function updateNpcs(npcs:NpcState[],frozenIdx=-1){
  for(let ni=0;ni<npcs.length;ni++){
    const n=npcs[ni]
    if(n.tradeTimer>0){n.tradeTimer--;if(n.tradeTimer===0){n.tradesDone=0;n.tipUsed=false}}
    if(ni===frozenIdx)continue
    if(n.wait>0){n.wait--;continue}
    const dx=n.tx-n.x,dy=n.ty-n.y,dist=Math.sqrt(dx*dx+dy*dy)
    if(dist<2){
      n.wait=90+Math.floor(Math.random()*120)
      let picked=false
      for(let i=0;i<30;i++){
        const rx=n.bx1+Math.random()*(n.bx2-n.bx1),ry=n.by1+Math.random()*(n.by2-n.by1)
        if(!isBlocking(rx,ry)&&!isBlocking(rx+NPC_HALF,ry+NPC_HALF)&&!isBlocking(rx-NPC_HALF,ry-NPC_HALF)){n.tx=rx;n.ty=ry;picked=true;break}
      }
      if(!picked){n.tx=n.x;n.ty=n.y}
    }else{
      const spd=Math.min(NPC_SPEED,dist)
      const nx=n.x+dx/dist*spd,ny=n.y+dy/dist*spd
      const blocked=isBlocking(nx+NPC_HALF,ny+NPC_HALF)||isBlocking(nx-NPC_HALF,ny+NPC_HALF)||isBlocking(nx+NPC_HALF,ny-NPC_HALF)||isBlocking(nx-NPC_HALF,ny-NPC_HALF)
      if(!blocked){n.x=nx;n.y=ny}else{n.wait=30;n.tx=n.x;n.ty=n.y}
    }
  }
}
function drawNpcs(ctx:CanvasRenderingContext2D,npcs:NpcState[],camX:number,camY:number,maxTrades:number){
  for(const n of npcs){
    const sx=Math.round(n.x-camX),sy=Math.round(n.y-camY)
    ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(sx-NPC_HALF+2,sy+NPC_HALF,NPC_HALF*2-2,3)
    ctx.fillStyle=n.color;ctx.fillRect(sx-NPC_HALF,sy-NPC_HALF,NPC_HALF*2,NPC_HALF*2)
    ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillRect(sx-NPC_HALF+1,sy-NPC_HALF+1,NPC_HALF-1,NPC_HALF-1)
    ctx.strokeStyle=n.border;ctx.lineWidth=1.5;ctx.strokeRect(sx-NPC_HALF,sy-NPC_HALF,NPC_HALF*2,NPC_HALF*2)
    if(n.isMarket){
      ctx.fillStyle="#fff";ctx.font="bold 7px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
      ctx.fillText("🏪",sx,sy)
    }
    if(!n.isMarket&&n.tradesDone>=maxTrades&&n.tradeTimer>0){
      ctx.fillStyle="rgba(0,0,0,0.55)";ctx.font="8px monospace";ctx.textAlign="center";ctx.textBaseline="middle"
      const s=`${Math.ceil(n.tradeTimer/60)}s`;const tw=ctx.measureText(s).width
      ctx.fillRect(sx-tw/2-3,sy-NPC_HALF-14,tw+6,12)
      ctx.fillStyle="#f87171";ctx.fillText(s,sx,sy-NPC_HALF-8)
    }
  }
}

// ─── Bloo ─────────────────────────────────────────────────────────────────────
interface BlooState{x:number;y:number;tx:number;ty:number;wait:number}
function initBloo():BlooState{return{x:41*TS,y:21*TS,tx:41*TS,ty:21*TS,wait:30}}
function blooOnLand(wx:number,wy:number):boolean{
  const R=8
  return!isBlocking(wx+R,wy+R)&&!isBlocking(wx-R,wy+R)&&!isBlocking(wx+R,wy-R)&&!isBlocking(wx-R,wy-R)
}
function updateBloo(bloo:BlooState,variant:MapVariant,stage:number,px:number,py:number){
  if(variant==="lesson1"&&stage===L1_SELL_INTRO){
    const dx=px-bloo.x,dy=py-bloo.y,dist=Math.sqrt(dx*dx+dy*dy)
    if(dist>3){
      const spd=Math.min(1.8,dist),nx=bloo.x+dx/dist*spd,ny=bloo.y+dy/dist*spd
      if(blooOnLand(nx,ny)){bloo.x=nx;bloo.y=ny}
    }
    return
  }
  let homeX=41*TS,homeY=21*TS
  if(variant==="lesson1"&&stage>=L1_SELL_INTRO){homeX=ENTRANCES[4].wx;homeY=ENTRANCES[4].wy-TS}
  if(variant==="lessonInvest"&&stage>=LIV_TRADE){homeX=LIV_PORT_X;homeY=LIV_PORT_Y+TS}
  if(variant==="lessonFarm"){homeX=(FARM_PLOT_C1+FARM_PLOT_C2)/2*TS;homeY=(FARM_PLOT_R1+FARM_PLOT_R2)/2*TS}
  if(variant==="lessonFish"&&stage>=FISH_TO_PIER){homeX=FISH_PIER_X;homeY=FISH_PIER_Y+TS}
  if(bloo.wait>0){bloo.wait--;return}
  const dx=bloo.tx-bloo.x,dy=bloo.ty-bloo.y,dist=Math.sqrt(dx*dx+dy*dy)
  if(dist<2){
    bloo.wait=90+Math.floor(Math.random()*120)
    let picked=false
    for(let i=0;i<20;i++){
      const tx=homeX+(Math.random()*2-1)*2.5*TS,ty=homeY+(Math.random()*2-1)*2.5*TS
      if(blooOnLand(tx,ty)){bloo.tx=tx;bloo.ty=ty;picked=true;break}
    }
    if(!picked){bloo.tx=homeX;bloo.ty=homeY}
  }else{
    const spd=Math.min(1.2,dist),nx=bloo.x+dx/dist*spd,ny=bloo.y+dy/dist*spd
    if(blooOnLand(nx,ny)){bloo.x=nx;bloo.y=ny}else{bloo.wait=30;bloo.tx=bloo.x;bloo.ty=bloo.y}
  }
}
function drawBloo(ctx:CanvasRenderingContext2D,bloo:BlooState,camX:number,camY:number,nearPlayer:boolean){
  const sx=Math.round(bloo.x-camX),sy=Math.round(bloo.y-camY),S=10
  ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(sx-S+2,sy+S,S*2-2,3)
  ctx.fillStyle="#3b82f6";ctx.fillRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="rgba(255,255,255,0.45)";ctx.fillRect(sx-S+1,sy-S+1,S-1,S-1)
  ctx.strokeStyle=nearPlayer?"#93c5fd":"#1d4ed8";ctx.lineWidth=nearPlayer?2.5:1.5
  ctx.strokeRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="white";ctx.font="bold 11px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("B",sx,sy)
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.beginPath();ctx.roundRect(sx-24,sy-S-22,48,17,3);ctx.fill()
  ctx.fillStyle="#93c5fd";ctx.font="bold 9px sans-serif";ctx.fillText("Bloo",sx,sy-S-13)
}

// ─── Bink (lessonFarm) ────────────────────────────────────────────────────────
// Fixed spot guarding the farm plot, no wandering, so he's always easy to find.
function drawBink(ctx:CanvasRenderingContext2D,camX:number,camY:number,nearPlayer:boolean){
  const sx=Math.round(FARM_BINK_X-camX),sy=Math.round(FARM_BINK_Y-camY),S=11
  ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(sx-S+2,sy+S,S*2-2,3)
  ctx.fillStyle="#a855f7";ctx.fillRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="rgba(255,255,255,0.4)";ctx.fillRect(sx-S+1,sy-S+1,S-1,S-1)
  ctx.strokeStyle=nearPlayer?"#e9d5ff":"#7e22ce";ctx.lineWidth=nearPlayer?2.5:1.5
  ctx.strokeRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="white";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("Bi",sx,sy)
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.beginPath();ctx.roundRect(sx-24,sy-S-22,48,17,3);ctx.fill()
  ctx.fillStyle="#e9d5ff";ctx.font="bold 9px sans-serif";ctx.fillText("Bink",sx,sy-S-13)
}
// ─── Tallo (lessonFish) ───────────────────────────────────────────────────────
// Fixed spot on the path to the Market, no wandering, so he's easy to find.
function drawTallo(ctx:CanvasRenderingContext2D,camX:number,camY:number,nearPlayer:boolean){
  const sx=Math.round(FISH_TALLO_X-camX),sy=Math.round(FISH_TALLO_Y-camY),S=11
  ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(sx-S+2,sy+S,S*2-2,3)
  ctx.fillStyle="#0ea5e9";ctx.fillRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="rgba(255,255,255,0.4)";ctx.fillRect(sx-S+1,sy-S+1,S-1,S-1)
  ctx.strokeStyle=nearPlayer?"#bae6fd":"#0369a1";ctx.lineWidth=nearPlayer?2.5:1.5
  ctx.strokeRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="white";ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("Ta",sx,sy)
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.beginPath();ctx.roundRect(sx-24,sy-S-22,48,17,3);ctx.fill()
  ctx.fillStyle="#bae6fd";ctx.font="bold 9px sans-serif";ctx.fillText("Tallo",sx,sy-S-13)
}
// Weeds sprite = row 1, column 3 of the Outdoor_Decor_Free tileset (16px tiles).
const WEEDS_SX=32, WEEDS_SY=0, WEEDS_SW=16, WEEDS_SH=16
function drawFarmPlot(ctx:CanvasRenderingContext2D,camX:number,camY:number,rowsPlanted:boolean[],rowsHarvested:boolean[],plotUnlocked:boolean,imgs:ImgMap){
  const weedsImg=imgs["outdoorDecor"]
  for(let r=FARM_PLOT_R1;r<=FARM_PLOT_R2;r++){
    for(let c=FARM_PLOT_C1;c<=FARM_PLOT_C2;c++){
      const sx=c*TS-camX, sy=r*TS-camY
      ctx.fillStyle=FARM_SOIL_TILE_COLOR; ctx.fillRect(sx,sy,TS,TS)
      const rowIdx=r-FARM_PLOT_R1
      if(!plotUnlocked){
        // Overgrown until the player buys weed-eating bugs at the Market.
        if(weedsImg)ctx.drawImage(weedsImg,WEEDS_SX,WEEDS_SY,WEEDS_SW,WEEDS_SH,sx,sy,TS,TS)
      }else if(rowsHarvested[rowIdx]){
        ctx.fillStyle="#a16207";ctx.font="13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
        ctx.fillText("✅",sx+TS/2,sy+TS/2)
      }else if(rowsPlanted[rowIdx]){
        ctx.fillStyle="#22c55e";ctx.font="14px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
        ctx.fillText("🌱",sx+TS/2,sy+TS/2)
      }
    }
  }
  const x=FARM_PLOT_C1*TS-camX, y=FARM_PLOT_R1*TS-camY
  const w=(FARM_PLOT_C2-FARM_PLOT_C1+1)*TS, h=(FARM_PLOT_R2-FARM_PLOT_R1+1)*TS
  ctx.strokeStyle="#d2b48c"; ctx.lineWidth=4; ctx.strokeRect(x,y,w,h)
  // Faint divider lines between rows, since planting works one row at a time.
  ctx.strokeStyle="rgba(210,180,140,0.5)";ctx.lineWidth=1
  for(let r=FARM_PLOT_R1+1;r<=FARM_PLOT_R2;r++){
    const ry=r*TS-camY
    ctx.beginPath();ctx.moveTo(x,ry);ctx.lineTo(x+w,ry);ctx.stroke()
  }
}

// ─── Foliage ──────────────────────────────────────────────────────────────────
type FoliageType="tree"|"bush"|"mushroom"|"wood"
interface FoliageNode{wx:number;wy:number;type:FoliageType;hasFruit:boolean;regenTimer:number}
// Shared per-type lookups so the ~10 duplicated harvest/collision call sites
// (one per lesson variant) never have to repeat these ternaries themselves.
function foliageHitR(type:FoliageType):number{
  return type==="tree"?TREE_HIT_R:type==="bush"?BUSH_HIT_R:type==="mushroom"?MUSHROOM_HIT_R:WOOD_HIT_R
}
function foliageHitOY(type:FoliageType):number{
  return type==="tree"?TREE_HIT_OY:type==="bush"?BUSH_HIT_OY:type==="mushroom"?MUSHROOM_HIT_OY:WOOD_HIT_OY
}
function foliageLabel(type:FoliageType):string{
  return type==="tree"?"Tree":type==="bush"?"Bush":type==="mushroom"?"Mushroom":"Wood"
}
function foliageItemName(type:FoliageType):string{
  return type==="tree"?"apples":type==="bush"?"berries":type==="mushroom"?"mushrooms":"wood"
}
function initFoliage():FoliageNode[]{
  const nodes:FoliageNode[]=[],MIN_GAP=2*TS
  const tryPlace=(c:number,r:number,type:FoliageType)=>{
    if(r<0||r>=MAP_H||c<0||c>=MAP_W)return
    if(MAP[r][c]!==GRASS)return
    const wx=(c+0.5)*TS,wy=(r+0.5)*TS
    if(nodes.some(n=>Math.hypot(n.wx-wx,n.wy-wy)<MIN_GAP))return
    nodes.push({wx,wy,type,hasFruit:true,regenTimer:0})
  }
  // Income Center / Town / Cottage / Budget HQ side of the island reads
  // red-dot-dominant in the reference screenshot → mostly mushrooms.
  // The Bank / Market side reads green-dot-dominant → mostly wood.
  tryPlace(22,16,"tree");tryPlace(24,17,"bush");tryPlace(21,19,"bush");tryPlace(23,15,"mushroom")
  tryPlace(48,16,"tree");tryPlace(51,17,"tree");tryPlace(46,18,"bush");tryPlace(52,19,"bush");tryPlace(49,15,"mushroom")
  tryPlace(22,25,"tree");tryPlace(25,26,"bush");tryPlace(23,29,"bush");tryPlace(24,24,"mushroom")
  tryPlace(50,23,"tree");tryPlace(53,25,"bush");tryPlace(48,26,"bush");tryPlace(52,29,"tree");tryPlace(51,22,"mushroom")
  tryPlace(23,33,"tree");tryPlace(26,35,"bush");tryPlace(22,36,"bush");tryPlace(25,38,"tree");tryPlace(24,32,"mushroom")
  tryPlace(51,34,"tree");tryPlace(49,36,"bush");tryPlace(53,38,"tree");tryPlace(51,39,"bush");tryPlace(50,33,"mushroom")
  tryPlace(34,41,"tree");tryPlace(38,43,"bush");tryPlace(33,43,"bush");tryPlace(36,40,"mushroom")
  tryPlace(6,20,"tree");tryPlace(10,21,"bush");tryPlace(13,20,"bush");tryPlace(8,19,"mushroom")
  tryPlace(4,31,"tree");tryPlace(11,30,"bush");tryPlace(7,32,"bush");tryPlace(9,29,"mushroom")
  tryPlace(60,6,"tree");tryPlace(65,5,"tree");tryPlace(62,7,"bush");tryPlace(67,7,"bush");tryPlace(63,5,"wood")
  tryPlace(58,16,"tree");tryPlace(66,15,"bush");tryPlace(64,17,"bush");tryPlace(60,15,"wood")
  tryPlace(66,34,"tree");tryPlace(72,35,"tree");tryPlace(69,33,"bush");tryPlace(73,36,"bush");tryPlace(70,32,"wood")
  tryPlace(66,45,"tree");tryPlace(71,46,"bush");tryPlace(68,47,"bush");tryPlace(69,45,"wood")
  return nodes
}
function drawFoliage(ctx:CanvasRenderingContext2D,foliage:FoliageNode[],camX:number,camY:number,cw:number,ch:number,imgs:ImgMap,nearNode:FoliageNode|null){
  const sorted=[...foliage].sort((a,b)=>a.wy-b.wy)
  for(const n of sorted){
    const sx=Math.round(n.wx-camX),sy=Math.round(n.wy-camY)
    if(n.type==="mushroom"||n.type==="wood"){
      const DW=22,DH=22
      if(sx+DW/2<0||sx-DW/2>cw||sy<-DH||sy>ch+DH)continue
      if(n.hasFruit){
        const biom=imgs["biomThings"]
        if(biom){
          const[bsx,bsy]=n.type==="mushroom"?MUSHROOM_SPRITE:WOOD_SPRITE
          ctx.drawImage(biom,bsx,bsy,16,16,Math.round(sx-DW/2),Math.round(sy-DH/2),DW,DH)
        }else{
          ctx.font="18px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
          ctx.fillText(n.type==="mushroom"?"🍄":"🪵",sx,sy)
        }
      }else{
        ctx.fillStyle="rgba(90,70,40,0.35)";ctx.beginPath();ctx.ellipse(sx,sy+4,9,4,0,0,Math.PI*2);ctx.fill()
      }
      continue
    }
    const isTree=n.type==="tree",DW=isTree?TREE_DW:BUSH_DW,DH=isTree?TREE_DH:BUSH_DH
    if(sx+DW/2<0||sx-DW/2>cw||sy<-DH||sy>ch+DH)continue
    const imgKey=isTree?(n.hasFruit?"treeApples":"treeNoApples"):(n.hasFruit?"bushBerry":"bushNoBerry")
    const foliageImg=imgs[imgKey]
    if(foliageImg){
      const nw=foliageImg.naturalWidth||DW,nh=foliageImg.naturalHeight||DH
      const scale=Math.min(DW/nw,DH/nh),dw=Math.round(nw*scale),dh=Math.round(nh*scale)
      ctx.drawImage(foliageImg,Math.round(sx-dw/2),Math.round(sy-dh),dw,dh)
    }else{
      ctx.fillStyle=n.hasFruit?(isTree?"#5a9e42":"#4a8e38"):(isTree?"#3a7a28":"#2e6020")
      ctx.beginPath();ctx.ellipse(sx,sy-(isTree?24:10),isTree?22:16,isTree?22:10,0,0,Math.PI*2);ctx.fill()
    }
    void nearNode
  }
}

// ─── Tile drawing helpers ─────────────────────────────────────────────────────
function blit(ctx:CanvasRenderingContext2D,img:HTMLImageElement,sx:number,sy:number){ctx.drawImage(img,sx,sy,TS,TS)}
function fbGrass(ctx:CanvasRenderingContext2D,sx:number,sy:number,r:number,c:number){const v=((r*17+c*31)%5)*6;ctx.fillStyle=`rgb(${72+v},${140+v},${48+v})`;ctx.fillRect(sx,sy,TS,TS)}
function fbWater(ctx:CanvasRenderingContext2D,sx:number,sy:number){ctx.fillStyle="#1565a8";ctx.fillRect(sx,sy,TS,TS)}
function fbPath(ctx:CanvasRenderingContext2D,sx:number,sy:number){ctx.fillStyle="#c9a96e";ctx.fillRect(sx,sy,TS,TS);ctx.fillStyle="#b99558";ctx.fillRect(sx+1,sy+1,TS-2,TS-2)}
function tintGrassEdge(ctx:CanvasRenderingContext2D,sx:number,sy:number){
  ctx.save()
  ctx.globalCompositeOperation="multiply"
  ctx.fillStyle="rgb(205,225,120)"
  ctx.fillRect(sx,sy,TS,TS)
  ctx.restore()
}
function tintPathEdge(ctx:CanvasRenderingContext2D,sx:number,sy:number){
  ctx.save()
  ctx.globalCompositeOperation="multiply"
  ctx.fillStyle="rgb(226,215,190)"
  ctx.fillRect(sx,sy,TS,TS)
  ctx.restore()
}
function drawBuildings(ctx:CanvasRenderingContext2D,camX:number,camY:number,cw:number,ch:number,imgs:ImgMap){
  for(const b of BUILDING_DEFS){
    const bx=b.c1*TS-camX,by=b.r1*TS-camY,bw=(b.c2-b.c1+1)*TS,bh=(b.r2-b.r1+1)*TS
    if(bx+bw<0||bx>cw||by+bh<0||by>ch)continue
    const svgImg=imgs[b.svg]
    if(svgImg){
      const iw=svgImg.naturalWidth||bw,ih=svgImg.naturalHeight||bh
      const scale=Math.min(bw/iw,bh/ih),dw=iw*scale,dh=ih*scale
      const ix=bx+(bw-dw)/2,iy=by+bh-dh
      ctx.save();ctx.beginPath();ctx.rect(bx,by,bw,bh);ctx.clip();ctx.drawImage(svgImg,ix,iy,dw,dh);ctx.restore()
    }
    if(b.label.length>0){
      const fs=Math.min(13,TS*0.45)
      ctx.font=`bold ${fs}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle"
      const cx2=bx+bw/2,lh=fs*1.4,labelY=by+bh+fs*0.9
      const maxW=b.label.reduce((mx,l)=>Math.max(mx,ctx.measureText(l).width),0)
      const pillW=maxW+20,pillH=b.label.length*lh+10
      ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(cx2-pillW/2,labelY-pillH/2,pillW,pillH,10);ctx.fill()
      ctx.strokeStyle=b.color;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(cx2-pillW/2,labelY-pillH/2,pillW,pillH,10);ctx.stroke()
      for(let i=0;i<b.label.length;i++){ctx.fillStyle=b.color;ctx.fillText(b.label[i],cx2,labelY+(i-(b.label.length-1)/2)*lh)}
    }
  }
}
// ─── Top bar ──────────────────────────────────────────────────────────────────
// Tabs shrink to fit narrow (phone/tablet) canvases; if they'd still be too
// cramped to read even at the minimum width, they wrap onto a second row
// instead of ever spilling past the canvas edge.
function drawTopBar(ctx:CanvasRenderingContext2D,cw:number,sustenance:number,inventory:Inventory,harvestCooldown:number,variant:MapVariant,gameStage:number,imgs:ImgMap,bandLeft?:number,bandRight?:number){
  void imgs
  const isL1=variant==="lesson1"
  const baseTabW=isL1?220:190, baseTabH=isL1?74:60
  const tabCount=2
  const GAP=8, MARGIN=8, MIN_TAB_W=118, BAR_Y=8

  // Confined to the band between the task sign (left) and the right edge
  // so the bar never overlaps the task sign, it just narrows/wraps
  // instead, the same way it already shrinks for narrow canvases.
  const bL=bandLeft??MARGIN, bR=bandRight??(cw-MARGIN)
  const avail=Math.max(0,bR-bL)
  let perRow=tabCount
  let tabW=Math.floor((avail-GAP*(tabCount-1))/tabCount)
  if(tabW<MIN_TAB_W){
    perRow=Math.max(1,Math.min(tabCount,Math.floor((avail+GAP)/(MIN_TAB_W+GAP))))
    tabW=Math.floor((avail-GAP*(perRow-1))/perRow)
  }
  tabW=Math.max(90,Math.min(baseTabW,tabW))
  const scale=Math.max(0.72,Math.min(1,tabW/baseTabW))
  const tabH=Math.round(baseTabH*scale)
  const fs=(n:number)=>Math.max(9,Math.round(n*scale))
  const pad=Math.max(6,Math.round(10*scale))

  const rowsCount=Math.ceil(tabCount/perRow)
  const tabPos:{x:number,y:number}[]=[]
  for(let row=0;row<rowsCount;row++){
    const count=Math.min(perRow,tabCount-row*perRow)
    const rowW=tabW*count+GAP*(count-1), rowStartX=Math.round(bL+(avail-rowW)/2)
    const rowY=BAR_Y+row*(tabH+GAP)
    for(let col=0;col<count;col++)tabPos.push({x:rowStartX+col*(tabW+GAP),y:rowY})
  }
  for(const{x,y}of tabPos){
    ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(x,y,tabW,tabH,14);ctx.fill()
    ctx.strokeStyle="#bfdbfe";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,tabW,tabH,14);ctx.stroke()
  }
  ctx.textBaseline="middle"
  // FOOD is always tab 0, hand its screen rect back so a click/tap on it
  // can be hit-tested against the food bar to trigger eating.
  const foodRect={x:tabPos[0].x,y:tabPos[0].y,w:tabW,h:tabH}

  // FOOD tab
  {
    const{x:tx,y:ty}=tabPos[0]
    const LBL_Y=ty+(isL1?13:11)*scale, BAR_TOP=ty+(isL1?28:22)*scale, VAL_Y=ty+(isL1?58:40)*scale, BAR_H=Math.max(5,Math.round((isL1?10:8)*scale))
    ctx.fillStyle="#1e40af";ctx.font=`bold ${fs(11)}px sans-serif`;ctx.textAlign="left"
    ctx.fillText("FOOD",tx+pad,LBL_Y)
    const onCD=harvestCooldown>0
    ctx.fillStyle=onCD?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.5)"
    ctx.font=`${fs(11)}px sans-serif`;ctx.textAlign="right"
    ctx.fillText(onCD?`[Z] ${(harvestCooldown/60).toFixed(1)}s`:"[Z] Harvest",tx+tabW-pad,LBL_Y)
    const pct=sustenance/SUSTENANCE_MAX
    const barColor=pct>0.5?"#4ade80":pct>0.25?"#facc15":pct>0.1?"#fb923c":"#f87171"
    const barW=tabW-pad*2
    ctx.fillStyle="rgba(0,0,0,0.1)";ctx.fillRect(tx+pad,BAR_TOP,barW,BAR_H)
    ctx.fillStyle=barColor;ctx.fillRect(tx+pad,BAR_TOP,Math.round(barW*pct),BAR_H)
    ctx.strokeStyle="rgba(0,0,0,0.15)";ctx.lineWidth=1;ctx.strokeRect(tx+pad,BAR_TOP,barW,BAR_H)
    ctx.fillStyle="rgba(0,0,0,0.65)";ctx.font=`${fs(11)}px sans-serif`;ctx.textAlign="left"
    ctx.fillText(`Energy: ${Math.ceil(sustenance)}%`,tx+pad,VAL_Y)
    const eatTxt="[X] Eat"
    const numFont=`${fs(11)}px sans-serif`
    ctx.font=numFont
    const eatW=ctx.measureText(eatTxt).width
    ctx.textAlign="left"
    ctx.fillStyle=(inventory.berries>0||inventory.apples>0)?"#1e293b":"rgba(0,0,0,0.3)"
    ctx.fillText(eatTxt,tx+tabW-pad-eatW,VAL_Y)
  }

  // COINS tab: just an icon + count, no goal bar/progress text.
  {
    const{x:tx,y:ty}=tabPos[1]
    const coinFont=`bold ${fs(22)}px sans-serif`,coinNum=String(inventory.coins),coinISZ=fs(22)
    ctx.font=coinFont
    const coinNumW=ctx.measureText(coinNum).width
    const groupW=imgs["coin"]?coinISZ+6+coinNumW:coinNumW
    let coinX=tx+tabW/2-groupW/2
    if(imgs["coin"]){ctx.drawImage(imgs["coin"],coinX,ty+38*scale-coinISZ/2,coinISZ,coinISZ);coinX+=coinISZ+6}
    ctx.fillStyle=inventory.coins<0?"#dc2626":"#1e293b";ctx.font=coinFont;ctx.textAlign="left"
    ctx.fillText(coinNum,coinX,ty+38*scale)
  }

  return foodRect
}

// ─── Task sign ────────────────────────────────────────────────────────────────
// Width shrinks on narrow canvases or when the minimap crowds it (rightLimit);
// text always wraps onto extra lines, and the box grows taller to fit them,
// staying pinned at (x,y), rather than ever widening into the minimap.
function drawTaskSign(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,cw:number,imgs?:ImgMap,rightLimit?:number){
  const small=cw<520
  const rLimit=rightLimit??(cw-x)
  // Scales continuously with screen width instead of jumping between two
  // fixed sizes, so the box keeps shrinking (and wrapping onto more lines)
  // as the window gets narrower rather than stalling at one "small" size.
  const TW=Math.max(140,Math.min(320,cw*0.55,rLimit-x))
  const tiny=TW<190
  const pad=tiny?6:small?8:10,lineH=tiny?13:small?14:16,fontPx=tiny?9:small?10:11
  const BERRY_TAG=":berry:"
  const hasBerry=text.startsWith(BERRY_TAG)
  const label=hasBerry?text.slice(BERRY_TAG.length):text
  const iSz=hasBerry?(small?14:16):0
  const textX=x+pad+(hasBerry?iSz+4:0)
  const maxW=TW-pad*2-(hasBerry?iSz+4:0)
  ctx.font=`bold ${fontPx}px sans-serif`
  const words=label.split(" ")
  const lines:string[]=[]
  let cur=""
  for(const w of words){const t=cur?`${cur} ${w}`:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}
  if(cur)lines.push(cur)
  const TH=Math.max(tiny?42:small?50:58,32+lines.length*lineH+pad)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(x,y,TW,TH,14);ctx.fill()
  ctx.strokeStyle="#bfdbfe";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,TW,TH,14);ctx.stroke()
  ctx.fillStyle="#1e40af";ctx.font=`bold ${fontPx}px sans-serif`;ctx.textAlign="left";ctx.textBaseline="middle"
  ctx.fillText("TASK",x+pad,y+13)
  ctx.save()
  ctx.beginPath();ctx.rect(x,y+24,TW,TH-24);ctx.clip()
  ctx.font=`bold ${fontPx}px sans-serif`;ctx.fillStyle="#1e293b";ctx.textAlign="left";ctx.textBaseline="middle"
  const startY=y+32+lineH/2
  lines.forEach((line,i)=>{
    const ly=startY+i*lineH
    if(i===0&&hasBerry&&imgs?.["berry"])ctx.drawImage(imgs["berry"],x+pad,ly-iSz/2,iSz,iSz)
    ctx.fillText(line,textX,ly)
  })
  ctx.restore()
}

// ─── Sell menu (lesson 1) ─────────────────────────────────────────────────────
interface SellMenuState{npcIdx:number;amount:number;phase:"select"|"result";resultLine:string;earnedCoins:number}
interface ItemPrices{berry:number;apple:number;mushroom:number;wood:number}
// Every lesson before lesson1's forage rework just sold everything at 1 coin
// flat, so this default reproduces that exactly for lessonBudget/lessonLoans.
const FLAT_SELL_PRICES:ItemPrices={berry:1,apple:1,mushroom:1,wood:1}
// Lesson 1 teaches that different goods are worth different amounts.
const L1_SELL_PRICES:ItemPrices={berry:1,apple:1,mushroom:3,wood:2}
// Selling draws from a combined pool across all 4 goods, spending in a fixed
// order (berries → apples → wood → mushrooms, saving the priciest for last)
// so the amount-picker UI stays a single number instead of four sliders.
function sellAllocation(amount:number,berries:number,apples:number,wood:number,mushrooms:number){
  let rem=amount
  const fromBerries=Math.min(rem,berries);rem-=fromBerries
  const fromApples=Math.min(rem,apples);rem-=fromApples
  const fromWood=Math.min(rem,wood);rem-=fromWood
  const fromMushrooms=Math.min(rem,mushrooms);rem-=fromMushrooms
  return{fromBerries,fromApples,fromWood,fromMushrooms}
}
function sellEarnings(alloc:{fromBerries:number;fromApples:number;fromWood:number;fromMushrooms:number},prices:ItemPrices){
  return alloc.fromBerries*prices.berry+alloc.fromApples*prices.apple+alloc.fromWood*prices.wood+alloc.fromMushrooms*prices.mushroom
}
function combinedGoods(inv:Inventory):number{return inv.berries+inv.apples+inv.wood+inv.mushrooms}
function drawSellMenu(ctx:CanvasRenderingContext2D,cw:number,ch:number,npcName:string,npcColor:string,menu:SellMenuState,playerBerries:number,playerApples:number,playerWood:number,playerMushrooms:number,npcCanBuy:number,isTipNpc:boolean,tipUsed:boolean,prices:ItemPrices=FLAT_SELL_PRICES){
  const playerGoods=playerBerries+playerApples+playerWood+playerMushrooms
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,cw,ch)
  const pw=Math.min(480,cw-40),ph=menu.phase==="result"?220:300
  const px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle=npcColor;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.fillStyle=npcColor;ctx.font="bold 16px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
  ctx.fillText(npcName,px+16,py+24)
  ctx.strokeStyle=`${npcColor}55`;ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(px+16,py+40);ctx.lineTo(px+pw-16,py+40);ctx.stroke()
  if(menu.phase==="result"){
    ctx.fillStyle="#444";ctx.font="14px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
    ctx.fillText(menu.resultLine,px+16,py+68)
    ctx.fillStyle="#16a34a";ctx.font="bold 18px sans-serif";ctx.textAlign="center"
    ctx.fillText(`Sold ${menu.amount} item${menu.amount===1?"":"s"} → 🪙 ${menu.earnedCoins}!`,cw/2,py+118)
    if(isTipNpc&&menu.earnedCoins>sellEarnings(sellAllocation(menu.amount,playerBerries,playerApples,playerWood,playerMushrooms),prices)){
      ctx.fillStyle="#ea580c";ctx.font="13px sans-serif"
      ctx.fillText("Keep the change! 🎉",cw/2,py+148)
    }
    ctx.fillStyle="#94a3b8";ctx.font="13px sans-serif"
    ctx.fillText("[Z] Done",cw/2,py+ph-20)
    return
  }
  const maxSell=Math.min(playerGoods,npcCanBuy),canSell=menu.amount>0&&maxSell>0
  const alloc=sellAllocation(menu.amount,playerBerries,playerApples,playerWood,playerMushrooms)
  ctx.fillStyle="rgba(0,0,0,0.45)";ctx.font="13px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
  ctx.fillText("Items to sell:",px+16,py+70)
  const scy=py+115,scx=cw/2
  ctx.fillStyle="rgba(0,0,0,0.06)";ctx.beginPath();ctx.roundRect(scx-90,scy-22,180,44,8);ctx.fill()
  ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillStyle=menu.amount<=0?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.6)"
  ctx.font="bold 20px sans-serif";ctx.fillText("◀",scx-60,scy)
  ctx.fillStyle=canSell?npcColor:npcCanBuy<=0?"#dc2626":"rgba(0,0,0,0.2)"
  ctx.font="bold 28px sans-serif";ctx.fillText(String(menu.amount),scx,scy)
  ctx.fillStyle=menu.amount>=maxSell?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.6)"
  ctx.font="bold 20px sans-serif";ctx.fillText("▶",scx+60,scy)
  ctx.fillStyle="rgba(0,0,0,0.22)";ctx.font="10px sans-serif"
  const breakdown=[alloc.fromBerries&&`${alloc.fromBerries} 🍓`,alloc.fromApples&&`${alloc.fromApples} 🍎`,alloc.fromWood&&`${alloc.fromWood} 🪵`,alloc.fromMushrooms&&`${alloc.fromMushrooms} 🍄`].filter(Boolean).join(" + ")
  ctx.fillText(canSell?`(${breakdown})`:"← → arrow keys",scx,scy+28)
  ctx.font="11px sans-serif";ctx.textBaseline="middle"
  ctx.fillStyle=playerGoods>0?"rgba(0,0,0,0.45)":"#dc2626";ctx.textAlign="left"
  ctx.fillText(`🍓${playerBerries} 🍎${playerApples} 🪵${playerWood} 🍄${playerMushrooms}`,px+16,py+168)
  ctx.fillStyle=npcCanBuy>0?"rgba(0,0,0,0.45)":"#dc2626";ctx.textAlign="right"
  ctx.fillText(`Limit: ${npcCanBuy}`,px+pw-16,py+168)
  ctx.strokeStyle="rgba(0,0,0,0.1)";ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(px+16,py+186);ctx.lineTo(px+pw-16,py+186);ctx.stroke()
  ctx.textAlign="center"
  if(npcCanBuy<=0){ctx.fillStyle="#dc2626";ctx.font="bold 13px sans-serif";ctx.fillText("All stocked up for now, come back later!",cw/2,py+212)}
  else if(playerGoods===0){ctx.fillStyle="#dc2626";ctx.font="bold 13px sans-serif";ctx.fillText("You have nothing to sell!",cw/2,py+212)}
  else if(canSell){
    let earnPreview=sellEarnings(alloc,prices)
    if(isTipNpc&&!tipUsed)earnPreview+=L1_TIP_COINS
    const tipNote=isTipNpc&&!tipUsed?", Keep the change! 🎉":""
    ctx.fillStyle="#16a34a";ctx.font="bold 14px sans-serif"
    ctx.fillText(`You'll earn: 🪙 ${earnPreview}${tipNote}`,cw/2,py+212)
  }else{ctx.fillStyle="rgba(0,0,0,0.3)";ctx.font="13px sans-serif";ctx.fillText("Use ← → to choose an amount",cw/2,py+212)}
  ctx.font="bold 13px sans-serif";ctx.textBaseline="middle"
  ctx.fillStyle=canSell?npcColor:"rgba(0,0,0,0.2)";ctx.textAlign="left"
  ctx.fillText("[Z] Sell",px+20,py+ph-20)
  ctx.fillStyle="#94a3b8";ctx.textAlign="right"
  ctx.fillText("[X] Cancel",px+pw-20,py+ph-20)
}

// ─── Notification banner ──────────────────────────────────────────────────────
function drawNotifBanner(ctx:CanvasRenderingContext2D,cw:number,ch:number,text:string,alpha:number){
  ctx.save();ctx.globalAlpha=alpha
  const small=cw<520
  ctx.font=`bold ${small?12:14}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle"
  const maxW=cw-32
  const lines=ctx.measureText(text).width<=maxW?[text]:wrapCanvasText(ctx,text,maxW)
  const tw=Math.min(maxW+32,Math.max(...lines.map(l=>ctx.measureText(l).width))+32)
  const lineH=small?18:20,bh=lineH*lines.length+18
  const bx=cw/2-tw/2,by=ch/2-110
  ctx.fillStyle="#1a3a0a";ctx.beginPath();ctx.roundRect(bx,by,tw,bh,6);ctx.fill()
  ctx.strokeStyle="#4ade80";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(bx,by,tw,bh,6);ctx.stroke()
  ctx.fillStyle="#86efac"
  const startY=by+bh/2-((lines.length-1)*lineH)/2
  lines.forEach((line,i)=>ctx.fillText(line,cw/2,startY+i*lineH))
  ctx.restore()
}

// ─── Day-over overlay ─────────────────────────────────────────────────────────
function drawDrops(ctx:CanvasRenderingContext2D,drops:{wx:number;wy:number;berries:number;apples:number;coins:number}[],camX:number,camY:number){
  for(const d of drops){
    const sx=Math.round(d.wx-camX),sy=Math.round(d.wy-camY)
    // pulsing glow
    ctx.fillStyle="rgba(255,220,50,0.9)";ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.fill()
    ctx.strokeStyle="#b45309";ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.stroke()
    ctx.fillStyle="#92400e";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
    ctx.fillText("!",sx,sy)
    const parts:string[]=[]
    if(d.berries>0)parts.push(`🍓${d.berries}`)
    if(d.apples>0)parts.push(`🍎${d.apples}`)
    if(d.coins>0)parts.push(`🪙${d.coins}`)
    if(parts.length===0)return
    const label=parts.join(" ")
    ctx.font="bold 10px sans-serif"
    const tw=ctx.measureText(label).width
    ctx.fillStyle="rgba(255,255,255,0.92)";ctx.beginPath();ctx.roundRect(sx-tw/2-4,sy-22,tw+8,14,4);ctx.fill()
    ctx.fillStyle="#1e293b";ctx.textBaseline="top";ctx.fillText(label,sx,sy-22)
  }
}

function drawDayOver(ctx:CanvasRenderingContext2D,cw:number,ch:number,dropped:{berries:number;apples:number;coins:number},lost:{berries:number;apples:number;coins:number}){
  ctx.fillStyle="rgba(0,0,0,0.72)";ctx.fillRect(0,0,cw,ch)
  const pw=400,ph=280,px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle="#6366f1";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.textAlign="center";ctx.textBaseline="middle"
  void dropped
  const hasLost=lost.berries>0||lost.apples>0||lost.coins>0

  // Stack of rows, vertically centered as a whole group within the card
  // (rather than each row pinned to a fixed y), so title/subtitle sit
  // lower and "Press R" sits higher when there's less content to show.
  const TITLE_H=40,GAP1=22,SUB_H=20,GAP2=hasLost?46:70,LOST_H=hasLost?34:0,GAP3=hasLost?40:0,PRESS_H=18
  const totalH=TITLE_H+GAP1+SUB_H+GAP2+LOST_H+GAP3+PRESS_H
  let y=py+(ph-totalH)/2+TITLE_H/2

  ctx.fillStyle="#dc2626";ctx.font="bold 34px sans-serif";ctx.fillText("💀 You Starved!",cw/2,y)
  y+=TITLE_H/2+GAP1+SUB_H/2
  ctx.fillStyle="#4b5563";ctx.font="14px sans-serif";ctx.fillText("You ran out of food, which caused you to lose a few coins.",cw/2,y)
  y+=SUB_H/2+GAP2
  if(hasLost){
    y+=LOST_H/2
    const lp:string[]=[]
    if(lost.berries>0)lp.push(`🍓 ${lost.berries}`)
    if(lost.apples>0)lp.push(`🍎 ${lost.apples}`)
    if(lost.coins>0)lp.push(`🪙 ${lost.coins}`)
    ctx.fillStyle="#dc2626";ctx.font="bold 26px sans-serif";ctx.fillText(`Lost: ${lp.join("  ")}`,cw/2,y)
    y+=LOST_H/2+GAP3
  }
  y+=PRESS_H/2
  ctx.fillStyle="#94a3b8";ctx.font="13px sans-serif";ctx.fillText("Press [R] or tap to respawn",cw/2,y)
}

// ─── House-for-sale menu (lessonBudget) ───────────────────────────────────────
function drawHouseSaleMenu(ctx:CanvasRenderingContext2D,cw:number,ch:number,buildingIdx:number,coins:number){
  const b=BUILDING_DEFS[buildingIdx],price=HOUSE_PRICES[buildingIdx]
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,cw,ch)
  const pw=Math.min(480,cw-40),ph=260
  const px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle=b.color;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.fillStyle=b.color;ctx.font="bold 16px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText(`${b.label.join(" ")}: For Sale`,cw/2,py+24)
  ctx.strokeStyle=`${b.color}55`;ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(px+16,py+40);ctx.lineTo(px+pw-16,py+40);ctx.stroke()
  ctx.fillStyle="#1e293b";ctx.font="bold 30px sans-serif"
  ctx.fillText(`🏠 ${price} coins`,cw/2,py+88)
  ctx.fillStyle="#64748b";ctx.font="13px sans-serif"
  ctx.fillText("Asking price",cw/2,py+114)
  ctx.strokeStyle="rgba(0,0,0,0.08)";ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(px+16,py+130);ctx.lineTo(px+pw-16,py+130);ctx.stroke()
  const canAfford=coins>=price
  ctx.fillStyle=canAfford?"#16a34a":"#dc2626";ctx.font="bold 14px sans-serif"
  ctx.fillText(canAfford?`✅ You can afford this!`:`❌ You only have ${coins} coins, can't afford it!`,cw/2,py+158)
  if(!canAfford){ctx.fillStyle="#6b7280";ctx.font="12px sans-serif";ctx.fillText(`You need ${price-coins} more coins.`,cw/2,py+180)}
  ctx.fillStyle="#94a3b8";ctx.font="11px sans-serif"
  ctx.fillText("[Z] or [X] Close",cw/2,py+ph-16)
}

// ─── Invest: trade menu ───────────────────────────────────────────────────────
const LIV_TRADE_DEFS=[
  {emoji:"🍞",name:"Bread", cost:LIV_BREAD_COST,desc:"Eat [X] to fully restore energy"},
  {emoji:"🌱",name:"Seeds", cost:LIV_SEED_COST, desc:`Sprout in 15s, get ${LIV_SEED_BERRY_YIELD} berries each!`},
  {emoji:"🪵",name:"Wood",  cost:LIV_WOOD_COST, desc:`Walk to the Market, sell for ${LIV_WOOD_COINS} coins each`},
]
function drawLivTradeMenu(ctx:CanvasRenderingContext2D,cw:number,ch:number,berries:number,idx:number,bread:number,seeds:number,wood:number,imgs:ImgMap){
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,cw,ch)
  const pw=Math.min(520,cw-40),ph=316
  const px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle="#0d9488";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.fillStyle="#0d9488";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("⚓ Port Trader: Import Goods",cw/2,py+22)
  ctx.strokeStyle="rgba(0,0,0,0.1)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+16,py+38);ctx.lineTo(px+pw-16,py+38);ctx.stroke()
  ctx.fillStyle="#64748b";ctx.font="12px sans-serif"
  ctx.fillText("↑↓ to select   [Z] to buy   [X] to close",cw/2,py+52)
  for(let i=0;i<LIV_TRADE_DEFS.length;i++){
    const it=LIV_TRADE_DEFS[i]
    const iy=py+72+i*76
    const canAfford=berries>=it.cost
    if(i===idx){
      ctx.fillStyle=canAfford?"rgba(13,148,136,0.13)":"rgba(220,38,38,0.08)"
      ctx.beginPath();ctx.roundRect(px+12,iy,pw-24,68,10);ctx.fill()
      ctx.strokeStyle=canAfford?"#0d9488":"#dc2626";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(px+12,iy,pw-24,68,10);ctx.stroke()
    }
    ctx.textAlign="left";ctx.textBaseline="middle"
    if(i===0&&imgs["bread"])ctx.drawImage(imgs["bread"],px+13,iy+34-13,26,26)
    else{ctx.font="26px sans-serif";ctx.fillText(it.emoji,px+26,iy+34)}
    ctx.fillStyle="#1e293b";ctx.font="bold 14px sans-serif"
    ctx.fillText(it.name,px+64,iy+20)
    ctx.fillStyle=canAfford?"#047857":"#dc2626";ctx.font="13px sans-serif"
    ctx.fillText(`🫐 ${it.cost} berr${it.cost===1?"y":"ies"}`,px+64,iy+40)
    ctx.fillStyle="#64748b";ctx.font="11px sans-serif"
    ctx.fillText(it.desc,px+64,iy+58)
    const count=i===0?bread:i===1?seeds:wood
    if(count>0){
      ctx.fillStyle="#3b82f6";ctx.font="bold 11px sans-serif";ctx.textAlign="right";ctx.textBaseline="middle"
      ctx.fillText(`Have: ${count}`,px+pw-20,iy+20)
    }
  }
  ctx.fillStyle="#94a3b8";ctx.font="11px sans-serif";ctx.textAlign="center"
  ctx.fillText(`Your berries: ${berries}`,cw/2,py+ph-16)
}
function drawLivInventory(ctx:CanvasRenderingContext2D,x:number,y:number,bread:number,seeds:number,wood:number,seedTimer:number,imgs:ImgMap){
  const parts:string[]=[]
  const hasBread=bread>0&&!!imgs["bread"]
  if(bread>0)parts.push(hasBread?`×${bread}`:`🍞×${bread}`)
  if(seeds>0)parts.push(`🌱×${seeds}${seedTimer>0?` (${Math.ceil(seedTimer/60)}s)`:""}`)
  if(wood>0)parts.push(`🪵×${wood}`)
  if(parts.length===0)return
  const text=parts.join("  ")
  ctx.font="bold 12px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
  const iSz=14,iconPad=hasBread?iSz+2:0
  const tw=ctx.measureText(text).width+8+iconPad
  ctx.fillStyle="rgba(255,255,255,0.92)";ctx.beginPath();ctx.roundRect(x,y,tw+16,26,8);ctx.fill()
  ctx.strokeStyle="#0d9488";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,y,tw+16,26,8);ctx.stroke()
  if(hasBread)ctx.drawImage(imgs["bread"],x+8,y+13-iSz/2,iSz,iSz)
  ctx.fillStyle="#0f172a";ctx.fillText(text,x+8+iconPad,y+13)
}

// ─── Invest: port dock ────────────────────────────────────────────────────────
function drawPortDock(ctx:CanvasRenderingContext2D,camX:number,camY:number,signLabel="⚓ PORT"){
  const px1=(LIV_PORT_C-1)*TS-camX, px2=(LIV_PORT_C+2)*TS-camX   // 3 tiles wide
  const py1=12*TS-camY, py2=(LIV_PORT_R+1)*TS-camY
  ctx.fillStyle="#7a5030"; ctx.fillRect(px1,py1,px2-px1,py2-py1)
  ctx.strokeStyle="#5a3820"; ctx.lineWidth=1.5
  for(let y=py1+12;y<py2;y+=12){ctx.beginPath();ctx.moveTo(px1,y);ctx.lineTo(px2,y);ctx.stroke()}
  ctx.fillStyle="#5a3820"; ctx.fillRect(px1,py1,4,py2-py1); ctx.fillRect(px2-4,py1,4,py2-py1)
  // bollards
  ctx.fillStyle="#3a2010"
  for(const bx of [px1+8,px2-8]) for(const by of [py1+10,py1+50,py1+90]){ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fill()}
  // sign above the trader
  const signCx=(LIV_PORT_C+0.5)*TS-camX, signY=(LIV_PORT_R-1)*TS-camY-8
  ctx.font="bold 10px sans-serif"
  const signW=Math.max(56,ctx.measureText(signLabel).width+16)
  ctx.fillStyle="#e8d5a0"; ctx.beginPath(); ctx.roundRect(signCx-signW/2,signY,signW,22,4); ctx.fill()
  ctx.strokeStyle="#b8952a"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(signCx-signW/2,signY,signW,22,4); ctx.stroke()
  ctx.fillStyle="#7a4a00"; ctx.textAlign="center"; ctx.textBaseline="middle"
  ctx.fillText(signLabel,signCx,signY+11)
}
// Small icon by the pier showing whatever gear the player currently has,
// the story's "map updates with a gear icon" beat.
function drawFishGearIcon(ctx:CanvasRenderingContext2D,camX:number,camY:number,ownsRod:boolean,rodBorrowed:boolean){
  if(!ownsRod&&!rodBorrowed)return
  const sx=FISH_PIER_X-camX+30, sy=FISH_PIER_Y-camY-40
  ctx.font="20px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText(ownsRod?"🎣":"🤝",sx,sy)
}

// ─── Invest: trade vessel ─────────────────────────────────────────────────────
function drawInvestBoat(ctx:CanvasRenderingContext2D,bx:number,by:number,frame:number,camX:number,camY:number){
  const W=2.5*TS,H=1.8*TS
  const sx=bx-W/2-camX, sy=by-H/2-camY
  const bob=Math.sin(frame*0.05)*2
  // water shadow
  ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(sx+W/2,sy+H+3+bob,W*0.42,7,0,0,Math.PI*2); ctx.fill()
  // hull
  ctx.fillStyle="#8b5e2e"; ctx.beginPath(); ctx.roundRect(sx,sy+bob,W,H,7); ctx.fill()
  ctx.strokeStyle="#5a3820"; ctx.lineWidth=2.5; ctx.beginPath(); ctx.roundRect(sx,sy+bob,W,H,7); ctx.stroke()
  // deck
  ctx.fillStyle="#a0724a"; ctx.beginPath(); ctx.roundRect(sx+5,sy+6+bob,W-10,H-18,4); ctx.fill()
  // cargo crates
  ctx.fillStyle="#c8903a"; ctx.fillRect(sx+10,sy+10+bob,18,14); ctx.fillRect(sx+32,sy+12+bob,14,12)
  ctx.strokeStyle="#8b6020"; ctx.lineWidth=1; ctx.strokeRect(sx+10,sy+10+bob,18,14); ctx.strokeRect(sx+32,sy+12+bob,14,12)
  // mast
  ctx.fillStyle="#5a3820"; ctx.fillRect(sx+W/2-3,sy-32+bob,6,36)
  // sail
  ctx.fillStyle="#f5f0e0"; ctx.beginPath()
  ctx.moveTo(sx+W/2-2,sy-30+bob); ctx.lineTo(sx+W/2+26,sy-10+bob); ctx.lineTo(sx+W/2-2,sy-5+bob)
  ctx.closePath(); ctx.fill(); ctx.strokeStyle="#ccc8b0"; ctx.lineWidth=1; ctx.stroke()
}

// ─── Bottom prompt helper ─────────────────────────────────────────────────────
function drawPrompt(ctx:CanvasRenderingContext2D,cw:number,ch:number,msg:string,color:string){
  const small=cw<520
  ctx.font=`bold ${small?11:13}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle"
  const maxW=cw-56
  const lines=ctx.measureText(msg).width<=maxW?[msg]:wrapCanvasText(ctx,msg,maxW)
  const tw=Math.min(maxW,Math.max(...lines.map(l=>ctx.measureText(l).width)))
  const lineH=small?15:17,bh=lineH*lines.length+11
  const bx=cw/2-tw/2-12,by=ch-28-bh
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(bx,by,tw+24,bh,14);ctx.fill()
  ctx.strokeStyle="#bfdbfe";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(bx,by,tw+24,bh,14);ctx.stroke()
  ctx.fillStyle=color
  const startY=by+bh/2-((lines.length-1)*lineH)/2
  lines.forEach((line,i)=>ctx.fillText(line,cw/2,startY+i*lineH))
}

// ─── Main component ───────────────────────────────────────────────────────────
export function GameMap({ variant, initialCoins = 0, playerColor = "#ef4444", paused = false, freeplay = false }: { variant: MapVariant; initialCoins?: number; playerColor?: string; paused?: boolean; freeplay?: boolean }) {
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const router=useRouter()
  const completeRef=useRef<(()=>void)|null>(null)
  const [lessonDone, setLessonDone]=useState(false)
  const [finalCoins, setFinalCoins]=useState(0)
  const [showOverlay, setShowOverlay]=useState(false)
  const [overlayOpacity, setOverlayOpacity]=useState(0)
  // Lesson Farm's seed-buying and Lesson Fish's rod decision use a Market
  // popup / StoryScroll overlay that pauses the canvas game underneath, same
  // as the `paused` prop. The `*Ref` mirrors let the rAF loop (mounted once,
  // below) read the latest value each frame without needing to restart the effect.
  const [marketOpen, setMarketOpen]=useState(false)
  const marketOpenRef=useRef(marketOpen)
  useEffect(()=>{marketOpenRef.current=marketOpen},[marketOpen])
  // Lesson Fish's rod decision (buy vs borrow) is a real money commitment,
  // so it gets the official StoryScroll treatment.
  const [fishScroll, setFishScrollKind]=useState<"rod"|null>(null)
  const fishScrollRef=useRef(fishScroll)
  useEffect(()=>{fishScrollRef.current=fishScroll},[fishScroll])
  const [, setUiTick]=useState(0) // bump after Market/scroll purchases so displayed coins/seeds refresh
  const pausedRef=useRef(paused)
  useEffect(()=>{pausedRef.current=paused||marketOpen||fishScroll!==null},[paused,marketOpen,fishScroll])

  function triggerFadeOut(then: ()=>void){
    setTimeout(()=>{
      setShowOverlay(true)
      requestAnimationFrame(()=>requestAnimationFrame(()=>setOverlayOpacity(1)))
      setTimeout(then, 1500)
    }, 3000)
  }

  const stageComplete=variant==="lesson1"?L1_COMPLETE:variant==="lessonBudget"?LB_COMPLETE:variant==="lessonLoans"?LL_COMPLETE:variant==="lessonInvest"?LIV_COMPLETE:variant==="lessonFish"?FISH_COMPLETE:FARM_COMPLETE

  const stateRef=useRef({
    px: 38*TS, py: 21*TS,
    keys: new Set<string>(),
    pointerDown: false as boolean,
    pointerWX: 0 as number, pointerWY: 0 as number,
    pointerTapPending: false as boolean,
    foodBarRect: null as {x:number,y:number,w:number,h:number}|null,
    foodTapPending: false as boolean,
    inventoryPanelRect: null as {x:number,y:number}|null,
    invDragFromIndex: null as number|null,
    invDragPointerX: 0 as number, invDragPointerY: 0 as number,
    frame: 0, raf: 0,
    imgs: null as ImgMap|null,
    npcs: initNpcs(variant),
    sustenance: SUSTENANCE_MAX as number,
    inventory: { ...freshInventory(), coins: initialCoins },
    dayOver: false,
    harvestCooldown: 0,
    bloo: initBloo(),
    // Freeplay ("Play" from the sidebar) drops the player in past the story
    // stages, no forced intro dialogue/task sign, so the whole world they
    // already unlocked is open to just wander and use, no instructions.
    gameStage: (freeplay?stageComplete:0) as number,
    dialogIdx: 0 as number,
    typeText: "" as string,
    typeChars: 0 as number,
    // In freeplay, skip every forced lesson stage but still leave Bloo with
    // one friendly line the player can pull up on demand (via the existing
    // "[Z] Ask Bloo to repeat that" recap prompt), so he isn't silent.
    blooLastLine: (freeplay?"Have fun exploring! Come find me if you want a hand. 👋":"") as string,
    blooRecapOpen: false as boolean,
    completionCalled: false,
    foliage: initFoliage(),
    logs: initLogs(initFoliage()),
    notifText: "" as string,
    notifTimer: 0 as number,
    // lesson 1 fields
    blooRemindIdx: 0 as number,
    blooHarvestDismissed: false as boolean,
    sellMenu: null as SellMenuState|null,
    // lesson budget fields
    houseSaleOpen: false as boolean,
    // lesson invest fields
    boatY: LIV_BOAT_START_Y as number,
    boatGone: false as boolean,
    livTrades: 0 as number,
    livTradeMenu: false as boolean,
    livTradeMenuIdx: 0 as number,
    livBerriesSoldTotal: 0 as number,
    livBread: 0 as number,
    livSeeds: 0 as number,
    livWood: 0 as number,
    livSeedTimer: 0 as number,
    houseSaleIdx: -1 as number,
    homeViewed: false as boolean,
    ownedHouseIdx: -1 as number,
    drops: [] as {wx:number;wy:number;berries:number;apples:number;coins:number}[],
    deathDropped: {berries:0,apples:0,coins:0},
    deathLost: {berries:0,apples:0,coins:0},
    sprintTimer: 0 as number,
    // lesson farm fields
    binkDialogIdx: 0 as number,
    farmChoiceIdx: 0 as number,
    farmChosenRoute: null as "bugs"|"weeder"|null,
    farmState: createInitialFarmPlotState(),
    farmRevealIdx: 0 as number,
    farmSeedsPitchIdx: 0 as number,
    farmWrapIdx: 0 as number,
    // lesson fish fields
    talloDialogIdx: 0 as number,
    fishOwnsRod: false as boolean,
    fishRodBorrowed: false as boolean,
    fishRodSnapped: false as boolean,
    fishBaitCans: 0 as number,
    fishCastsDone: 0 as number,
    fishWrapIdx: 0 as number,
  })

  // ─── Lesson Farm: StoryScroll / Market handlers ────────────────────────────
  // These run as normal React event handlers (not inside the rAF loop), so
  // they can freely mutate stateRef.current and call setState.
  function handleBuySeedPack(){
    const s=stateRef.current
    const{state,coinsDelta,success}=buySeedPack(s.farmState,s.inventory.coins)
    s.farmState=state;s.inventory.coins+=coinsDelta
    if(success&&s.farmState.seedsOwned>=SEEDS_NEEDED){setMarketOpen(false);s.gameStage=FARM_PLANTING}
    setUiTick(t=>t+1)
  }
  function handleBuyBread(){
    const s=stateRef.current
    if(s.inventory.coins>=FARM_BREAD_COST){s.inventory.coins-=FARM_BREAD_COST;s.sustenance=SUSTENANCE_MAX}
    setUiTick(t=>t+1)
  }

  // ─── Lesson Fish: StoryScroll handler ──────────────────────────────────────
  function handleFishScrollChoice(choiceId:string){
    const s=stateRef.current
    if(choiceId==="buy"){
      if(s.inventory.coins<FISH_ROD_COST){
        s.notifText=`Not enough coins for the rod, try selling some fish or berries first!`;s.notifTimer=240
        return // leave the scroll open so they can pick borrow instead
      }
      s.inventory.coins-=FISH_ROD_COST;s.fishOwnsRod=true
    }else{
      if(s.inventory.coins<FISH_BORROW_COST){
        s.notifText=`Not enough coins to borrow the rod either!`;s.notifTimer=240
        return
      }
      s.inventory.coins-=FISH_BORROW_COST;s.fishRodBorrowed=true
    }
    s.gameStage=FISH_BUY_BAIT
    setFishScrollKind(null)
  }

  useEffect(()=>{
    completeRef.current=()=>{
      // Freeplay is just for exploring the already-unlocked world, hitting a
      // "complete this lesson" trigger while messing around shouldn't save
      // progress or fade out into the finished-lesson screen.
      if(freeplay)return
      const inv = stateRef.current.inventory
      if(variant==="lesson1"){
        saveGameLesson("unit1GameCompleted",inv.coins,inv.berries).catch(()=>{})
        setFinalCoins(inv.coins)
        triggerFadeOut(()=>setLessonDone(true))
      }else if(variant==="lessonBudget"){
        saveGameLesson("budgetMapCompleted",inv.coins,inv.berries).catch(()=>{})
        setFinalCoins(inv.coins)
        triggerFadeOut(()=>setLessonDone(true))
      }else if(variant==="lessonLoans"){
        saveGameLesson("loansMapCompleted",inv.coins,inv.berries).catch(()=>{})
        setFinalCoins(inv.coins)
        triggerFadeOut(()=>setLessonDone(true))
      }else if(variant==="lessonInvest"){
        saveGameLesson("investIntroCompleted",inv.coins,inv.berries).catch(()=>{})
        setFinalCoins(inv.coins)
        triggerFadeOut(()=>setLessonDone(true))
      }else if(variant==="lessonFish"){
        saveGameLesson("fishGameplayCompleted",inv.coins,inv.berries).catch(()=>{})
        triggerFadeOut(()=>router.push("/learn"))
      }else{
        saveGameLesson("farmPhase1Completed",inv.coins,inv.berries).catch(()=>{})
        triggerFadeOut(()=>router.push("/learn"))
      }
    }
  },[router,variant,freeplay])

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas)return
    const ctx=canvas.getContext("2d")
    if(!ctx)return
    ctx.imageSmoothingEnabled=false

    const dpr=window.devicePixelRatio||1
    const resize=()=>{canvas.width=canvas.offsetWidth*dpr;canvas.height=canvas.offsetHeight*dpr;ctx.scale(dpr,dpr);ctx.imageSmoothingEnabled=false}
    resize()
    const ro=new ResizeObserver(resize);ro.observe(canvas)

    const onDown=(e:KeyboardEvent)=>{
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault()
      if(pausedRef.current)return
      stateRef.current.keys.add(e.key)
    }
    const onUp=(e:KeyboardEvent)=>stateRef.current.keys.delete(e.key)
    window.addEventListener("keydown",onDown)
    window.addEventListener("keyup",onUp)

    // Click-and-hold pointer movement: press down anywhere on the map and the
    // player walks toward that point (tracking drag) until you release.
    const pointerToWorld=(clientX:number,clientY:number)=>{
      const rect=canvas.getBoundingClientRect()
      const sx=clientX-rect.left,sy=clientY-rect.top
      const cw=canvas.offsetWidth,ch=canvas.offsetHeight
      const s=stateRef.current
      const camX=Math.max(0,Math.min(s.px-cw/2,MAP_W*TS-cw))
      const camY=Math.max(0,Math.min(s.py-ch/2,MAP_H*TS-ch))
      return{wx:sx+camX,wy:sy+camY}
    }
    let activePointerId:number|null=null
    const onPointerDown=(e:PointerEvent)=>{
      if(e.button!==undefined&&e.button!==0)return
      if(pausedRef.current)return
      // On iOS/Android a held touch on a focusable element can trigger the
      // text-selection callout or a native scroll/zoom gesture, which cancels
      // the drag, preventDefault + capture stop that from hijacking the hold.
      e.preventDefault()
      // Tapping the FOOD bar itself eats, a HUD click, not a move-to-point.
      const rect=canvas.getBoundingClientRect()
      const sx=e.clientX-rect.left, sy=e.clientY-rect.top
      const fb=stateRef.current.foodBarRect
      if(fb&&sx>=fb.x&&sx<=fb.x+fb.w&&sy>=fb.y&&sy<=fb.y+fb.h){
        stateRef.current.foodTapPending=true
        return
      }
      // Pressing down on a filled inventory slot starts a drag-to-reorder
      // instead of the usual click-and-hold walk.
      const ip=stateRef.current.inventoryPanelRect
      if(ip){
        const idx=inventorySlotIndexAt(sx,sy,ip.x,ip.y)
        const slotType=idx>=0?stateRef.current.inventory.slots[idx]:null
        if(idx>=0&&slotType&&inventoryItemCount(stateRef.current.inventory,slotType)>0){
          try{canvas.setPointerCapture(e.pointerId)}catch{}
          activePointerId=e.pointerId
          stateRef.current.invDragFromIndex=idx
          stateRef.current.invDragPointerX=sx
          stateRef.current.invDragPointerY=sy
          return
        }
      }
      try{canvas.setPointerCapture(e.pointerId)}catch{}
      activePointerId=e.pointerId
      const{wx,wy}=pointerToWorld(e.clientX,e.clientY)
      stateRef.current.pointerDown=true
      stateRef.current.pointerWX=wx
      stateRef.current.pointerWY=wy
      // A tap/click also stands in for a one-frame [Z]/[R] press, so touch
      // users can advance dialogue, confirm menu choices, and respawn by
      // tapping instead of needing a keyboard.
      stateRef.current.pointerTapPending=true
    }
    const onPointerMove=(e:PointerEvent)=>{
      if(stateRef.current.invDragFromIndex!==null){
        if(activePointerId!==null&&e.pointerId!==activePointerId)return
        e.preventDefault()
        const rect=canvas.getBoundingClientRect()
        stateRef.current.invDragPointerX=e.clientX-rect.left
        stateRef.current.invDragPointerY=e.clientY-rect.top
        return
      }
      if(!stateRef.current.pointerDown)return
      if(activePointerId!==null&&e.pointerId!==activePointerId)return
      e.preventDefault()
      const{wx,wy}=pointerToWorld(e.clientX,e.clientY)
      stateRef.current.pointerWX=wx
      stateRef.current.pointerWY=wy
    }
    const onPointerUp=(e:PointerEvent)=>{
      if(activePointerId!==null&&e.pointerId!==activePointerId)return
      activePointerId=null
      if(stateRef.current.invDragFromIndex!==null){
        const from=stateRef.current.invDragFromIndex
        const ip=stateRef.current.inventoryPanelRect
        const rect=canvas.getBoundingClientRect()
        const sx=e.clientX-rect.left, sy=e.clientY-rect.top
        const to=ip?inventorySlotIndexAt(sx,sy,ip.x,ip.y):-1
        if(to>=0&&to!==from)swapInventorySlots(stateRef.current.inventory,from,to)
        stateRef.current.invDragFromIndex=null
        return
      }
      stateRef.current.pointerDown=false
    }
    const onContextMenu=(e:MouseEvent)=>e.preventDefault()
    canvas.addEventListener("pointerdown",onPointerDown)
    canvas.addEventListener("pointermove",onPointerMove,{passive:false})
    window.addEventListener("pointerup",onPointerUp)
    window.addEventListener("pointercancel",onPointerUp)
    canvas.addEventListener("contextmenu",onContextMenu)

    ctx.fillStyle="#1a3a2a";ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight)
    ctx.fillStyle="white";ctx.font="bold 18px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
    ctx.fillText("Loading map…",canvas.offsetWidth/2,canvas.offsetHeight/2)

    if(variant==="lessonInvest"){stateRef.current.inventory.berries=LIV_START_BERRIES;if(LIV_START_BERRIES>0)claimInventorySlot(stateRef.current.inventory,"berry")}

    loadImages().then(imgs=>{
      stateRef.current.imgs=imgs
      computeBuildingBounds(imgs)

      const loop=()=>{
        const s=stateRef.current
        s.frame++
        const{keys}=s
        const tapInjected=s.pointerTapPending
        if(tapInjected){keys.add("z");keys.add("r");s.pointerTapPending=false}
        const foodTapInjected=s.foodTapPending
        if(foodTapInjected){keys.add("x");s.foodTapPending=false}

        // ── Sustenance drain ───────────────────────────────────────────────
        if(!s.dayOver&&s.gameStage<stageComplete&&!pausedRef.current){
          s.sustenance=Math.max(0,s.sustenance-MAP_DRAIN)
          if(s.sustenance<=0&&!s.dayOver){
            const dBerries=Math.floor(s.inventory.berries*2/3)
            const dApples=Math.floor(s.inventory.apples*2/3)
            const dCoins=Math.floor(s.inventory.coins*2/3)
            const lBerries=s.inventory.berries-dBerries
            const lApples=s.inventory.apples-dApples
            const lCoins=s.inventory.coins-dCoins
            s.deathDropped={berries:dBerries,apples:dApples,coins:dCoins}
            s.deathLost={berries:lBerries,apples:lApples,coins:lCoins}
            if(dBerries>0||dApples>0||dCoins>0){
              const spread=TS*1.5
              s.drops.push({
                wx:s.px+(Math.random()-0.5)*spread,
                wy:s.py+(Math.random()-0.5)*spread,
                berries:dBerries,apples:dApples,coins:dCoins,
              })
            }
            s.inventory.berries=0;s.inventory.apples=0;s.inventory.coins=0
            s.dayOver=true
          }
        }

        // ── Foliage regen + nearest fruit ──────────────────────────────────
        let nearFoliageIdx=-1,nearFoliageDist=Infinity
        for(let fi=0;fi<s.foliage.length;fi++){
          const fn=s.foliage[fi]
          if(!fn.hasFruit&&fn.regenTimer>0){fn.regenTimer--;if(fn.regenTimer===0)fn.hasFruit=true}
          const d=Math.hypot(s.px-fn.wx,s.py-fn.wy)
          if(d<FOLIAGE_RANGE&&d<nearFoliageDist&&fn.hasFruit){nearFoliageDist=d;nearFoliageIdx=fi}
        }

        // ── Harvest [Z] ────────────────────────────────────────────────────
        if(s.harvestCooldown>0)s.harvestCooldown--
        const noMenu=(variant==="lesson1"||variant==="lessonBudget"||variant==="lessonLoans")?s.sellMenu===null:variant==="lessonInvest"?!s.livTradeMenu:true
        if((keys.has("z")||keys.has("Z"))&&!s.dayOver&&s.harvestCooldown===0&&nearFoliageIdx>=0&&noMenu){
          const harvestedNode=s.foliage[nearFoliageIdx]
          if(harvestedNode.type==="tree"){s.inventory.apples+=HARVEST_BERRIES;claimInventorySlot(s.inventory,"apple")}
          else if(harvestedNode.type==="mushroom"){s.inventory.mushrooms+=HARVEST_BERRIES;claimInventorySlot(s.inventory,"mushroom")}
          else if(harvestedNode.type==="wood"){s.inventory.wood+=HARVEST_BERRIES;claimInventorySlot(s.inventory,"wood")}
          else{s.inventory.berries+=HARVEST_BERRIES;claimInventorySlot(s.inventory,"berry")}
          s.harvestCooldown=HARVEST_COOLDOWN
          harvestedNode.hasFruit=false
          harvestedNode.regenTimer=FOLIAGE_REGEN
          keys.delete("z");keys.delete("Z")
        }

        // ── Eat [X] ────────────────────────────────────────────────────────
        if((keys.has("x")||keys.has("X"))&&!s.dayOver&&noMenu){
          if(variant==="lessonInvest"&&s.livBread>0){
            s.livBread--;s.sustenance=SUSTENANCE_MAX
            keys.delete("x");keys.delete("X")
          }else if(s.inventory.berries>0||s.inventory.apples>0){
            if(s.inventory.berries>0)s.inventory.berries--
            else s.inventory.apples--
            s.sustenance=Math.min(SUSTENANCE_MAX,s.sustenance+BERRY_SUSTENANCE)
            keys.delete("x");keys.delete("X")
            if(variant==="lesson1"&&s.gameStage===L1_HARVEST){
              s.gameStage=L1_TOUR;s.dialogIdx=0
            }
          }
        }

        // ── Sprint [Space] ─────────────────────────────────────────────────
        if(s.sprintTimer>0)s.sprintTimer--
        if(keys.has(" ")&&!s.dayOver&&s.sprintTimer===0&&s.sustenance>20){
          s.sprintTimer=60
          s.sustenance=Math.max(0,s.sustenance-3)
          keys.delete(" ")
        }
        const spd=s.sprintTimer>0?SPEED*2:SPEED

        // ─────────────────────────────────────────────────────────────────
        // LESSON 1 GAME FLOW
        // ─────────────────────────────────────────────────────────────────
        if(variant==="lesson1"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(!nearBloo)s.blooHarvestDismissed=false
          if(!nearBloo)s.blooRecapOpen=false
          const blooDialogue=nearBloo&&(
            s.gameStage===L1_INTRO||(s.gameStage===L1_HARVEST&&!s.blooHarvestDismissed)||
            s.gameStage===L1_TOUR||s.gameStage===L1_SELL_INTRO||s.gameStage===L1_WRAP_UP
          )
          const anyDialogue=blooDialogue||s.sellMenu!==null||s.blooRecapOpen

          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)

          // sell menu arrow keys
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(combinedGoods(s.inventory),L1_NPC_MAX_TRADES-smNpc.tradesDone)
            if(keys.has("ArrowRight")||keys.has("ArrowUp")){s.sellMenu.amount=Math.min(s.sellMenu.amount+1,maxSell);keys.delete("ArrowRight");keys.delete("ArrowUp")}
            if(keys.has("ArrowLeft")||keys.has("ArrowDown")){s.sellMenu.amount=Math.max(s.sellMenu.amount-1,0);keys.delete("ArrowLeft");keys.delete("ArrowDown")}
          }
          if((keys.has("x")||keys.has("X"))&&s.sellMenu!==null&&s.sellMenu.phase==="select"){
            s.sellMenu=null;keys.delete("x");keys.delete("X")
          }

          const eDown=keys.has("z")||keys.has("Z")
          let eUsed=false
          const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

          // 0. sell menu confirm/close
          if(eDown&&!eUsed&&s.sellMenu!==null){
            if(s.sellMenu.phase==="result"){
              s.sellMenu=null
              // Sold everything → lesson's done.
              if(combinedGoods(s.inventory)===0&&s.gameStage===L1_SELLING){
                s.gameStage=L1_WRAP_UP;s.dialogIdx=0
              }
            }else if(s.sellMenu.amount>0){
              const smNpc=s.npcs[s.sellMenu.npcIdx]
              const amt=s.sellMenu.amount
              const alloc=sellAllocation(amt,s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms)
              let earned=sellEarnings(alloc,L1_SELL_PRICES)
              // Bonus coin for mushrooms specifically — they're rare, and Market
              // Trader (the tip NPC) only throws it in on a sale that includes one.
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed&&alloc.fromMushrooms>0
              if(gettingTip){earned+=L1_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=alloc.fromBerries;s.inventory.apples-=alloc.fromApples
              s.inventory.wood-=alloc.fromWood;s.inventory.mushrooms-=alloc.fromMushrooms
              s.inventory.coins+=earned
              smNpc.tradesDone+=amt
              if(smNpc.tradeTimer===0)smNpc.tradeTimer=L1_NPC_BUY_RESET
              if(gettingTip){s.notifText=`Market Trader tipped you +${L1_TIP_COINS} coins for that rare mushroom! 🎉`;s.notifTimer=300}
              s.sellMenu={npcIdx:s.sellMenu.npcIdx,amount:amt,phase:"result",resultLine:L1_NPC_SOLD[s.sellMenu.npcIdx],earnedCoins:earned}
            }
            consumeE()
          }
          // 1. bloo intro
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L1_INTRO){
            s.dialogIdx++;if(s.dialogIdx>=L1_BLOO_INTRO.length){s.gameStage=L1_HARVEST;s.dialogIdx=0}
            consumeE()
          }
          // 1b. bloo harvest remind
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L1_HARVEST&&!s.blooHarvestDismissed){
            s.blooRemindIdx++;if(s.blooRemindIdx>=L1_BLOO_HARVEST_REMIND.length){s.blooHarvestDismissed=true;s.blooRemindIdx=0}
            consumeE()
          }
          // 2. bloo building tour + forage pitch
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L1_TOUR){
            s.dialogIdx++;if(s.dialogIdx>=L1_BLOO_TOUR.length){s.gameStage=L1_FORAGE;s.dialogIdx=0}
            consumeE()
          }
          // 4. bloo sell intro
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L1_SELL_INTRO){
            s.dialogIdx++;if(s.dialogIdx>=L1_BLOO_SELL_INTRO.length){s.gameStage=L1_SELLING;s.dialogIdx=0}
            consumeE()
          }
          // 5. bloo wrap-up
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L1_WRAP_UP){
            s.dialogIdx++
            if(s.dialogIdx>=L1_BLOO_WRAP_UP.length){
              s.gameStage=L1_COMPLETE
              if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}
            }
            consumeE()
          }
          // 6. open sell menu near NPC
          if(eDown&&!eUsed&&s.gameStage===L1_SELLING&&s.sellMenu===null){
            let nearNpcIdx=-1,nearNpcDist=Infinity
            for(let i=0;i<s.npcs.length;i++){
              const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y)
              if(d<TS*2.5&&d<nearNpcDist){nearNpcDist=d;nearNpcIdx=i}
            }
            if(nearNpcIdx>=0){
              const npc=s.npcs[nearNpcIdx]
              const maxSell=Math.min(combinedGoods(s.inventory),L1_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0}
              consumeE()
            }
          }
          // 7. recap: Z near Bloo outside a live dialogue repeats his last line
          if(eDown&&!eUsed&&nearBloo&&!blooDialogue&&s.blooLastLine){
            s.blooRecapOpen=!s.blooRecapOpen
            consumeE()
          }

          updateNpcs(s.npcs,s.sellMenu?.npcIdx??-1)

          // stage transitions
          if(s.gameStage===L1_FORAGE&&combinedGoods(s.inventory)>=L1_FORAGE_GOAL){
            s.gameStage=L1_SELL_INTRO;s.dialogIdx=0
            s.notifText=`${L1_FORAGE_GOAL} items collected! Head to the Market to sell.`;s.notifTimer=360
          }

          // movement: flat SPEED, no sustenance penalty
          if(!s.dayOver&&s.gameStage<L1_COMPLETE&&!anyDialogue){
            const{dx,dy}=computeMoveDelta(keys,spd,s.pointerDown,s.px,s.py,s.pointerWX,s.pointerWY)
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy)
              let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=foliageHitR(fn.type)
                const hcy=fn.wy-foliageHitOY(fn.type)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy)
                const minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              for(const dn of MUSHROOMS){
                const ddx=nx-dn.wx,ddy=ny-dn.wy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+AMBIENT_DECOR_HIT_R
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON BUDGET GAME FLOW  (lesson 10, Bloo talks about budgeting)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonBudget"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(!nearBloo)s.blooRecapOpen=false
          const blooDialogue=nearBloo&&(s.gameStage===LB_INTRO||s.gameStage===LB_BLOO_BUDGET)
          const anyDialogue=blooDialogue||s.sellMenu!==null||s.houseSaleOpen||s.blooRecapOpen
          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)

          // sell menu arrow keys
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-smNpc.tradesDone)
            if(keys.has("ArrowRight")||keys.has("ArrowUp")){s.sellMenu.amount=Math.min(s.sellMenu.amount+1,maxSell);keys.delete("ArrowRight");keys.delete("ArrowUp")}
            if(keys.has("ArrowLeft")||keys.has("ArrowDown")){s.sellMenu.amount=Math.max(s.sellMenu.amount-1,0);keys.delete("ArrowLeft");keys.delete("ArrowDown")}
          }
          if((keys.has("x")||keys.has("X"))&&s.sellMenu!==null&&s.sellMenu.phase==="select"){s.sellMenu=null;keys.delete("x");keys.delete("X")}

          // [X] close house sale menu
          if((keys.has("x")||keys.has("X"))&&s.houseSaleOpen){
            if(!s.homeViewed&&s.gameStage===LB_EXPLORE){s.homeViewed=true;s.gameStage=LB_BLOO_BUDGET;s.dialogIdx=0;s.notifText="Wow, so expensive! Go talk to Bloo!";s.notifTimer=300}
            s.houseSaleOpen=false;s.houseSaleIdx=-1;keys.delete("x");keys.delete("X")
          }

          const eDown=keys.has("z")||keys.has("Z")
          let eUsed=false
          const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

          // 0. sell menu confirm
          if(eDown&&!eUsed&&s.sellMenu!==null){
            if(s.sellMenu.phase==="result"){s.sellMenu=null}
            else if(s.sellMenu.amount>0){
              const smNpc=s.npcs[s.sellMenu.npcIdx],amt=s.sellMenu.amount
              const alloc=sellAllocation(amt,s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms)
              let earned=sellEarnings(alloc,FLAT_SELL_PRICES)
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed
              if(gettingTip){earned+=LB_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=alloc.fromBerries;s.inventory.apples-=alloc.fromApples
              s.inventory.wood-=alloc.fromWood;s.inventory.mushrooms-=alloc.fromMushrooms
              s.inventory.coins+=earned
              smNpc.tradesDone+=amt;if(smNpc.tradeTimer===0)smNpc.tradeTimer=LB_NPC_BUY_RESET
              if(gettingTip){s.notifText=`Market Trader tipped you +${LB_TIP_COINS} coins! 🎉`;s.notifTimer=300}
              s.sellMenu={npcIdx:s.sellMenu.npcIdx,amount:amt,phase:"result",resultLine:L1_NPC_SOLD[s.sellMenu.npcIdx],earnedCoins:earned}
            }
            consumeE()
          }
          // 1. close house sale menu with Z
          if(eDown&&!eUsed&&s.houseSaleOpen){
            if(!s.homeViewed&&s.gameStage===LB_EXPLORE){s.homeViewed=true;s.gameStage=LB_BLOO_BUDGET;s.dialogIdx=0;s.notifText="Wow, so expensive! Go talk to Bloo!";s.notifTimer=300}
            s.houseSaleOpen=false;s.houseSaleIdx=-1;consumeE()
          }
          // 2. bloo intro → gives 10 berries
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===LB_INTRO){
            s.dialogIdx++;
            if(s.dialogIdx>=LB_BLOO_INTRO.length){
              s.inventory.berries+=10;claimInventorySlot(s.inventory,"berry");s.notifText="Bloo gave you 10 berries! 🍒";s.notifTimer=300
              s.gameStage=LB_EXPLORE;s.dialogIdx=0
            }
            consumeE()
          }
          // 3. bloo budget talk → complete
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===LB_BLOO_BUDGET){
            s.dialogIdx++;
            if(s.dialogIdx>=LB_BLOO_BUDGET_TALK.length){
              s.gameStage=LB_COMPLETE;s.dialogIdx=0
              if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}
            }
            consumeE()
          }
          // 4. open sell menu near NPC
          if(eDown&&!eUsed&&s.gameStage>=LB_EXPLORE&&s.gameStage<LB_COMPLETE&&s.sellMenu===null&&!s.houseSaleOpen){
            let nearNpcIdx=-1,nearNpcDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nearNpcDist){nearNpcDist=d;nearNpcIdx=i}}
            if(nearNpcIdx>=0){
              const npc=s.npcs[nearNpcIdx],maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0};consumeE()
            }
          }
          // 5. open house-for-sale menu near building entrance
          if(eDown&&!eUsed&&s.gameStage===LB_EXPLORE&&s.sellMenu===null&&!s.houseSaleOpen){
            for(let ei=1;ei<ENTRANCES.length;ei++){
              if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){s.houseSaleOpen=true;s.houseSaleIdx=ei;consumeE();break}
            }
          }
          // 6. recap: Z near Bloo outside a live dialogue repeats his last line
          if(eDown&&!eUsed&&nearBloo&&!blooDialogue&&s.blooLastLine){
            s.blooRecapOpen=!s.blooRecapOpen
            consumeE()
          }

          updateNpcs(s.npcs,s.sellMenu?.npcIdx??-1)

          // movement
          if(!s.dayOver&&s.gameStage<LB_COMPLETE&&!anyDialogue){
            const{dx,dy}=computeMoveDelta(keys,spd,s.pointerDown,s.px,s.py,s.pointerWX,s.pointerWY)
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy);let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=foliageHitR(fn.type)
                const hcy=fn.wy-foliageHitOY(fn.type)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              for(const dn of MUSHROOMS){
                const ddx=nx-dn.wx,ddy=ny-dn.wy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+AMBIENT_DECOR_HIT_R
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON LOANS GAME FLOW  (lesson 19, Bloo says "need a loan", go to bank)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonLoans"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(!nearBloo)s.blooRecapOpen=false
          const blooDialogue=nearBloo&&(s.gameStage===LL_INTRO||s.gameStage===LL_BLOO_TALK)
          const anyDialogue=blooDialogue||s.sellMenu!==null||s.houseSaleOpen||s.blooRecapOpen
          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)

          // sell menu arrow keys
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-smNpc.tradesDone)
            if(keys.has("ArrowRight")||keys.has("ArrowUp")){s.sellMenu.amount=Math.min(s.sellMenu.amount+1,maxSell);keys.delete("ArrowRight");keys.delete("ArrowUp")}
            if(keys.has("ArrowLeft")||keys.has("ArrowDown")){s.sellMenu.amount=Math.max(s.sellMenu.amount-1,0);keys.delete("ArrowLeft");keys.delete("ArrowDown")}
          }
          if((keys.has("x")||keys.has("X"))&&s.sellMenu!==null&&s.sellMenu.phase==="select"){s.sellMenu=null;keys.delete("x");keys.delete("X")}

          // [X] close house sale menu
          if((keys.has("x")||keys.has("X"))&&s.houseSaleOpen){
            if(!s.homeViewed&&s.gameStage===LL_EXPLORE){s.homeViewed=true;s.gameStage=LL_BLOO_TALK;s.dialogIdx=0;s.notifText="Hmm... you can't afford that! Talk to Bloo!";s.notifTimer=300}
            s.houseSaleOpen=false;s.houseSaleIdx=-1;keys.delete("x");keys.delete("X")
          }

          const eDown=keys.has("z")||keys.has("Z")
          let eUsed=false
          const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

          // 0. sell menu confirm
          if(eDown&&!eUsed&&s.sellMenu!==null){
            if(s.sellMenu.phase==="result"){s.sellMenu=null}
            else if(s.sellMenu.amount>0){
              const smNpc=s.npcs[s.sellMenu.npcIdx],amt=s.sellMenu.amount
              const alloc=sellAllocation(amt,s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms)
              let earned=sellEarnings(alloc,FLAT_SELL_PRICES)
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed
              if(gettingTip){earned+=LB_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=alloc.fromBerries;s.inventory.apples-=alloc.fromApples
              s.inventory.wood-=alloc.fromWood;s.inventory.mushrooms-=alloc.fromMushrooms
              s.inventory.coins+=earned
              smNpc.tradesDone+=amt;if(smNpc.tradeTimer===0)smNpc.tradeTimer=LB_NPC_BUY_RESET
              if(gettingTip){s.notifText=`Market Trader tipped you +${LB_TIP_COINS} coins! 🎉`;s.notifTimer=300}
              s.sellMenu={npcIdx:s.sellMenu.npcIdx,amount:amt,phase:"result",resultLine:L1_NPC_SOLD[s.sellMenu.npcIdx],earnedCoins:earned}
            }
            consumeE()
          }
          // 1. close house sale menu with Z
          if(eDown&&!eUsed&&s.houseSaleOpen){
            if(!s.homeViewed&&s.gameStage===LL_EXPLORE){s.homeViewed=true;s.gameStage=LL_BLOO_TALK;s.dialogIdx=0;s.notifText="Hmm... you can't afford that! Talk to Bloo!";s.notifTimer=300}
            s.houseSaleOpen=false;s.houseSaleIdx=-1;consumeE()
          }
          // 2. bloo intro (no berries)
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===LL_INTRO){
            s.dialogIdx++;
            if(s.dialogIdx>=LL_BLOO_INTRO.length){s.gameStage=LL_EXPLORE;s.dialogIdx=0}
            consumeE()
          }
          // 3. bloo "need a loan"
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===LL_BLOO_TALK){
            s.dialogIdx++;
            if(s.dialogIdx>=LL_BLOO_LOAN.length){
              s.gameStage=LL_BANK;s.dialogIdx=0;s.notifText="Head to the blue building (bank)!";s.notifTimer=360
            }
            consumeE()
          }
          // 4. open sell menu near NPC
          if(eDown&&!eUsed&&s.gameStage>=LL_EXPLORE&&s.gameStage<LL_BANK&&s.sellMenu===null&&!s.houseSaleOpen){
            let nearNpcIdx=-1,nearNpcDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nearNpcDist){nearNpcDist=d;nearNpcIdx=i}}
            if(nearNpcIdx>=0){
              const npc=s.npcs[nearNpcIdx],maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0};consumeE()
            }
          }
          // 5. open house-for-sale menu near building entrance
          if(eDown&&!eUsed&&s.gameStage===LL_EXPLORE&&s.sellMenu===null&&!s.houseSaleOpen){
            for(let ei=1;ei<ENTRANCES.length;ei++){
              if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){s.houseSaleOpen=true;s.houseSaleIdx=ei;consumeE();break}
            }
          }
          // 6. recap: Z near Bloo outside a live dialogue repeats his last line
          if(eDown&&!eUsed&&nearBloo&&!blooDialogue&&s.blooLastLine){
            s.blooRecapOpen=!s.blooRecapOpen
            consumeE()
          }

          updateNpcs(s.npcs,s.sellMenu?.npcIdx??-1)

          // bank proximity → complete
          if(s.gameStage===LL_BANK){
            if(Math.hypot(s.px-ENTRANCES[0].wx,s.py-ENTRANCES[0].wy)<TS*2.5){
              s.gameStage=LL_COMPLETE
              if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}
            }
          }

          // movement
          if(!s.dayOver&&s.gameStage<LL_COMPLETE&&!anyDialogue){
            const{dx,dy}=computeMoveDelta(keys,spd,s.pointerDown,s.px,s.py,s.pointerWX,s.pointerWY)
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy);let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=foliageHitR(fn.type)
                const hcy=fn.wy-foliageHitOY(fn.type)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              for(const dn of MUSHROOMS){
                const ddx=nx-dn.wx,ddy=ny-dn.wy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+AMBIENT_DECOR_HIT_R
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON INVEST GAME FLOW  (Lesson 37, Island Trading Center)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonInvest"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(!nearBloo)s.blooRecapOpen=false
          const blooDialogue=nearBloo&&(s.gameStage===LIV_INTRO||s.gameStage===LIV_BOAT)
          const anyDialogue=blooDialogue||s.livTradeMenu||s.blooRecapOpen
          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)

          // boat moves north once the second dialogue phase starts
          if(s.gameStage>=LIV_BOAT&&!s.boatGone){
            s.boatY-=LIV_BOAT_SPEED
            if(s.boatY<-TS*3)s.boatGone=true
          }

          // seed growth timer
          if(s.livSeeds>0&&s.livSeedTimer>0){
            s.livSeedTimer--
            if(s.livSeedTimer===0){
              const gained=s.livSeeds*LIV_SEED_BERRY_YIELD
              s.inventory.berries+=gained;claimInventorySlot(s.inventory,"berry")
              s.notifText=`Seeds sprouted! +${gained} berries! 🌱`;s.notifTimer=240
              s.livSeeds=0
            }
          }

          const eDown=keys.has("z")||keys.has("Z")
          let eUsed=false
          const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

          const portNpc=s.npcs[4]
          const nearPort=portNpc?Math.hypot(s.px-portNpc.x,s.py-portNpc.y)<TS*2.5:false
          const nearMarket=Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2.5

          // close trade menu with [X]
          if((keys.has("x")||keys.has("X"))&&s.livTradeMenu){
            s.livTradeMenu=false;keys.delete("x");keys.delete("X")
          }
          // navigate trade menu with arrow keys
          if(s.livTradeMenu){
            if(keys.has("ArrowUp")||keys.has("w")||keys.has("W")){s.livTradeMenuIdx=(s.livTradeMenuIdx+2)%3;keys.delete("ArrowUp");keys.delete("w");keys.delete("W")}
            if(keys.has("ArrowDown")||keys.has("s")||keys.has("S")){s.livTradeMenuIdx=(s.livTradeMenuIdx+1)%3;keys.delete("ArrowDown");keys.delete("s");keys.delete("S")}
          }

          // 1. bloo intro
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===LIV_INTRO){
            s.dialogIdx++;if(s.dialogIdx>=LIV_BLOO_INTRO.length){s.gameStage=LIV_BOAT;s.dialogIdx=0}
            consumeE()
          }
          // 2. bloo boat dialogue
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===LIV_BOAT){
            s.dialogIdx++;
            if(s.dialogIdx>=LIV_BLOO_BOAT.length){
              s.gameStage=LIV_TRADE;s.dialogIdx=0
              s.notifText="Walk to the Port Trader at the dock, press [Z]!";s.notifTimer=360
            }
            consumeE()
          }
          // 3. sell wood at Market
          if(eDown&&!eUsed&&s.gameStage===LIV_TRADE&&s.livWood>0&&nearMarket&&!s.livTradeMenu){
            const coins=s.livWood*LIV_WOOD_COINS
            s.inventory.coins+=coins
            s.notifText=`Sold ${s.livWood} wood for +${coins} coins! 💰`;s.notifTimer=200
            s.livWood=0
            consumeE()
          }
          // 4. open/buy from trade menu at Port Trader
          if(eDown&&!eUsed&&s.gameStage===LIV_TRADE&&nearPort){
            if(!s.livTradeMenu){
              s.livTradeMenu=true;s.livTradeMenuIdx=0;consumeE()
            }else{
              const costs=[LIV_BREAD_COST,LIV_SEED_COST,LIV_WOOD_COST]
              const cost=costs[s.livTradeMenuIdx]
              if(s.inventory.berries>=cost){
                s.inventory.berries-=cost
                s.livBerriesSoldTotal+=cost
                s.livTrades++
                if(s.livTradeMenuIdx===0){s.livBread++}
                else if(s.livTradeMenuIdx===1){s.livSeeds++;if(s.livSeedTimer===0)s.livSeedTimer=LIV_SEED_GROW_FRAMES}
                else{s.livWood++}
                const msgs=["🍞 Got Bread, eat [X] to restore energy!","🌱 Seeds planted! Come back in 15s for berries.","🪵 Got Wood! Sell it at the Market (south-east)."]
                s.notifText=`Trade ${s.livTrades}/${LIV_TRADES_NEEDED}: ${msgs[s.livTradeMenuIdx]}`;s.notifTimer=200
                if(s.livTrades>=LIV_TRADES_NEEDED&&!s.completionCalled){
                  s.gameStage=LIV_COMPLETE;s.completionCalled=true;completeRef.current?.()
                }
              }else{
                s.notifText=`Need ${cost} berries, only have ${s.inventory.berries}!`;s.notifTimer=120
              }
              consumeE()
            }
          }
          // 5. recap: Z near Bloo outside a live dialogue repeats his last line
          if(eDown&&!eUsed&&nearBloo&&!blooDialogue&&s.blooLastLine){
            s.blooRecapOpen=!s.blooRecapOpen
            consumeE()
          }

          updateNpcs(s.npcs)

          // movement
          if(!s.dayOver&&s.gameStage<LIV_COMPLETE&&!anyDialogue){
            const{dx,dy}=computeMoveDelta(keys,spd,s.pointerDown,s.px,s.py,s.pointerWX,s.pointerWY)
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy);let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=foliageHitR(fn.type)
                const hcy=fn.wy-foliageHitOY(fn.type)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              for(const dn of MUSHROOMS){
                const ddx=nx-dn.wx,ddy=ny-dn.wy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+AMBIENT_DECOR_HIT_R
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON FARM GAME FLOW (dynamic Income stream, "farm" choice)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonFarm"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(!nearBloo)s.blooRecapOpen=false
          const blooDialogue=nearBloo&&s.gameStage===FARM_TALK_BLOO
          const binkDialogue=s.gameStage===FARM_BINK_INTERRUPT
          const choiceOpen=s.gameStage===FARM_CLEAR_CHOICE
          const revealDialogue=s.gameStage===FARM_PLANT_REVEAL
          const seedsPitchDialogue=s.gameStage===FARM_SEEDS_PITCH
          const wrapDialogue=s.gameStage===FARM_WRAP_UP
          const marketIsOpen=marketOpenRef.current
          const anyDialogue=blooDialogue||binkDialogue||choiceOpen||revealDialogue||seedsPitchDialogue||wrapDialogue||s.blooRecapOpen||s.sellMenu!==null||marketIsOpen

          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)
          updateNpcs(s.npcs,s.sellMenu?.npcIdx??-1)

          const eDown=keys.has("z")||keys.has("Z")
          let eUsed=false
          const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

          // sell-menu arrow keys + close with [X], lets the player grind
          // berries into coins any time they're short.
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-smNpc.tradesDone)
            if(keys.has("ArrowRight")||keys.has("ArrowUp")){s.sellMenu.amount=Math.min(s.sellMenu.amount+1,maxSell);keys.delete("ArrowRight");keys.delete("ArrowUp")}
            if(keys.has("ArrowLeft")||keys.has("ArrowDown")){s.sellMenu.amount=Math.max(s.sellMenu.amount-1,0);keys.delete("ArrowLeft");keys.delete("ArrowDown")}
          }
          if((keys.has("x")||keys.has("X"))&&s.sellMenu!==null&&s.sellMenu.phase==="select"){s.sellMenu=null;keys.delete("x");keys.delete("X")}

          // 0. sell-menu confirm
          if(eDown&&!eUsed&&s.sellMenu!==null){
            if(s.sellMenu.phase==="result"){s.sellMenu=null}
            else if(s.sellMenu.amount>0){
              const smNpc=s.npcs[s.sellMenu.npcIdx],amt=s.sellMenu.amount
              const alloc=sellAllocation(amt,s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms)
              let earned=sellEarnings(alloc,FLAT_SELL_PRICES)
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed
              if(gettingTip){earned+=LB_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=alloc.fromBerries;s.inventory.apples-=alloc.fromApples
              s.inventory.wood-=alloc.fromWood;s.inventory.mushrooms-=alloc.fromMushrooms
              s.inventory.coins+=earned
              smNpc.tradesDone+=amt;if(smNpc.tradeTimer===0)smNpc.tradeTimer=LB_NPC_BUY_RESET
              if(gettingTip){s.notifText=`Market Trader tipped you +${LB_TIP_COINS} coins! 🎉`;s.notifTimer=300}
              s.sellMenu={npcIdx:s.sellMenu.npcIdx,amount:amt,phase:"result",resultLine:L1_NPC_SOLD[s.sellMenu.npcIdx],earnedCoins:earned}
            }
            consumeE()
          }
          // 1. Bloo intro: sends the player toward the Market for Pest-Bugs
          if(eDown&&!eUsed&&blooDialogue){
            s.dialogIdx++
            if(s.dialogIdx>=FARM_BLOO_INTRO.length){s.gameStage=FARM_TO_MARKET;s.dialogIdx=0}
            consumeE()
          }
          // 2. Walking toward the Market — Bink rolls up and interrupts
          if(eDown&&!eUsed&&s.gameStage===FARM_TO_MARKET){
            if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2.5){
              s.gameStage=FARM_BINK_INTERRUPT;s.binkDialogIdx=0
              consumeE()
            }
          }
          // 3. Bink's interrupt pitch (alternating Bink/Bloo) — ends by opening the choice
          if(eDown&&!eUsed&&binkDialogue){
            s.binkDialogIdx++
            if(s.binkDialogIdx>=FARM_BINK_INTERRUPT_LINES.length){s.gameStage=FARM_CLEAR_CHOICE;s.farmChoiceIdx=0}
            consumeE()
          }
          // 3b. Choice navigation + confirm — doesn't resolve instantly, just sends
          // the player to go finalize it in person (at Bink, or at the Market).
          if(choiceOpen){
            const n=FARM_CLEAR_CHOICE_OPTIONS.length
            if(keys.has("ArrowUp")){s.farmChoiceIdx=(s.farmChoiceIdx+n-1)%n;keys.delete("ArrowUp")}
            if(keys.has("ArrowDown")){s.farmChoiceIdx=(s.farmChoiceIdx+1)%n;keys.delete("ArrowDown")}
            if(eDown&&!eUsed){
              s.farmChosenRoute=FARM_CLEAR_CHOICE_OPTIONS[s.farmChoiceIdx].id as "bugs"|"weeder"
              s.gameStage=FARM_RESOLVE_CLEARING
              consumeE()
            }
          }
          // 3c. Resolve the clearing in person — press [Z] at Bink or the Market
          if(eDown&&!eUsed&&s.gameStage===FARM_RESOLVE_CLEARING){
            if(s.farmChosenRoute==="weeder"){
              if(Math.hypot(s.px-FARM_BINK_X,s.py-FARM_BINK_Y)<FARM_INTERACT){
                const{state,coinsDelta}=clearPlotWithBinkWeeder(s.farmState)
                s.farmState=state;s.inventory.coins+=coinsDelta
                s.gameStage=FARM_PLANT_REVEAL;s.farmRevealIdx=0
                consumeE()
              }
            }else if(s.farmChosenRoute==="bugs"){
              if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2){
                const{state,coinsDelta}=clearPlotWithPestBugs(s.farmState)
                s.farmState=state;s.inventory.coins+=coinsDelta
                s.gameStage=FARM_PLANT_REVEAL;s.farmRevealIdx=0
                consumeE()
              }
            }
          }
          // 4. Bloo explains the assigned plant — replaces any popup entirely
          if(eDown&&!eUsed&&revealDialogue){
            const plant=s.farmState.assignedPlant?PLANT_REGISTRY[s.farmState.assignedPlant]:null
            const lines=plant?plantRevealLines(plant):["Let's get that plot growing!"]
            s.farmRevealIdx++
            if(s.farmRevealIdx>=lines.length){s.gameStage=FARM_SEEDS_PITCH;s.farmSeedsPitchIdx=0}
            consumeE()
          }
          // 5. Bloo pitches buying seeds — no funding decision this time, just go buy them
          if(eDown&&!eUsed&&seedsPitchDialogue){
            s.farmSeedsPitchIdx++
            if(s.farmSeedsPitchIdx>=FARM_SEEDS_PITCH_LINES.length){s.gameStage=FARM_TO_MARKET_SEEDS}
            consumeE()
          }
          // 6. Planting — press [Z] near any row to plant that whole row
          if(eDown&&!eUsed&&s.gameStage===FARM_PLANTING){
            for(let i=0;i<FARM_ROW_CENTERS.length;i++){
              const rc=FARM_ROW_CENTERS[i]
              if(!s.farmState.rowsPlanted[i]&&Math.hypot(s.px-rc.wx,s.py-rc.wy)<FARM_INTERACT){
                const{state,success}=plantRow(s.farmState,i)
                if(success){
                  s.farmState=state
                  if(s.farmState.rowsPlanted.every(Boolean))s.gameStage=FARM_HARVEST
                }
                consumeE()
                break
              }
            }
          }
          // 7. Harvest & sell — press [Z] near any planted row to harvest it
          if(eDown&&!eUsed&&s.gameStage===FARM_HARVEST){
            for(let i=0;i<FARM_ROW_CENTERS.length;i++){
              const rc=FARM_ROW_CENTERS[i]
              if(!s.farmState.rowsHarvested[i]&&Math.hypot(s.px-rc.wx,s.py-rc.wy)<FARM_INTERACT){
                const{state,coinsDelta,success}=harvestRow(s.farmState,i)
                if(success){
                  s.farmState=state;s.inventory.coins+=coinsDelta
                  s.notifText=s.farmState.binkFeePerSale>0
                    ?`🌾 Sold row ${i+1} for ${coinsDelta} coins... Bink quietly took ${s.farmState.binkFeePerSale}. So *that* was the "convenience fee."`
                    :`🌾 Sold row ${i+1} for ${coinsDelta} coins!`
                  s.notifTimer=260
                  if(s.farmState.rowsHarvested.every(Boolean)){s.gameStage=FARM_WRAP_UP;s.farmWrapIdx=0}
                }
                consumeE()
                break
              }
            }
          }
          // 8. Wrap-up dialogue
          if(eDown&&!eUsed&&wrapDialogue){
            s.farmWrapIdx++
            if(s.farmWrapIdx>=FARM_WRAP_UP_LINES.length){
              s.gameStage=FARM_COMPLETE
              if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}
            }
            consumeE()
          }
          // 9. open the sell menu near any NPC — income recovery any time after intro
          if(eDown&&!eUsed&&s.gameStage>=FARM_TO_MARKET&&s.gameStage<FARM_COMPLETE&&s.sellMenu===null&&!marketIsOpen){
            let nearNpcIdx=-1,nearNpcDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nearNpcDist){nearNpcDist=d;nearNpcIdx=i}}
            if(nearNpcIdx>=0){
              const npc=s.npcs[nearNpcIdx],maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0};consumeE()
            }
          }
          // 10. open the Market popup near the Market entrance during the seed-buying task
          if(eDown&&!eUsed&&s.gameStage===FARM_TO_MARKET_SEEDS){
            if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2){setMarketOpen(true);consumeE()}
          }
          // 11. recap: Z near Bloo outside a live dialogue repeats his last line
          if(eDown&&!eUsed&&nearBloo&&!blooDialogue&&!seedsPitchDialogue&&s.blooLastLine){
            s.blooRecapOpen=!s.blooRecapOpen
            consumeE()
          }

          // movement
          if(!s.dayOver&&s.gameStage<FARM_COMPLETE&&!anyDialogue){
            const{dx,dy}=computeMoveDelta(keys,spd,s.pointerDown,s.px,s.py,s.pointerWX,s.pointerWY)
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy)
              let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=foliageHitR(fn.type)
                const hcy=fn.wy-foliageHitOY(fn.type)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy)
                const minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              for(const dn of MUSHROOMS){
                const ddx=nx-dn.wx,ddy=ny-dn.wy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+AMBIENT_DECOR_HIT_R
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON FISH GAME FLOW (Lesson 5 — fishing income stream)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonFish"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(!nearBloo)s.blooRecapOpen=false
          const blooDialogue=nearBloo&&s.gameStage===FISH_TALK_BLOO
          const talloDialogue=s.gameStage===FISH_TALLO_INTERRUPT
          const wrapDialogue=s.gameStage===FISH_WRAP_UP
          const scrollOpen=fishScrollRef.current!==null
          const anyDialogue=blooDialogue||talloDialogue||wrapDialogue||s.blooRecapOpen||s.sellMenu!==null||scrollOpen

          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)
          updateNpcs(s.npcs,s.sellMenu?.npcIdx??-1)

          const eDown=keys.has("z")||keys.has("Z")
          let eUsed=false
          const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

          // sell-menu arrow keys + close with [X] — income recovery if short on cash
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-smNpc.tradesDone)
            if(keys.has("ArrowRight")||keys.has("ArrowUp")){s.sellMenu.amount=Math.min(s.sellMenu.amount+1,maxSell);keys.delete("ArrowRight");keys.delete("ArrowUp")}
            if(keys.has("ArrowLeft")||keys.has("ArrowDown")){s.sellMenu.amount=Math.max(s.sellMenu.amount-1,0);keys.delete("ArrowLeft");keys.delete("ArrowDown")}
          }
          if((keys.has("x")||keys.has("X"))&&s.sellMenu!==null&&s.sellMenu.phase==="select"){s.sellMenu=null;keys.delete("x");keys.delete("X")}

          // 0. sell-menu confirm
          if(eDown&&!eUsed&&s.sellMenu!==null){
            if(s.sellMenu.phase==="result"){s.sellMenu=null}
            else if(s.sellMenu.amount>0){
              const smNpc=s.npcs[s.sellMenu.npcIdx],amt=s.sellMenu.amount
              const alloc=sellAllocation(amt,s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms)
              let earned=sellEarnings(alloc,FLAT_SELL_PRICES)
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed
              if(gettingTip){earned+=LB_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=alloc.fromBerries;s.inventory.apples-=alloc.fromApples
              s.inventory.wood-=alloc.fromWood;s.inventory.mushrooms-=alloc.fromMushrooms
              s.inventory.coins+=earned
              smNpc.tradesDone+=amt;if(smNpc.tradeTimer===0)smNpc.tradeTimer=LB_NPC_BUY_RESET
              if(gettingTip){s.notifText=`Market Trader tipped you +${LB_TIP_COINS} coins! 🎉`;s.notifTimer=300}
              s.sellMenu={npcIdx:s.sellMenu.npcIdx,amount:amt,phase:"result",resultLine:L1_NPC_SOLD[s.sellMenu.npcIdx],earnedCoins:earned}
            }
            consumeE()
          }
          // 1. Bloo intro — sends the player toward the Community Cottage/Market for gear
          if(eDown&&!eUsed&&blooDialogue){
            s.dialogIdx++
            if(s.dialogIdx>=FISH_BLOO_INTRO.length){s.gameStage=FISH_TO_MARKET;s.dialogIdx=0}
            consumeE()
          }
          // 2. Passing the Community Cottage — Tallo rolls up and interrupts
          if(eDown&&!eUsed&&s.gameStage===FISH_TO_MARKET){
            if(Math.hypot(s.px-ENTRANCES[2].wx,s.py-ENTRANCES[2].wy)<TS*2){
              s.gameStage=FISH_TALLO_INTERRUPT;s.talloDialogIdx=0
              consumeE()
            }
          }
          // 3. Tallo's pitch — ends by opening the official rod-choice scroll
          if(eDown&&!eUsed&&talloDialogue){
            s.talloDialogIdx++
            if(s.talloDialogIdx>=FISH_TALLO_INTERRUPT_LINES.length){s.gameStage=FISH_ROD_CHOICE;setFishScrollKind("rod")}
            consumeE()
          }
          // 4. Buy bait at the Market
          if(eDown&&!eUsed&&s.gameStage===FISH_BUY_BAIT&&!scrollOpen){
            if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2){
              if(s.inventory.coins>=FISH_BAIT_COST){
                s.inventory.coins-=FISH_BAIT_COST;s.fishBaitCans++
                s.gameStage=FISH_TO_PIER
              }else{
                s.notifText="Not enough coins for bait — go sell some fish or berries!";s.notifTimer=240
              }
              consumeE()
            }
          }
          // 5. Reach the pier
          if(eDown&&!eUsed&&s.gameStage===FISH_TO_PIER){
            if(Math.hypot(s.px-FISH_PIER_X,s.py-FISH_PIER_Y)<FISH_INTERACT){
              s.gameStage=FISH_FISHING
              consumeE()
            }
          }
          // 6. Fishing casts — [Z] at the pier, one cast at a time
          if(eDown&&!eUsed&&s.gameStage===FISH_FISHING){
            if(Math.hypot(s.px-FISH_PIER_X,s.py-FISH_PIER_Y)<FISH_INTERACT){
              if(s.fishRodBorrowed&&Math.random()<FISH_BORROW_SNAP_CHANCE){
                s.fishRodSnapped=true
                s.notifText="💥 The rod snapped! You lost that catch.";s.notifTimer=240
                s.gameStage=FISH_WRAP_UP;s.fishWrapIdx=0
              }else{
                const[lo,hi]=s.fishRodBorrowed?[1,8]:[3,6]
                const catchAmt=Math.floor(Math.random()*(hi-lo+1))+lo
                s.inventory.coins+=catchAmt
                s.fishCastsDone++
                s.notifText=`🐟 Caught a fish worth ${catchAmt} coins!`;s.notifTimer=200
                if(s.fishCastsDone>=FISH_CASTS_NEEDED){s.gameStage=FISH_WRAP_UP;s.fishWrapIdx=0}
              }
              consumeE()
            }
          }
          // 7. Wrap-up dialogue
          if(eDown&&!eUsed&&wrapDialogue){
            const lines=fishWrapLines(s.fishRodBorrowed)
            s.fishWrapIdx++
            if(s.fishWrapIdx>=lines.length){
              s.gameStage=FISH_COMPLETE
              if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}
            }
            consumeE()
          }
          // 8. open the sell menu near any NPC — income recovery any time after intro
          if(eDown&&!eUsed&&s.gameStage>=FISH_TO_MARKET&&s.gameStage<FISH_COMPLETE&&s.sellMenu===null&&!scrollOpen){
            let nearNpcIdx=-1,nearNpcDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nearNpcDist){nearNpcDist=d;nearNpcIdx=i}}
            if(nearNpcIdx>=0){
              const npc=s.npcs[nearNpcIdx],maxSell=Math.min(combinedGoods(s.inventory),LB_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0};consumeE()
            }
          }
          // 9. recap: Z near Bloo outside a live dialogue repeats his last line
          if(eDown&&!eUsed&&nearBloo&&!blooDialogue&&s.blooLastLine){
            s.blooRecapOpen=!s.blooRecapOpen
            consumeE()
          }

          // movement
          if(!s.dayOver&&s.gameStage<FISH_COMPLETE&&!anyDialogue){
            const{dx,dy}=computeMoveDelta(keys,spd,s.pointerDown,s.px,s.py,s.pointerWX,s.pointerWY)
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy)
              let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=foliageHitR(fn.type)
                const hcy=fn.wy-foliageHitOY(fn.type)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy)
                const minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              for(const dn of MUSHROOMS){
                const ddx=nx-dn.wx,ddy=ny-dn.wy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+AMBIENT_DECOR_HIT_R
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        }

        // ── Pick up nearby drops ───────────────────────────────────────────
        if(!s.dayOver){
          s.drops=s.drops.filter(drop=>{
            if(Math.hypot(s.px-drop.wx,s.py-drop.wy)<TS*1.5){
              s.inventory.berries+=drop.berries;s.inventory.apples+=drop.apples;s.inventory.coins+=drop.coins
              if(drop.berries>0)claimInventorySlot(s.inventory,"berry")
              if(drop.apples>0)claimInventorySlot(s.inventory,"apple")
              const parts:string[]=[]
              if(drop.berries>0)parts.push(`🍓×${drop.berries}`)
              if(drop.apples>0)parts.push(`🍎×${drop.apples}`)
              if(drop.coins>0)parts.push(`🪙×${drop.coins}`)
              if(parts.length>0){s.notifText=`Picked up ${parts.join(" ")}!`;s.notifTimer=150}
              return false
            }
            return true
          })
        }

        // ── Shared: notification timer + restart ───────────────────────────
        if(s.notifTimer>0)s.notifTimer--
        if(s.dayOver&&(keys.has("r")||keys.has("R"))){
          s.sustenance=SUSTENANCE_MAX;s.dayOver=false
          // Respawn at owned house or default island start
          if(s.ownedHouseIdx>=0&&s.ownedHouseIdx<ENTRANCES.length){
            s.px=ENTRANCES[s.ownedHouseIdx].wx;s.py=ENTRANCES[s.ownedHouseIdx].wy
          }else{
            s.px=38*TS;s.py=21*TS
          }
          keys.clear()
        }

        // ── Render ─────────────────────────────────────────────────────────
        const cw=canvas.offsetWidth,ch=canvas.offsetHeight
        const camX=Math.max(0,Math.min(s.px-cw/2,MAP_W*TS-cw))
        const camY=Math.max(0,Math.min(s.py-ch/2,MAP_H*TS-ch))
        ctx.clearRect(0,0,cw,ch)

        const c0=Math.max(0,Math.floor(camX/TS)),c1=Math.min(MAP_W-1,Math.ceil((camX+cw)/TS))
        const r0=Math.max(0,Math.floor(camY/TS)),r1=Math.min(MAP_H-1,Math.ceil((camY+ch)/TS))

        for(let r=r0;r<=r1;r++){
          for(let c=c0;c<=c1;c++){
            const t=MAP[r][c],sx=c*TS-camX,sy=r*TS-camY
            if(t===WATER){const img=waterImg(imgs,s.frame,r,c);img?blit(ctx,img,sx,sy):fbWater(ctx,sx,sy)}
            else if(t===GRASS){
              if(FLOWER_MAP[r]?.[c]){const img=flowerImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbGrass(ctx,sx,sy,r,c)}
              else{const img=grassImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbGrass(ctx,sx,sy,r,c)}
              if(GRASS_EDGE[r]?.[c])tintGrassEdge(ctx,sx,sy)
            }
            else if(t===PATH){
              const img=pathImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbPath(ctx,sx,sy)
              if(PATH_EDGE[r]?.[c])tintPathEdge(ctx,sx,sy)
            }
            else if(t>=B_INCOME){const img=pathImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbPath(ctx,sx,sy)}
          }
        }

        drawBiomDecor(ctx,camX,camY,cw,ch,imgs,s.logs)
        drawBridges(ctx,camX,camY,imgs)

        if(variant==="lessonInvest"){
          drawPortDock(ctx,camX,camY)
          if(!s.boatGone)drawInvestBoat(ctx,LIV_BOAT_X,s.boatY,s.frame,camX,camY)
        }

        const npcMaxTrades=variant==="lesson1"?L1_NPC_MAX_TRADES:variant==="lessonInvest"?LIV_TRADES_NEEDED:LB_NPC_MAX_TRADES
        drawNpcs(ctx,s.npcs,camX,camY,npcMaxTrades)
        if(variant==="lessonFarm"){
          drawFarmPlot(ctx,camX,camY,s.farmState.rowsPlanted,s.farmState.rowsHarvested,s.farmState.plotUnlocked,imgs)
          if(s.gameStage<=FARM_RESOLVE_CLEARING)drawBink(ctx,camX,camY,s.gameStage===FARM_RESOLVE_CLEARING&&s.farmChosenRoute==="weeder"&&Math.hypot(s.px-FARM_BINK_X,s.py-FARM_BINK_Y)<FARM_INTERACT)
        }
        if(variant==="lessonFish"){
          drawPortDock(ctx,camX,camY,"🎣 FISHING")
          drawFishGearIcon(ctx,camX,camY,s.fishOwnsRod,s.fishRodBorrowed)
          if(s.gameStage<=FISH_TALLO_INTERRUPT)drawTallo(ctx,camX,camY,false)
        }
        drawBloo(ctx,s.bloo,camX,camY,Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)<TS*2.5)

        const nearFoliageNode=nearFoliageIdx>=0?s.foliage[nearFoliageIdx]:null
        const fBehind=s.foliage.filter(n=>n.wy<s.py)
        const fFront=s.foliage.filter(n=>n.wy>=s.py)
        drawFoliage(ctx,fBehind,camX,camY,cw,ch,imgs,nearFoliageNode)
        drawSharedPlayer(ctx,s.px-camX,s.py-camY,playerColor)
        drawDrops(ctx,s.drops,camX,camY)
        drawFoliage(ctx,fFront,camX,camY,cw,ch,imgs,nearFoliageNode)
        drawBuildings(ctx,camX,camY,cw,ch,imgs)

        // Task sign (left) and top bar (center) must never overlap. The top
        // bar can always wrap its tabs into a single narrow column (down to
        // ~90px), so that's reserved as its floor *before* the task sign is
        // allowed to claim the rest of the width.
        const GAP=8
        const TOPBAR_MIN=100
        const rightBoundary=cw-8
        const taskRightLimit=Math.max(8+140,rightBoundary-GAP-TOPBAR_MIN)
        s.foodBarRect=drawTopBar(ctx,cw,s.sustenance,s.inventory,s.harvestCooldown,variant,s.gameStage,imgs,taskRightLimit+GAP,rightBoundary)

        // task sign
        let taskLabel:string
        if(variant==="lesson1"){
          if(s.gameStage===L1_INTRO)taskLabel="📍 Talk to Bloo, your guide"
          else if(s.gameStage===L1_HARVEST)taskLabel=":berry: Harvest [Z] then eat [X] a berry"
          else if(s.gameStage===L1_TOUR)taskLabel="💬 Talk to Bloo"
          else if(s.gameStage===L1_FORAGE)taskLabel=`🧺 Collect ${L1_FORAGE_GOAL} items (${combinedGoods(s.inventory)}/${L1_FORAGE_GOAL})`
          else if(s.gameStage===L1_SELL_INTRO)taskLabel="💬 Talk to Bloo at the Market"
          else if(s.gameStage===L1_SELLING)taskLabel=`🪙 Sell everything [Z] — ${combinedGoods(s.inventory)} item${combinedGoods(s.inventory)===1?"":"s"} left`
          else if(s.gameStage===L1_WRAP_UP)taskLabel="💬 Talk to Bloo"
          else taskLabel="✅ Lesson complete!"
        }else if(variant==="lessonBudget"){
          const labels=["📍 Talk to Bloo","🏠 Press [Z] near a building to check the price","💬 Talk to Bloo — what is a budget?","✅ Lesson complete!"]
          taskLabel=labels[Math.min(s.gameStage,LB_COMPLETE)]
        }else if(variant==="lessonLoans"){
          const labels=["📍 Talk to Bloo","🏠 Press [Z] near a building to check the price","💬 Talk to Bloo again","🏦 Head to the blue building (the bank)","✅ Lesson complete!"]
          taskLabel=labels[Math.min(s.gameStage,LL_COMPLETE)]
        }else if(variant==="lessonInvest"){
          const livLabels=["📍 Talk to Bloo, your guide","🚢 Watch the trade vessel depart",`🪙 Trade at the Port (${s.livTrades}/${LIV_TRADES_NEEDED}) — [Z] near dock`,"✅ Lesson complete!"]
          taskLabel=livLabels[Math.min(s.gameStage,LIV_COMPLETE)]
        }else if(variant==="lessonFish"){
          if(s.gameStage===FISH_TALK_BLOO)taskLabel="📍 Talk to Bloo, your guide"
          else if(s.gameStage===FISH_TO_MARKET)taskLabel="📍 Head toward the Community Cottage"
          else if(s.gameStage===FISH_TALLO_INTERRUPT)taskLabel="💬 Tallo is interrupting..."
          else if(s.gameStage===FISH_ROD_CHOICE)taskLabel="📍 Make your choice"
          else if(s.gameStage===FISH_BUY_BAIT)taskLabel=`📍 Buy bait at the Market (${FISH_BAIT_COST} coins)`
          else if(s.gameStage===FISH_TO_PIER)taskLabel="📍 Head to the pier"
          else if(s.gameStage===FISH_FISHING)taskLabel=`🎣 Fish at the pier (${stateRef.current.fishCastsDone}/${FISH_CASTS_NEEDED})`
          else if(s.gameStage===FISH_WRAP_UP)taskLabel="💬 Talk to Bloo"
          else taskLabel="✅ Lesson complete!"
        }else{
          const fs=stateRef.current.farmState
          if(s.gameStage===FARM_TALK_BLOO)taskLabel="📍 Talk to Bloo, your guide"
          else if(s.gameStage===FARM_TO_MARKET)taskLabel="📍 Head toward the Market"
          else if(s.gameStage===FARM_BINK_INTERRUPT)taskLabel="💬 Bink is interrupting..."
          else if(s.gameStage===FARM_CLEAR_CHOICE)taskLabel="📍 Make your choice"
          else if(s.gameStage===FARM_RESOLVE_CLEARING)taskLabel=s.farmChosenRoute==="weeder"?"📍 Walk up to Bink":`📍 Head to the Market (${PEST_BUG_COST} coins)`
          else if(s.gameStage===FARM_PLANT_REVEAL)taskLabel="💬 Talk to Bloo"
          else if(s.gameStage===FARM_SEEDS_PITCH)taskLabel="💬 Talk to Bloo"
          else if(s.gameStage===FARM_TO_MARKET_SEEDS)taskLabel=`📍 Buy seed packs at the Market (${fs.seedsOwned}/${SEEDS_NEEDED} seeds)`
          else if(s.gameStage===FARM_PLANTING)taskLabel=`📍 Plant every row (${fs.rowsPlanted.filter(Boolean).length}/${FARM_PLOT_ROWS})`
          else if(s.gameStage===FARM_HARVEST)taskLabel=`🌾 Harvest & sell every row (${fs.rowsHarvested.filter(Boolean).length}/${FARM_PLOT_ROWS})`
          else if(s.gameStage===FARM_WRAP_UP)taskLabel="💬 Talk to Bloo"
          else taskLabel="✅ Lesson complete!"
        }
        if(!freeplay)drawTaskSign(ctx,taskLabel,8,8,cw,imgs,taskRightLimit)
        const invPanelH=inventoryPanelHeight(), invY=Math.round(ch/2-invPanelH/2)
        s.inventoryPanelRect={x:8,y:invY}
        const invDrag:InventoryDrag|null=s.invDragFromIndex!==null?{
          fromIndex:s.invDragFromIndex,
          overIndex:inventorySlotIndexAt(s.invDragPointerX,s.invDragPointerY,8,invY),
          pointerX:s.invDragPointerX,pointerY:s.invDragPointerY,
        }:null
        drawInventoryPanel(ctx,s.inventory,8,invY,imgs,invDrag)
        if(variant==="lessonInvest")drawLivInventory(ctx,8,invY+46,s.livBread,s.livSeeds,s.livWood,s.livSeedTimer,imgs)

        // ── Bottom prompts ────────────────────────────────────────────────
        // Skipped entirely while paused — a paused backdrop (e.g. behind the
        // CYOA scroll) should be a quiet idle scene, not popping its stage-0
        // dialogue box just because gameStage/proximity happen to match.
        if(!pausedRef.current)if(variant==="lessonBudget"){
          const bdBlooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const bdNearBloo=bdBlooDist<TS*2.5
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms,LB_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed)
          }else if(s.houseSaleOpen&&s.houseSaleIdx>=0){
            drawHouseSaleMenu(ctx,cw,ch,s.houseSaleIdx,s.inventory.coins)
          }else if(bdNearBloo&&(s.gameStage===LB_INTRO||s.gameStage===LB_BLOO_BUDGET)){
            const lines=s.gameStage===LB_INTRO?LB_BLOO_INTRO:LB_BLOO_BUDGET_TALK
            const line=lines[Math.min(s.dialogIdx,lines.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=lines.length-1,typeReveal(s,line))
          }else if(s.blooRecapOpen&&s.blooLastLine){
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",s.blooLastLine,true)
          }else{
            let nearNpcForPrompt=-1,nDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nDist){nDist=d;nearNpcForPrompt=i}}
            if(bdNearBloo&&s.blooLastLine){
              drawPrompt(ctx,cw,ch,"[Z] Ask Bloo to repeat that","#1e40af")
            }else if(nearNpcForPrompt>=0&&s.gameStage>=LB_EXPLORE&&s.gameStage<LB_COMPLETE){
              const npc=s.npcs[nearNpcForPrompt];let msg:string
              if(npc.tradesDone>=LB_NPC_MAX_TRADES)msg=`Full, comes back in ${Math.ceil(npc.tradeTimer/60)}s`
              else if(s.inventory.berries===0)msg="No berries, harvest some first!"
              else if(npc.isTipNpc)msg="[Z] Sell berries (+ possible tip!)"
              else msg="[Z] Sell berries"
              drawPrompt(ctx,cw,ch,msg,npc.tradesDone>=LB_NPC_MAX_TRADES||s.inventory.berries===0?"#dc2626":"#1e40af")
            }else if(s.gameStage===LB_EXPLORE){
              for(let ei=1;ei<ENTRANCES.length;ei++){
                if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){
                  drawPrompt(ctx,cw,ch,`[Z] Check price: ${ENTRANCES[ei].name}`,"#1e40af");break
                }
              }
              if(nearFoliageNode){const fn=nearFoliageNode;const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:"";drawPrompt(ctx,cw,ch,`[Z] Harvest ${foliageLabel(fn.type)} (+${HARVEST_BERRIES} ${foliageItemName(fn.type)})${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")}
            }
          }
        }else if(variant==="lessonLoans"){
          const llBlooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const llNearBloo=llBlooDist<TS*2.5
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms,LB_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed)
          }else if(s.houseSaleOpen&&s.houseSaleIdx>=0){
            drawHouseSaleMenu(ctx,cw,ch,s.houseSaleIdx,s.inventory.coins)
          }else if(llNearBloo&&(s.gameStage===LL_INTRO||s.gameStage===LL_BLOO_TALK)){
            const lines=s.gameStage===LL_INTRO?LL_BLOO_INTRO:LL_BLOO_LOAN
            const line=lines[Math.min(s.dialogIdx,lines.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=lines.length-1,typeReveal(s,line))
          }else if(s.gameStage===LL_BANK){
            drawPrompt(ctx,cw,ch,"Head to the blue building in the center!","#1d4ed8")
          }else if(s.blooRecapOpen&&s.blooLastLine){
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",s.blooLastLine,true)
          }else{
            let nearNpcForPrompt=-1,nDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nDist){nDist=d;nearNpcForPrompt=i}}
            if(llNearBloo&&s.blooLastLine){
              drawPrompt(ctx,cw,ch,"[Z] Ask Bloo to repeat that","#1e40af")
            }else if(nearNpcForPrompt>=0&&s.gameStage>=LL_EXPLORE&&s.gameStage<LL_BANK){
              const npc=s.npcs[nearNpcForPrompt];let msg:string
              if(npc.tradesDone>=LB_NPC_MAX_TRADES)msg=`Full, comes back in ${Math.ceil(npc.tradeTimer/60)}s`
              else if(s.inventory.berries===0)msg="No berries, harvest some first!"
              else if(npc.isTipNpc)msg="[Z] Sell berries (+ possible tip!)"
              else msg="[Z] Sell berries"
              drawPrompt(ctx,cw,ch,msg,npc.tradesDone>=LB_NPC_MAX_TRADES||s.inventory.berries===0?"#dc2626":"#1e40af")
            }else if(s.gameStage===LL_EXPLORE){
              for(let ei=1;ei<ENTRANCES.length;ei++){
                if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){
                  drawPrompt(ctx,cw,ch,`[Z] Check price: ${ENTRANCES[ei].name}`,"#1e40af");break
                }
              }
              if(nearFoliageNode){const fn=nearFoliageNode;const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:"";drawPrompt(ctx,cw,ch,`[Z] Harvest ${foliageLabel(fn.type)} (+${HARVEST_BERRIES} ${foliageItemName(fn.type)})${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")}
            }
          }
        }else if(variant==="lesson1"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms,L1_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed,L1_SELL_PRICES)
          }else if(nearBloo&&s.gameStage===L1_HARVEST&&!s.blooHarvestDismissed){
            const line=L1_BLOO_HARVEST_REMIND[s.blooRemindIdx%L1_BLOO_HARVEST_REMIND.length]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,true,typeReveal(s,line))
          }else if(nearBloo&&(s.gameStage===L1_INTRO||s.gameStage===L1_TOUR||s.gameStage===L1_SELL_INTRO||s.gameStage===L1_WRAP_UP)){
            const lines=s.gameStage===L1_INTRO?L1_BLOO_INTRO:s.gameStage===L1_TOUR?L1_BLOO_TOUR:s.gameStage===L1_SELL_INTRO?L1_BLOO_SELL_INTRO:L1_BLOO_WRAP_UP
            const line=lines[Math.min(s.dialogIdx,lines.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=lines.length-1,typeReveal(s,line))
          }else if(s.blooRecapOpen&&s.blooLastLine){
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",s.blooLastLine,true)
          }else{
            let nearNpcForPrompt=-1,nDist=Infinity
            for(let i=0;i<s.npcs.length;i++){
              const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y)
              if(d<TS*2.5&&d<nDist){nDist=d;nearNpcForPrompt=i}
            }
            if(nearBloo&&s.blooLastLine){
              drawPrompt(ctx,cw,ch,"[Z] Ask Bloo to repeat that","#1e40af")
            }else if(nearNpcForPrompt>=0&&s.gameStage===L1_SELLING){
              const npc=s.npcs[nearNpcForPrompt]
              let msg:string
              if(npc.tradesDone>=L1_NPC_MAX_TRADES)msg=`Full, comes back in ${Math.ceil(npc.tradeTimer/60)}s`
              else if(combinedGoods(s.inventory)===0)msg="Nothing left to sell — you're all done!"
              else if(npc.isTipNpc)msg="[Z] Sell items (+ possible bonus!)"
              else msg="[Z] Sell items"
              drawPrompt(ctx,cw,ch,msg,npc.tradesDone>=L1_NPC_MAX_TRADES||combinedGoods(s.inventory)===0?"#dc2626":"#1e40af")
            }else if(nearFoliageNode&&s.gameStage>=L1_HARVEST){
              const fn=nearFoliageNode
              const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:""
              drawPrompt(ctx,cw,ch,`[Z] Harvest ${foliageLabel(fn.type)} (+${HARVEST_BERRIES} ${foliageItemName(fn.type)})${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")
            }else{
              for(const e of ENTRANCES)if(Math.hypot(s.px-e.wx,s.py-e.wy)<TS*1.8){drawPrompt(ctx,cw,ch,`Press [Z] to enter ${e.name}`,"#1e40af");break}
            }
          }
        }else if(variant==="lessonInvest"){
          const livBlooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const livNearBloo=livBlooDist<TS*2.5
          const livPortNpc=s.npcs[4]
          const livNearPort=livPortNpc?Math.hypot(s.px-livPortNpc.x,s.py-livPortNpc.y)<TS*2.5:false
          const livNearMarket=Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2.5
          if(s.livTradeMenu){
            drawLivTradeMenu(ctx,cw,ch,s.inventory.berries,s.livTradeMenuIdx,s.livBread,s.livSeeds,s.livWood,imgs)
          }else if(livNearBloo&&(s.gameStage===LIV_INTRO||s.gameStage===LIV_BOAT)){
            const lines=s.gameStage===LIV_INTRO?LIV_BLOO_INTRO:LIV_BLOO_BOAT
            const line=lines[Math.min(s.dialogIdx,lines.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=lines.length-1,typeReveal(s,line))
          }else if(s.blooRecapOpen&&s.blooLastLine){
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",s.blooLastLine,true)
          }else if(livNearBloo&&s.blooLastLine){
            drawPrompt(ctx,cw,ch,"[Z] Ask Bloo to repeat that","#1e40af")
          }else if(s.livWood>0&&livNearMarket&&s.gameStage===LIV_TRADE){
            drawPrompt(ctx,cw,ch,`[Z] Sell ${s.livWood} wood → +${s.livWood*LIV_WOOD_COINS} coins`,"#065f46")
          }else if(livNearPort&&s.gameStage===LIV_TRADE){
            drawPrompt(ctx,cw,ch,`[Z] Open Trade Menu  (${s.livTrades}/${LIV_TRADES_NEEDED} trades done)`,"#0f766e")
          }else if(s.gameStage===LIV_TRADE&&!livNearPort){
            if(s.livWood>0)drawPrompt(ctx,cw,ch,"🪵 Have wood! Walk south-east to the Market to sell","#065f46")
            else drawPrompt(ctx,cw,ch,"Walk north to the Port Trader (teal square) — press [Z]","#64748b")
          }else if(nearFoliageNode&&s.gameStage===LIV_TRADE){
            const fn=nearFoliageNode
            const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:""
            drawPrompt(ctx,cw,ch,`[Z] Harvest ${foliageLabel(fn.type)} (+${HARVEST_BERRIES} ${foliageItemName(fn.type)})${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")
          }
        }else if(variant==="lessonFarm"){
          const farmBlooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const farmNearBloo=farmBlooDist<TS*2.5
          const plant=s.farmState.assignedPlant?PLANT_REGISTRY[s.farmState.assignedPlant]:null
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms,LB_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed)
          }else if(marketOpen){
            // The React FarmMarket overlay is on top — no canvas UI underneath.
          }else if(farmNearBloo&&s.gameStage===FARM_TALK_BLOO){
            const line=FARM_BLOO_INTRO[Math.min(s.dialogIdx,FARM_BLOO_INTRO.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=FARM_BLOO_INTRO.length-1,typeReveal(s,line))
          }else if(s.gameStage===FARM_TO_MARKET){
            if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2.5)drawPrompt(ctx,cw,ch,"[Z] Check the Market's gear prices","#1e40af")
            else drawPrompt(ctx,cw,ch,"Head toward the Market (south-east side of town)","#64748b")
          }else if(s.gameStage===FARM_BINK_INTERRUPT){
            const idx=Math.min(s.binkDialogIdx,FARM_BINK_INTERRUPT_LINES.length-1)
            const line=FARM_BINK_INTERRUPT_LINES[idx],speaker=FARM_BINK_INTERRUPT_SPEAKERS[idx]
            drawDialogBox(ctx,cw,ch,speaker,speaker==="Bloo"?"#3b82f6":"#a855f7",line,idx>=FARM_BINK_INTERRUPT_LINES.length-1,typeReveal(s,line))
          }else if(s.gameStage===FARM_CLEAR_CHOICE){
            drawChoiceDialogBox(ctx,cw,ch,"Bink","#a855f7",FARM_CLEAR_CHOICE_PROMPT,FARM_CLEAR_CHOICE_OPTIONS,s.farmChoiceIdx)
          }else if(s.gameStage===FARM_RESOLVE_CLEARING){
            if(s.farmChosenRoute==="weeder"){
              if(Math.hypot(s.px-FARM_BINK_X,s.py-FARM_BINK_Y)<FARM_INTERACT)drawPrompt(ctx,cw,ch,"[Z] Use Bink's Quick-Zap Weeder","#a855f7")
              else drawPrompt(ctx,cw,ch,"Walk up to Bink","#64748b")
            }else{
              if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2)drawPrompt(ctx,cw,ch,`[Z] Buy Pest-Bugs (${PEST_BUG_COST} coins)`,"#065f46")
              else drawPrompt(ctx,cw,ch,"Head to the Market","#64748b")
            }
          }else if(s.gameStage===FARM_PLANT_REVEAL){
            const lines=plant?plantRevealLines(plant):["Let's get that plot growing!"]
            const line=lines[Math.min(s.farmRevealIdx,lines.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.farmRevealIdx>=lines.length-1,typeReveal(s,line))
          }else if(s.gameStage===FARM_SEEDS_PITCH){
            const line=FARM_SEEDS_PITCH_LINES[Math.min(s.farmSeedsPitchIdx,FARM_SEEDS_PITCH_LINES.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.farmSeedsPitchIdx>=FARM_SEEDS_PITCH_LINES.length-1,typeReveal(s,line))
          }else if(s.gameStage===FARM_TO_MARKET_SEEDS){
            if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2)drawPrompt(ctx,cw,ch,"[Z] Open the Market","#065f46")
            else drawPrompt(ctx,cw,ch,`Buy seed packs at the Market (${s.farmState.seedsOwned}/${SEEDS_NEEDED} seeds)`,"#64748b")
          }else if(s.gameStage===FARM_PLANTING){
            let onRow=-1
            for(let i=0;i<FARM_ROW_CENTERS.length;i++){if(!s.farmState.rowsPlanted[i]&&Math.hypot(s.px-FARM_ROW_CENTERS[i].wx,s.py-FARM_ROW_CENTERS[i].wy)<FARM_INTERACT){onRow=i;break}}
            if(onRow>=0)drawPrompt(ctx,cw,ch,`[Z] Plant row ${onRow+1}`,"#166534")
            else drawPrompt(ctx,cw,ch,`Walk onto an unplanted row and press [Z] (${s.farmState.rowsPlanted.filter(Boolean).length}/${FARM_PLOT_ROWS} planted)`,"#64748b")
          }else if(s.gameStage===FARM_HARVEST){
            let onRow=-1
            for(let i=0;i<FARM_ROW_CENTERS.length;i++){if(!s.farmState.rowsHarvested[i]&&Math.hypot(s.px-FARM_ROW_CENTERS[i].wx,s.py-FARM_ROW_CENTERS[i].wy)<FARM_INTERACT){onRow=i;break}}
            if(onRow>=0)drawPrompt(ctx,cw,ch,`[Z] Harvest & sell row ${onRow+1}`,"#a16207")
            else drawPrompt(ctx,cw,ch,`Walk onto a planted row and press [Z] (${s.farmState.rowsHarvested.filter(Boolean).length}/${FARM_PLOT_ROWS} sold)`,"#64748b")
          }else if(s.gameStage===FARM_WRAP_UP){
            const line=FARM_WRAP_UP_LINES[Math.min(s.farmWrapIdx,FARM_WRAP_UP_LINES.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.farmWrapIdx>=FARM_WRAP_UP_LINES.length-1,typeReveal(s,line))
          }else if(s.blooRecapOpen&&s.blooLastLine){
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",s.blooLastLine,true)
          }else if(farmNearBloo&&s.blooLastLine){
            drawPrompt(ctx,cw,ch,"[Z] Ask Bloo to repeat that","#1e40af")
          }
        }else if(variant==="lessonFish"){
          const fishBlooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const fishNearBloo=fishBlooDist<TS*2.5
          const fishScrollShowing=fishScroll!==null
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,s.inventory.apples,s.inventory.wood,s.inventory.mushrooms,LB_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed)
          }else if(fishScrollShowing){
            // The React StoryScroll overlay is on top — no canvas UI underneath.
          }else if(fishNearBloo&&s.gameStage===FISH_TALK_BLOO){
            const line=FISH_BLOO_INTRO[Math.min(s.dialogIdx,FISH_BLOO_INTRO.length-1)]
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=FISH_BLOO_INTRO.length-1,typeReveal(s,line))
          }else if(s.gameStage===FISH_TO_MARKET){
            drawPrompt(ctx,cw,ch,"Head toward the Community Cottage to check gear prices","#64748b")
          }else if(s.gameStage===FISH_TALLO_INTERRUPT){
            const line=FISH_TALLO_INTERRUPT_LINES[Math.min(s.talloDialogIdx,FISH_TALLO_INTERRUPT_LINES.length-1)]
            drawDialogBox(ctx,cw,ch,"Tallo","#0ea5e9",line,s.talloDialogIdx>=FISH_TALLO_INTERRUPT_LINES.length-1,typeReveal(s,line))
          }else if(s.gameStage===FISH_BUY_BAIT){
            if(Math.hypot(s.px-ENTRANCES[4].wx,s.py-ENTRANCES[4].wy)<TS*2)drawPrompt(ctx,cw,ch,`[Z] Buy a can of bait (${FISH_BAIT_COST} coins)`,"#065f46")
            else drawPrompt(ctx,cw,ch,`Head to the Market and buy bait (${FISH_BAIT_COST} coins)`,"#64748b")
          }else if(s.gameStage===FISH_TO_PIER){
            if(Math.hypot(s.px-FISH_PIER_X,s.py-FISH_PIER_Y)<FISH_INTERACT)drawPrompt(ctx,cw,ch,"[Z] Start fishing","#0369a1")
            else drawPrompt(ctx,cw,ch,"Head to the pier","#64748b")
          }else if(s.gameStage===FISH_FISHING){
            if(Math.hypot(s.px-FISH_PIER_X,s.py-FISH_PIER_Y)<FISH_INTERACT)drawPrompt(ctx,cw,ch,`[Z] Cast your line (${s.fishCastsDone}/${FISH_CASTS_NEEDED})`,"#0369a1")
            else drawPrompt(ctx,cw,ch,"Walk onto the pier to fish","#64748b")
          }else if(s.gameStage===FISH_WRAP_UP){
            const lines=fishWrapLines(s.fishRodBorrowed)
            const line=lines[Math.min(s.fishWrapIdx,lines.length-1)]
            const speaker=s.fishRodBorrowed&&s.fishWrapIdx>=lines.length-1?"Tallo":"Bloo"
            const color=speaker==="Tallo"?"#0ea5e9":"#3b82f6"
            s.blooLastLine=line
            drawDialogBox(ctx,cw,ch,speaker,color,line,s.fishWrapIdx>=lines.length-1,typeReveal(s,line))
          }else if(s.blooRecapOpen&&s.blooLastLine){
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",s.blooLastLine,true)
          }else if(fishNearBloo&&s.blooLastLine){
            drawPrompt(ctx,cw,ch,"[Z] Ask Bloo to repeat that","#1e40af")
          }
        }

        // ── Shared overlays ───────────────────────────────────────────────
        if(s.notifTimer>0)drawNotifBanner(ctx,cw,ch,s.notifText,Math.min(1,s.notifTimer/40))
        if(s.dayOver)drawDayOver(ctx,cw,ch,s.deathDropped,s.deathLost)

        // A tapped-in virtual press only ever counts for this one frame.
        if(tapInjected){keys.delete("z");keys.delete("r")}
        if(foodTapInjected)keys.delete("x")

        s.raf=requestAnimationFrame(loop)
      }

      stateRef.current.raf=requestAnimationFrame(loop)
      canvas.focus()
    })

    return()=>{
      cancelAnimationFrame(stateRef.current.raf)
      window.removeEventListener("keydown",onDown)
      window.removeEventListener("keyup",onUp)
      canvas.removeEventListener("pointerdown",onPointerDown)
      canvas.removeEventListener("pointermove",onPointerMove)
      window.removeEventListener("pointerup",onPointerUp)
      window.removeEventListener("pointercancel",onPointerUp)
      canvas.removeEventListener("contextmenu",onContextMenu)
      ro.disconnect()
    }
  },[])// eslint-disable-line react-hooks/exhaustive-deps

  // Lesson 1 / Budget / Invest HTML completion overlay
  if((variant==="lesson1"||variant==="lessonBudget"||variant==="lessonLoans"||variant==="lessonInvest")&&lessonDone){
    const isL1=variant==="lesson1"
    const isLoans=variant==="lessonLoans"
    const isInvest=variant==="lessonInvest"
    return(
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6 text-center px-8">
          <div className="text-6xl">{isL1?"🎉":isLoans?"💰":isInvest?"🚢":"🏦"}</div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isL1?"Lesson 1 Complete!":isLoans?"Lesson 10 Complete!":isInvest?"Trading Lesson Complete!":"Lesson 19 Complete!"}
          </h1>
          <p className="text-gray-500 text-base max-w-xs">
            {isL1
              ? "Foraging is your first income source — now you know how coins flow through the island!"
              : isLoans
                ? "You saw how much things cost — that's why budgeting matters. Track what you earn and spend!"
                : isInvest
                  ? "You traded at the Island Port! Markets connect places that each have something the other needs."
                  : "You discovered you need a loan! Time to visit the bank and learn how loans work."}
          </p>
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-8 py-4 text-xl font-semibold text-yellow-700 flex items-center gap-1.5">
            <img src="/coin.svg" alt="" className="w-5 h-5" /> Coins earned: {finalCoins}
          </div>
          <p className="text-gray-400 text-sm">
            {isL1?"Great work out there, forager!":isLoans?"Great work exploring!":"On to the bank!"}
          </p>
          <button
            onClick={()=>router.push("/learn")}
            className="mt-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold text-lg rounded-2xl px-10 py-4 shadow-md transition-colors cursor-pointer"
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  return(
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="w-full h-full outline-none block"
        style={{
          imageRendering:"auto",touchAction:"none",
          WebkitUserSelect:"none",userSelect:"none",WebkitTouchCallout:"none",
        }}
      />
      {showOverlay&&(
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{opacity:overlayOpacity,transition:"opacity 1.5s ease-in"}}
        />
      )}
      {variant==="lessonFarm"&&marketOpen&&(
        <FarmMarket
          coins={stateRef.current.inventory.coins}
          seedsOwned={stateRef.current.farmState.seedsOwned}
          assignedPlant={stateRef.current.farmState.assignedPlant}
          onBuySeedPack={handleBuySeedPack}
          onBuyBread={handleBuyBread}
          onClose={()=>setMarketOpen(false)}
        />
      )}
      {variant==="lessonFish"&&fishScroll==="rod"&&(
        <StoryScroll data={fishRodScroll(stateRef.current.inventory.coins)} onChoose={handleFishScrollChoice} theme="blue" />
      )}
    </div>
  )
}
