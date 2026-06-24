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
  NPC_HALF, NPC_SPEED,
  type ImgMap, type Inventory, freshInventory,
  drawInventoryPanel,
  drawSharedPlayer, drawDialogBox,
} from "@/lib/game-shared"
// sustenanceSpeedMult intentionally omitted — speed is flat regardless of energy

export type MapVariant = "lesson1" | "lesson3" | "lessonTax" | "lessonBudget" | "lessonLoans" | "lessonInvest"

// ─── World constants ──────────────────────────────────────────────────────────
const TS=32, MAP_W=88, MAP_H=58
const SPEED=SHARED_SPEED, PLAYER_R=SHARED_PLAYER_R
const MAP_DRAIN = SUSTENANCE_MAX / (60 * 90) // die in ~90 s without eating

// ─── Lesson 1 constants ───────────────────────────────────────────────────────
const L1_NPC_MAX_TRADES=5, L1_NPC_BUY_RESET=7200
const L1_COIN_PER_BERRY=1, L1_TIP_COINS=2, L1_COIN_GOAL=20
const GOV_R=14, GOV_SPEED=0.6
const GOV_HOME_C=37, GOV_HOME_R=38
const GOV_WANDER=3*TS, GOV_INTERACT=2.5*TS
const TAX_RATE=0.10

// ─── Lesson 3 constants ───────────────────────────────────────────────────────
const L3_NPC_BERRIES_COST=5, L3_NPC_MAX_TRADES=3, L3_NPC_BUY_RESET=7200
const L3_BREAD_LISTED=5, L3_BREAD_TAX=1, L3_BREAD_TOTAL=6

// ─── Foliage draw sizes ───────────────────────────────────────────────────────
const TREE_DW=64, TREE_DH=64, BUSH_DW=48, BUSH_DH=24

// ─── Lesson 1 stages ──────────────────────────────────────────────────────────
const L1_INTRO=0, L1_HARVEST=1, L1_SELL_INTRO=2
const L1_SELLING=3, L1_GROSS_TALK=4, L1_GOV_TAX=5, L1_COMPLETE=6

// ─── Lesson 3 stages ──────────────────────────────────────────────────────────
const L3_INTRO=0, L3_EARN=1, L3_COMPLETE=2

// ─── Lesson Budget (Lesson 10) stages ────────────────────────────────────────
const LB_INTRO=0, LB_EXPLORE=1, LB_BLOO_BUDGET=2, LB_COMPLETE=3
// ─── Lesson Invest (Lesson 37) constants ─────────────────────────────────────
const LIV_INTRO=0,LIV_BOAT=1,LIV_TRADE=2,LIV_COMPLETE=3
const LIV_TRADES_NEEDED=4,LIV_START_BERRIES=8,LIV_BOAT_SPEED=0.5
// Trade items: 0=Bread, 1=Seeds, 2=Wood
const LIV_BREAD_COST=1,LIV_SEED_COST=2,LIV_WOOD_COST=3
const LIV_SEED_BERRY_YIELD=5,LIV_SEED_GROW_FRAMES=900,LIV_WOOD_COINS=7
// Port position: north shore of main island near top-center
const LIV_PORT_C=41,LIV_PORT_R=18
const LIV_PORT_X=(LIV_PORT_C+0.5)*TS,LIV_PORT_Y=(LIV_PORT_R+0.5)*TS
// Boat: starts in water above the dock, moves north off screen
const LIV_BOAT_X=(LIV_PORT_C+0.5)*TS,LIV_BOAT_START_Y=12*TS
// ─── Lesson Loans (Lesson 19) stages ─────────────────────────────────────────
const LL_INTRO=0, LL_EXPLORE=1, LL_BLOO_TALK=2, LL_BANK=3, LL_COMPLETE=4
const LB_NPC_MAX_TRADES=5, LB_NPC_BUY_RESET=7200
const LB_COIN_PER_BERRY=1, LB_TIP_COINS=2
// asking prices for each BUILDING_DEFS entry; 0 = not for sale (bank)
const HOUSE_PRICES=[0,500,350,400,800]

// ─── Lesson 1 dialogues ───────────────────────────────────────────────────────
const L1_BLOO_INTRO: string[] = [
  "Hey there! I'm Bloo, your guide on this island! 👋",
  "Congrats on arriving! Your job here is Berry Collector — you harvest and sell berries.",
  "Move around with WASD or the arrow keys.",
  "See those trees and bushes? Walk up and press [Z] to harvest berries!",
  "You also need to eat to stay alive — press [X] to eat a berry.",
  "Go try it — harvest a berry and eat it!",
]
const L1_BLOO_HARVEST_REMIND: string[] = [
  "Head to one of those trees or bushes and press [Z] to harvest!",
  "Once you have berries, press [X] to eat one. Stay fed!",
]
const L1_BLOO_SELL: string[] = [
  "Wasn't that berry so tasty? 😋 Nice work staying fed!",
  "Those colored squares wandering around? Those are the villagers.",
  "Walk up to any of them and press [Z] to sell a berry for 1 coin.",
  "Each one can only buy 5 berries at a time — visit all of them!",
  "Psst… the green Market Trader might throw in a little something extra… 👀",
  "Your goal: earn 20 coins! Go!",
]
const L1_BLOO_GROSS: string[] = [
  "You did it! 20 coins! 🎉",
  "Those 20 coins are your gross income —",
  "everything you earned BEFORE any deductions or taxes.",
  "Uh oh… I see the Governor heading this way. He might want a cut…",
]
const L1_GOV_TAX_LINE = "Excuse me — I'll be taking 10 % of your income as tax."

const NPC_NAMES = ["Budget Rep","Savings Banker","Tax Agent","Market Trader"]
const L1_NPC_OFFER: string[] = [
  "Budget's tight, but I'll buy a berry for 1 coin.",
  "Oh, fresh berries! I'll take one — 1 coin each.",
  "... Fine. 1 coin per berry. Make it quick.",
  "Welcome! I'll buy a berry for 1 coin — and hey, I might have a little extra for you! 😉",
]
const L1_NPC_SOLD: string[] = [
  "Thanks. Every coin counts — remember that!",
  "Mmm, fresh! Come back if you have more.",
  "Hmph. I suppose it was worth it.",
  "Here you go — and keep the extra change! You're doing great, kid! 🎉",
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

// ─── Lesson 3 dialogues ───────────────────────────────────────────────────────
const L3_BLOO_INTRO: string[] = [
  "Welcome back to the island! 🌴 Big news — the Market is open!",
  "The Market Trader (green square) is selling freshly baked bread. 🍞",
  "Way tastier than raw berries, I promise.",
  "But berry prices dropped since last time. Now it takes 5 berries to earn 1 coin.",
  "Walk up to any colored villager and press [Z] to trade 5 berries for 1 coin.",
  "Once you have coins, find the Market Trader and press [Z] to open the shop. Go!",
]
const L3_NPC_OFFER: string[] = [
  "Tough times — 1 coin for 5 berries. Deal?",
  "Five berries, one coin. My rate today.",
  "...1 coin for 5 berries. Make it quick.",
  "",
]
const L3_NPC_SOLD: string[] = [
  "Pleasure. Spend wisely!",
  "Done! Come back with more.",
  "Fine. Here's your coin.",
  "",
]
const L3_NPC_NOT_ENOUGH: string[] = [
  "I need 5 berries per coin. You're short.",
  "Five berries for a coin. You don't have enough.",
  "5 berries. No exceptions.",
  "",
]
const L3_NPC_FULL: string[] = [
  "All stocked for now. Come back later!",
  "Don't need more right now.",
  "I'm full. Later.",
  "",
]

// ─── Lesson Budget dialogues ──────────────────────────────────────────────────
const LB_BLOO_INTRO: string[] = [
  "Hey there! Welcome back to the island. Here — I scraped together 10 berries for you. 🍒",
  "Keep eating them — your energy drains over time. Press [X] to eat!",
  "I heard there are some properties for sale around here.",
  "Walk up to any building and press [Z] to check out the price!",
]
const LB_BLOO_BUDGET_TALK: string[] = [
  "Wow, that's expensive! But don't panic — this is exactly why budgets matter. 📊",
  "A budget helps you plan: track what you earn, what you spend, and what you save.",
  "Start saving now, and you could work toward something like that someday!",
]
const LL_BLOO_INTRO: string[] = [
  "Hey! Things are a bit tough on the island right now. 😅",
  "There are some properties for sale around here.",
  "Walk up to any building and press [Z] to check out the price!",
]
const LL_BLOO_LOAN: string[] = [
  "You don't have enough money? Sorry, I can't help — I'm struggling too. 😬",
  "Looks like you'll need a loan!",
  "Head to that blue building in the center — it's the bank. They can help you!",
]

// ─── Lesson Invest dialogues ──────────────────────────────────────────────────
const LIV_BLOO_INTRO: string[] = [
  "Welcome to the Island Trading Center! 🌊",
  "See that dock to the north? Our island ships goods to distant islands from there.",
  "Each island specializes in something — ours grows the best berries around!",
  "When we produce more than we need, we ship the surplus to islands that want it.",
  "They send back goods or coins we can't produce ourselves — that's how trade works.",
  "There's a trade vessel at the dock right now. Let's watch it depart!",
]
const LIV_BLOO_BOAT: string[] = [
  "See that vessel heading north? It's carrying our berries to the Northern Archipelago.",
  "They can't grow berries up there, so ours are very valuable to them.",
  "In exchange, they'll send back timber we need to expand these very docks.",
  "Both islands end up better off — that's the whole point of trade.",
  "Ports like this one connect islands that each have something the other needs.",
  "Your turn! Walk to the Port Trader at the dock and press [Z] to trade.",
]

// ─── Island shapes ────────────────────────────────────────────────────────────
interface Island { cr:number; cc:number; rx:number; ry:number }
const ISLANDS: Island[] = [
  { cr:29, cc:37, rx:17, ry:14 },
  { cr:16, cc:9,  rx:9,  ry:8  },
  { cr:11, cc:73, rx:8,  ry:8  },
  { cr:45, cc:73, rx:8,  ry:8  },
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
  { tile:B_INCOME,  r1:20, r2:24, c1:27, c2:32, color:"#3b82f6", border:"#1d4ed8", label:["Income","Center"], svg:"house" },
  { tile:B_BUDGET,  r1:29, r2:33, c1:39, c2:44, color:"#8b5cf6", border:"#6d28d9", label:["Budget","HQ"],     svg:"cabin" },
  { tile:B_SAVINGS, r1:14, r2:18, c1:5,  c2:10, color:"#f59e0b", border:"#b45309", label:["Savings","Bank"],  svg:"tallcabin" },
  { tile:B_TAX,     r1:9,  r2:13, c1:70, c2:75, color:"#ef4444", border:"#b91c1c", label:["Tax","Office"],    svg:"tallhouse" },
  { tile:B_MARKET,  r1:43, r2:47, c1:70, c2:75, color:"#10b981", border:"#065f46", label:["Market"],          svg:"markethouse" },
]
const ENTRANCES = [
  { name:"Income Center", wx:30*TS, wy:25*TS },
  { name:"Budget HQ",     wx:42*TS, wy:34*TS },
  { name:"Savings Bank",  wx:8*TS,  wy:19*TS },
  { name:"Tax Office",    wx:73*TS, wy:14*TS },
  { name:"Market",        wx:73*TS, wy:48*TS },
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
  for (let c=0; c<MAP_W; c++) if (m[25][c]===GRASS||m[26][c]===GRASS) { if (c>=20&&c<=54) { m[25][c]=WATER; m[26][c]=WATER } }
  // Left island → main island: L-bridge (south along east coast, then east across water)
  fill(17,22,17,18,PATH)    // vertical going south along left island east coast
  fill(22,23,17,24,PATH)    // horizontal bridge across water to main island
  // Main island roads (interior, no water-edge bridge artifacts)
  fill(22,23,25,51,PATH)    // top horizontal road (cleanly inland c=25–51)
  fill(28,29,22,54,PATH)    // bottom horizontal road (inland c=22–54)
  fill(22,29,40,41,PATH)    // interior vertical connector
  // Main island → top-right island: L-bridge (north first, then east)
  fill(11,22,52,53,PATH)    // vertical going north from r=22 to r=11 at c=52–53
  fill(10,11,52,65,PATH)    // horizontal going east at r=10–11 to top-right island
  // Main island → bot-right island: L-bridge (east first, then south)
  fill(28,29,55,65,PATH)    // horizontal extension east over water c=55–65
  fill(29,45,65,66,PATH)    // vertical going south to bot-right island
  fill(19,22,29,30,PATH); fill(19,19,29,33,PATH)
  fill(28,34,43,44,PATH); fill(28,28,38,44,PATH)
  fill(16,19,9,14,PATH);  fill(13,16,7,8,PATH);   fill(13,13,7,11,PATH)
  fill(10,15,65,68,PATH); fill(10,10,66,73,PATH)
  fill(45,48,65,68,PATH); fill(45,45,66,73,PATH);  fill(44,45,65,66,PATH)
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
  fill(17,17,26,28,WATER)
  fill(18,18,26,27,WATER)
  // Delete stray path tiles below Income Center (green circles)
  fill(25,26,25,30,GRASS)
  // Delete stray path tiles before Budget HQ approach (green circles)
  fill(26,27,38,40,GRASS)
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
  const flowerCenters=[[7,4],[9,14],[23,32],[33,30],[35,50],[13,78],[7,77],[47,78],[39,52],[22,25]]
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

// ─── Bridge barriers ──────────────────────────────────────────────────────────
let _bridgesOpen = true
function computeBarrierTiles(): Set<string> {
  const set = new Set<string>()
  const addBarrier = (r1:number, c1:number, r2:number, c2:number) => {
    const dr=r2-r1, dc=c2-c1, steps=Math.max(Math.abs(dr),Math.abs(dc))
    const lo=Math.floor(steps*0.25), hi=Math.ceil(steps*0.75)
    for (let i=lo; i<=hi; i++) {
      const r=Math.round(r1+dr*i/steps), c=Math.round(c1+dc*i/steps)
      set.add(`${r},${c}`)
      if (Math.abs(dc)>=Math.abs(dr)) set.add(`${r+1},${c}`)
      else set.add(`${r},${c+1}`)
    }
  }
  addBarrier(17,17,22,18)       // left bridge: vertical section (east coast of left island)
  addBarrier(22,17,22,22)       // left bridge: horizontal section (water crossing)
  addBarrier(11,52,22,52)       // top-right bridge: vertical section (north from main island)
  addBarrier(10,52,10,65)       // top-right bridge: horizontal section (east to top-right island)
  addBarrier(28,56,28,64)       // bot-right bridge: horizontal water-crossing
  addBarrier(29,65,44,65)       // bot-right bridge: vertical section (south to bot-right island)
  return set
}
const BARRIER_TILES = computeBarrierTiles()

// ─── Image loading ────────────────────────────────────────────────────────────
async function loadImages(): Promise<ImgMap> {
  const pngNames=["grass1","grass2","grass3","grass4","grass5","grass6","grassflower1","grassflower2","path1","path2","path3","path4","path5","path6","water1","water2"]
  const woodSvgNames=["house","cabin","tallcabin","tallhouse","markethouse"]
  const bridgeSvgMap: [string, string][] = [
    ["bridge_h_left",  "/BridgePieces/LeftHorizontalBridge.svg"],
    ["bridge_h_mid",   "/BridgePieces/HorizontalBridge.svg"],
    ["bridge_h_right", "/BridgePieces/RightHorizontalBridge.svg"],
    ["bridge_v_top",   "/BridgePieces/TopVerticalBridge.svg"],
    ["bridge_v_mid",   "/BridgePieces/VerticleBridge.svg"],
    ["bridge_v_bot",   "/BridgePieces/BottomVerticalBridge.svg"],
  ]
  const imgs: ImgMap = {}
  return Promise.all([
    ...pngNames.map(n=>new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs[n]=img;res()};img.onerror=()=>res();img.src=`/${n}.png`})),
    ...woodSvgNames.map(n=>new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs[n]=img;res()};img.onerror=()=>res();img.src=`/woodbuildings/${n}.svg`})),
    ...bridgeSvgMap.map(([k,src])=>new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs[k]=img;res()};img.onerror=()=>res();img.src=src})),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["berry"]=img;res()};img.onerror=()=>res();img.src="/Berry.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["treeApples"]=img;res()};img.onerror=()=>res();img.src="/treeApples.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["treeNoApples"]=img;res()};img.onerror=()=>res();img.src="/treeNoApples.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["bushBerry"]=img;res()};img.onerror=()=>res();img.src="/BushBerry.png"}),
    new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs["bushNoBerry"]=img;res()};img.onerror=()=>res();img.src="/BushNoBerry.png"}),
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
function isBlocking(wx:number,wy:number):boolean{
  const c=Math.floor(wx/TS),r=Math.floor(wy/TS)
  if(r<0||r>=MAP_H||c<0||c>=MAP_W)return true
  const t=MAP[r][c]
  if(t===WATER)return true
  if(!_bridgesOpen&&t===PATH&&BARRIER_TILES.has(`${r},${c}`))return true
  if(t>=B_INCOME){
    const bi=BUILDING_DEFS.findIndex(b=>b.tile===t)
    if(bi<0)return false
    return BUILDING_PIXEL_BOUNDS[bi].some(rect=>wx>=rect.wx1&&wx<rect.wx2&&wy>=rect.wy1&&wy<rect.wy2)
  }
  return false
}
function resolveMove(cx:number,cy:number,dx:number,dy:number){
  const pad=PLAYER_R-2
  const hx=isBlocking(cx+dx+pad,cy+pad)||isBlocking(cx+dx-pad,cy+pad)||isBlocking(cx+dx+pad,cy-pad)||isBlocking(cx+dx-pad,cy-pad)
  const hy=isBlocking(cx+pad,cy+dy+pad)||isBlocking(cx-pad,cy+dy+pad)||isBlocking(cx+pad,cy+dy-pad)||isBlocking(cx-pad,cy+dy-pad)
  return{x:Math.max(PLAYER_R,Math.min(MAP_W*TS-PLAYER_R,hx?cx:cx+dx)),y:Math.max(PLAYER_R,Math.min(MAP_H*TS-PLAYER_R,hy?cy:cy+dy))}
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
  const W=2, isL3=variant==="lesson3"
  const npcs:NpcState[]=[
    {x:43.5*TS,y:34.5*TS,tx:43.5*TS,ty:34.5*TS,wait:60,color:"#8b5cf6",border:"#6d28d9",bx1:(39-W)*TS,bx2:(44+1+W)*TS,by1:(29-W)*TS,by2:(33+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:false,tipUsed:false,isMarket:false},
    {x:11.5*TS,y:19.5*TS,tx:11.5*TS,ty:19.5*TS,wait:60,color:"#f59e0b",border:"#b45309",bx1:(5-W)*TS,bx2:(10+1+W)*TS,by1:(14-W)*TS,by2:(18+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:false,tipUsed:false,isMarket:false},
    {x:67.5*TS,y:14.5*TS,tx:67.5*TS,ty:14.5*TS,wait:60,color:"#ef4444",border:"#b91c1c",bx1:(70-W)*TS,bx2:(75+1+W)*TS,by1:(9-W)*TS,by2:(13+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:false,tipUsed:false,isMarket:false},
    {x:67.5*TS,y:48.5*TS,tx:67.5*TS,ty:48.5*TS,wait:60,color:"#10b981",border:"#065f46",bx1:(70-W)*TS,bx2:(75+1+W)*TS,by1:(43-W)*TS,by2:(47+1+W)*TS,tradesDone:0,tradeTimer:0,isTipNpc:!isL3,tipUsed:false,isMarket:isL3},
  ]
  if(variant==="lessonInvest"){
    // Port Trader (index 4) — stays near the dock on the north shore
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

// ─── Governor (lesson 1) ──────────────────────────────────────────────────────
interface GovState{x:number;y:number;tx:number;ty:number;wait:number;forcedTarget:{x:number;y:number}|null}
function initGovernor():GovState{
  const x=GOV_HOME_C*TS+TS/2,y=GOV_HOME_R*TS+TS/2
  return{x,y,tx:x,ty:y,wait:90,forcedTarget:null}
}
function updateGovernor(gov:GovState){
  if(gov.forcedTarget){
    const dx=gov.forcedTarget.x-gov.x,dy=gov.forcedTarget.y-gov.y,dist=Math.sqrt(dx*dx+dy*dy)
    if(dist>2){const spd=Math.min(GOV_SPEED*1.8,dist);gov.x+=dx/dist*spd;gov.y+=dy/dist*spd}
    return
  }
  if(gov.wait>0){gov.wait--;return}
  const dx=gov.tx-gov.x,dy=gov.ty-gov.y,dist=Math.sqrt(dx*dx+dy*dy)
  if(dist<2){
    gov.wait=120+Math.floor(Math.random()*180)
    const cx=GOV_HOME_C*TS+TS/2,cy=GOV_HOME_R*TS+TS/2
    for(let i=0;i<30;i++){
      const rx=cx+(Math.random()*2-1)*GOV_WANDER,ry=cy+(Math.random()*2-1)*GOV_WANDER
      if(!isBlocking(rx,ry)&&!isBlocking(rx+GOV_R,ry+GOV_R)&&!isBlocking(rx-GOV_R,ry-GOV_R)){gov.tx=rx;gov.ty=ry;break}
    }
  }else{const spd=Math.min(GOV_SPEED,dist);gov.x+=dx/dist*spd;gov.y+=dy/dist*spd}
}
function drawGovernor(ctx:CanvasRenderingContext2D,gov:GovState,camX:number,camY:number,highlighted:boolean){
  const sx=Math.round(gov.x-camX),sy=Math.round(gov.y-camY)
  ctx.fillStyle="rgba(0,0,0,0.28)";ctx.fillRect(sx-GOV_R+3,sy+GOV_R,GOV_R*2-3,5)
  ctx.fillStyle="#f59e0b";ctx.fillRect(sx-GOV_R,sy-GOV_R,GOV_R*2,GOV_R*2)
  ctx.fillStyle="rgba(255,255,255,0.35)";ctx.fillRect(sx-GOV_R+2,sy-GOV_R+2,GOV_R-2,GOV_R-2)
  ctx.strokeStyle=highlighted?"#fde68a":"#92400e";ctx.lineWidth=highlighted?2.5:1.5
  ctx.strokeRect(sx-GOV_R,sy-GOV_R,GOV_R*2,GOV_R*2)
  ctx.fillStyle="#1a1200";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("G",sx,sy)
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.beginPath();ctx.roundRect(sx-42,sy-GOV_R-24,84,18,4);ctx.fill()
  ctx.fillStyle="#fde68a";ctx.font="bold 11px sans-serif";ctx.fillText("The Governor",sx,sy-GOV_R-15)
}

// ─── Bloo ─────────────────────────────────────────────────────────────────────
interface BlooState{x:number;y:number;tx:number;ty:number;wait:number}
function initBloo():BlooState{return{x:41*TS,y:22*TS,tx:41*TS,ty:22*TS,wait:30}}
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
  let homeX=41*TS,homeY=22*TS
  if(variant==="lesson1"&&stage>L1_HARVEST){homeX=(GOV_HOME_C+0.5)*TS;homeY=(GOV_HOME_R+2.5)*TS}
  if(variant==="lessonInvest"&&stage>=LIV_TRADE){homeX=LIV_PORT_X;homeY=LIV_PORT_Y+TS}
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

// ─── Foliage ──────────────────────────────────────────────────────────────────
interface FoliageNode{wx:number;wy:number;type:"tree"|"bush";hasFruit:boolean;regenTimer:number}
function initFoliage():FoliageNode[]{
  const nodes:FoliageNode[]=[],MIN_GAP=2*TS
  const tryPlace=(c:number,r:number,type:"tree"|"bush")=>{
    if(r<0||r>=MAP_H||c<0||c>=MAP_W)return
    if(MAP[r][c]!==GRASS)return
    const wx=(c+0.5)*TS,wy=(r+0.5)*TS
    if(nodes.some(n=>Math.hypot(n.wx-wx,n.wy-wy)<MIN_GAP))return
    nodes.push({wx,wy,type,hasFruit:true,regenTimer:0})
  }
  tryPlace(22,17,"tree");tryPlace(24,18,"bush");tryPlace(21,20,"bush")
  tryPlace(48,17,"tree");tryPlace(51,18,"tree");tryPlace(46,19,"bush");tryPlace(52,20,"bush")
  tryPlace(22,25,"tree");tryPlace(25,26,"bush");tryPlace(23,27,"bush")
  tryPlace(50,24,"tree");tryPlace(53,25,"bush");tryPlace(48,26,"bush");tryPlace(52,27,"tree")
  tryPlace(23,31,"tree");tryPlace(26,33,"bush");tryPlace(22,34,"bush");tryPlace(25,36,"tree")
  tryPlace(51,32,"tree");tryPlace(49,34,"bush");tryPlace(53,36,"tree");tryPlace(51,37,"bush")
  tryPlace(34,39,"tree");tryPlace(38,41,"bush");tryPlace(33,41,"bush")
  tryPlace(6,10,"tree");tryPlace(10,11,"bush");tryPlace(13,10,"bush")
  tryPlace(4,21,"tree");tryPlace(11,20,"bush");tryPlace(7,22,"bush")
  tryPlace(70,6,"tree");tryPlace(75,5,"tree");tryPlace(72,7,"bush");tryPlace(77,7,"bush")
  tryPlace(68,16,"tree");tryPlace(76,15,"bush");tryPlace(74,17,"bush")
  tryPlace(70,39,"tree");tryPlace(76,40,"tree");tryPlace(73,38,"bush");tryPlace(77,41,"bush")
  tryPlace(70,50,"tree");tryPlace(75,51,"bush");tryPlace(72,52,"bush")
  return nodes
}
function drawFoliage(ctx:CanvasRenderingContext2D,foliage:FoliageNode[],camX:number,camY:number,cw:number,ch:number,imgs:ImgMap,nearNode:FoliageNode|null){
  const sorted=[...foliage].sort((a,b)=>a.wy-b.wy)
  for(const n of sorted){
    const sx=Math.round(n.wx-camX),sy=Math.round(n.wy-camY)
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

// ─── Bridge detection ─────────────────────────────────────────────────────────
function isBridge(r:number,c:number):boolean{
  if(MAP[r][c]!==PATH)return false
  // adjacent water → definitely a bridge
  if([[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc])=>{
    const nr=r+dr,nc=c+dc
    if(nr<0||nr>=MAP_H||nc<0||nc>=MAP_W)return false
    return MAP[nr][nc]===WATER
  }))return true
  // PATH in water zone surrounded by other bridge tiles (e.g. L-bridge corners)
  return !isLand(r,c)
}

// ─── Tile drawing helpers ─────────────────────────────────────────────────────
function blit(ctx:CanvasRenderingContext2D,img:HTMLImageElement,sx:number,sy:number){ctx.drawImage(img,sx,sy,TS,TS)}
function fbGrass(ctx:CanvasRenderingContext2D,sx:number,sy:number,r:number,c:number){const v=((r*17+c*31)%5)*6;ctx.fillStyle=`rgb(${72+v},${140+v},${48+v})`;ctx.fillRect(sx,sy,TS,TS)}
function fbWater(ctx:CanvasRenderingContext2D,sx:number,sy:number){ctx.fillStyle="#1565a8";ctx.fillRect(sx,sy,TS,TS)}
function fbPath(ctx:CanvasRenderingContext2D,sx:number,sy:number){ctx.fillStyle="#c9a96e";ctx.fillRect(sx,sy,TS,TS);ctx.fillStyle="#b99558";ctx.fillRect(sx+1,sy+1,TS-2,TS-2)}
function drawBridgeOverlay(ctx:CanvasRenderingContext2D,sx:number,sy:number,r:number,c:number,imgs:ImgMap){
  const hasLeft  = c > 0        && MAP[r][c-1] === PATH
  const hasRight = c < MAP_W-1  && MAP[r][c+1] === PATH
  const hasUp    = r > 0        && MAP[r-1][c] === PATH
  const hasDown  = r < MAP_H-1  && MAP[r+1][c] === PATH

  const hCount = (hasLeft?1:0)+(hasRight?1:0)
  const vCount = (hasUp?1:0)+(hasDown?1:0)

  // Always pick exactly ONE piece — no overlapping SVGs.
  // Corners (mixed H+V) default to the vertical end-cap that faces the horizontal arm.
  let key: string
  if(hCount > vCount){
    // Purely horizontal or T-junction dominated by H
    key = (hasLeft&&hasRight) ? "bridge_h_mid" : hasRight ? "bridge_h_left" : "bridge_h_right"
  } else {
    // Vertical, corner (equal), or isolated — use V piece
    key = (hasUp&&hasDown) ? "bridge_v_mid" : hasDown ? "bridge_v_top" : "bridge_v_bot"
  }

  if(imgs[key]){ ctx.drawImage(imgs[key],sx,sy,TS,TS); return }

  // Canvas fallback (SVG not yet loaded)
  const isV = !(hCount > vCount)
  const DARK="#3D1E08",PLANK="#8B5E3C",MID="#A87040",LITE="#C49055",ROPE="#6B4226"
  if(!isV){
    const margin=7,bh=TS-margin*2,lh=Math.floor((bh-2)/3)
    ctx.fillStyle=DARK;ctx.fillRect(sx,sy+margin,TS,bh)
    for(let i=0;i<3;i++){const py=sy+margin+1+i*(lh+1);ctx.fillStyle=PLANK;ctx.fillRect(sx,py,TS,lh);ctx.fillStyle=MID;ctx.fillRect(sx,py+1,TS,1);ctx.fillStyle=LITE;ctx.fillRect(sx,py+2,TS,1);ctx.fillStyle=DARK;ctx.fillRect(sx,py+lh-1,TS,1)}
    ctx.fillStyle=ROPE;ctx.fillRect(sx,sy+margin,TS,1);ctx.fillRect(sx,sy+margin+bh-1,TS,1);ctx.fillRect(sx,sy+margin,2,bh);ctx.fillRect(sx+TS-2,sy+margin,2,bh)
  }else{
    const margin=7,bw=TS-margin*2,lw=Math.floor((bw-2)/3)
    ctx.fillStyle=DARK;ctx.fillRect(sx+margin,sy,bw,TS)
    for(let i=0;i<3;i++){const px=sx+margin+1+i*(lw+1);ctx.fillStyle=PLANK;ctx.fillRect(px,sy,lw,TS);ctx.fillStyle=MID;ctx.fillRect(px+1,sy,1,TS);ctx.fillStyle=LITE;ctx.fillRect(px+2,sy,1,TS);ctx.fillStyle=DARK;ctx.fillRect(px+lw-1,sy,1,TS)}
    ctx.fillStyle=ROPE;ctx.fillRect(sx+margin,sy,bw,1);ctx.fillRect(sx+margin,sy+TS-1,bw,1);ctx.fillRect(sx+margin,sy,1,TS);ctx.fillRect(sx+margin+bw-1,sy,1,TS)
  }
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
    if(b.tile===B_MARKET){
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
function drawMinimap(ctx:CanvasRenderingContext2D,px:number,py:number,cw:number){
  const S=2.2,MW=Math.floor(MAP_W*S),MH=Math.floor(MAP_H*S),MX=cw-MW-12,MY=12
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(MX-3,MY-3,MW+6,MH+6)
  for(let r=0;r<MAP_H;r++) for(let c=0;c<MAP_W;c++){
    const t=MAP[r][c]
    if(t===WATER) ctx.fillStyle="#1e6faa"
    else if(t===PATH) ctx.fillStyle="#b89558"
    else if(FLOWER_MAP[r]?.[c]) ctx.fillStyle="#7ab840"
    else if(t>=B_INCOME){const d=BUILDING_DEFS.find(b=>b.tile===t);ctx.fillStyle=d?.color??"#888"}
    else ctx.fillStyle="#3a7a20"
    ctx.fillRect(MX+Math.floor(c*S),MY+Math.floor(r*S),Math.ceil(S),Math.ceil(S))
  }
  ctx.fillStyle="#ff6b35";ctx.beginPath();ctx.arc(MX+px/TS*S,MY+py/TS*S,3,0,Math.PI*2);ctx.fill()
  ctx.strokeStyle="rgba(255,255,255,0.35)";ctx.lineWidth=1;ctx.strokeRect(MX,MY,MW,MH)
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function drawTopBar(ctx:CanvasRenderingContext2D,cw:number,sustenance:number,inventory:Inventory,harvestCooldown:number,variant:MapVariant,gameStage:number,imgs:ImgMap){
  void imgs
  const isL1=variant==="lesson1"
  const TAB_W=isL1?220:190, TAB_H=isL1?74:60, GAP=8, BAR_Y=8
  const tabCount=isL1?3:2
  const totalW=TAB_W*tabCount+GAP*(tabCount-1), startX=Math.round(cw/2-totalW/2)
  const tabX=Array.from({length:tabCount},(_,i)=>startX+i*(TAB_W+GAP))
  for(const tx of tabX){
    ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(tx,BAR_Y,TAB_W,TAB_H,14);ctx.fill()
    ctx.strokeStyle="#bfdbfe";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(tx,BAR_Y,TAB_W,TAB_H,14);ctx.stroke()
  }
  ctx.textBaseline="middle"
  const pad=10
  const LBL_Y=isL1?BAR_Y+13:BAR_Y+11
  const BAR_TOP=isL1?BAR_Y+28:BAR_Y+22
  const VAL_Y=isL1?BAR_Y+58:BAR_Y+40
  const BAR_H=isL1?10:8

  // FOOD tab
  {
    const tx=tabX[0]
    ctx.fillStyle="#1e40af";ctx.font="bold 11px sans-serif";ctx.textAlign="left"
    ctx.fillText("FOOD",tx+pad,LBL_Y)
    const onCD=harvestCooldown>0
    ctx.fillStyle=onCD?"rgba(0,0,0,0.3)":"rgba(0,0,0,0.5)"
    ctx.font="11px sans-serif";ctx.textAlign="right"
    ctx.fillText(onCD?`[Z] ${(harvestCooldown/60).toFixed(1)}s`:"[Z] Harvest",tx+TAB_W-pad,LBL_Y)
    const pct=sustenance/SUSTENANCE_MAX
    const barColor=pct>0.5?"#4ade80":pct>0.25?"#facc15":pct>0.1?"#fb923c":"#f87171"
    const barW=TAB_W-pad*2
    ctx.fillStyle="rgba(0,0,0,0.1)";ctx.fillRect(tx+pad,BAR_TOP,barW,BAR_H)
    ctx.fillStyle=barColor;ctx.fillRect(tx+pad,BAR_TOP,Math.round(barW*pct),BAR_H)
    ctx.strokeStyle="rgba(0,0,0,0.15)";ctx.lineWidth=1;ctx.strokeRect(tx+pad,BAR_TOP,barW,BAR_H)
    ctx.fillStyle="rgba(0,0,0,0.65)";ctx.font="11px sans-serif";ctx.textAlign="left"
    ctx.fillText(`Energy: ${Math.ceil(sustenance)}%`,tx+pad,VAL_Y)
    const bTxt=`${inventory.berries}  [X] Eat`
    const bTxtW=ctx.measureText(bTxt).width,bISZ=14
    const bImgX=tx+TAB_W-pad-bTxtW-bISZ-3
    if(imgs["berry"]){ctx.drawImage(imgs["berry"],bImgX,VAL_Y-bISZ/2,bISZ,bISZ)}
    ctx.fillStyle=inventory.berries>0?"#b45309":"rgba(0,0,0,0.3)"
    ctx.font="11px sans-serif";ctx.fillText(bTxt,bImgX+bISZ+3,VAL_Y)
  }

  // COINS tab
  {
    const tx=tabX[1]
    ctx.fillStyle="#1e40af";ctx.font="bold 11px sans-serif";ctx.textAlign="left"
    ctx.fillText("COINS",tx+pad,LBL_Y)
    if(isL1){
      const prog=Math.min(1,inventory.coins/L1_COIN_GOAL)
      const barW=TAB_W-pad*2
      ctx.fillStyle="rgba(0,0,0,0.1)";ctx.fillRect(tx+pad,BAR_TOP,barW,BAR_H)
      ctx.fillStyle="#facc15";ctx.fillRect(tx+pad,BAR_TOP,Math.round(barW*prog),BAR_H)
      ctx.strokeStyle="rgba(0,0,0,0.15)";ctx.lineWidth=1;ctx.strokeRect(tx+pad,BAR_TOP,barW,BAR_H)
      ctx.fillStyle="rgba(0,0,0,0.65)";ctx.font="11px sans-serif";ctx.textAlign="left"
      ctx.fillText(`🪙 ${inventory.coins} / ${L1_COIN_GOAL}`,tx+pad,VAL_Y)
      if(gameStage>=L1_SELLING){
        ctx.fillStyle=inventory.coins>=L1_COIN_GOAL?"#16a34a":"rgba(0,0,0,0.35)";ctx.textAlign="right"
        ctx.fillText(inventory.coins>=L1_COIN_GOAL?"Goal!":"Goal: 20",tx+TAB_W-pad,VAL_Y)
      }
    }else{
      ctx.fillStyle="#1e293b";ctx.font="bold 22px sans-serif";ctx.textAlign="center"
      ctx.fillText(`🪙 ${inventory.coins}`,tx+TAB_W/2,BAR_Y+38)
    }
  }

  // ROADS tab (lesson 1 only)
  if(isL1){
    const tx=tabX[2]
    ctx.fillStyle="#1e40af";ctx.font="bold 11px sans-serif";ctx.textAlign="left"
    ctx.fillText("ROADS",tx+pad,LBL_Y)
    ctx.fillStyle="#16a34a";ctx.beginPath();ctx.arc(tx+pad+6,BAR_Y+44,5,0,Math.PI*2);ctx.fill()
    ctx.fillStyle="#16a34a";ctx.font="11px sans-serif";ctx.textBaseline="middle"
    ctx.fillText("Bridges Open",tx+pad+16,BAR_Y+44)
    ctx.fillStyle="rgba(0,0,0,0.35)"
    ctx.fillText("— Coming soon",tx+pad,VAL_Y)
  }
}

// ─── Task sign ────────────────────────────────────────────────────────────────
function drawTaskSign(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,imgs?:ImgMap){
  const TW=220,TH=74,pad=10
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(x,y,TW,TH,14);ctx.fill()
  ctx.strokeStyle="#bfdbfe";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y,TW,TH,14);ctx.stroke()
  const BERRY_TAG=":berry:"
  const hasBerry=text.startsWith(BERRY_TAG)
  const label=hasBerry?text.slice(BERRY_TAG.length):text
  ctx.fillStyle="#1e40af";ctx.font="bold 11px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
  ctx.fillText("TASK",x+pad,y+13)
  ctx.save()
  ctx.beginPath();ctx.rect(x+pad,y+24,TW-pad*2,TH-24);ctx.clip()
  ctx.textBaseline="middle";ctx.textAlign="left"
  if(hasBerry){
    const iSz=16
    if(imgs?.["berry"]){ctx.drawImage(imgs["berry"],x+pad,y+52-iSz/2,iSz,iSz)}
    ctx.font="bold 11px sans-serif";ctx.fillStyle="#1e293b";ctx.fillText(label,x+pad+iSz+4,y+52)
  }else{
    ctx.font="bold 11px sans-serif";ctx.fillStyle="#1e293b";ctx.fillText(text,x+pad,y+52)
  }
  ctx.restore()
}

// ─── Sell menu (lesson 1) ─────────────────────────────────────────────────────
interface SellMenuState{npcIdx:number;amount:number;phase:"select"|"result";resultLine:string;earnedCoins:number}
function drawSellMenu(ctx:CanvasRenderingContext2D,cw:number,ch:number,npcName:string,npcColor:string,menu:SellMenuState,playerBerries:number,npcCanBuy:number,isTipNpc:boolean,tipUsed:boolean){
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
    ctx.fillText(`Sold ${menu.amount} 🍒 → 🪙 ${menu.earnedCoins}!`,cw/2,py+118)
    if(isTipNpc&&menu.earnedCoins>menu.amount*L1_COIN_PER_BERRY){
      ctx.fillStyle="#ea580c";ctx.font="13px sans-serif"
      ctx.fillText("Keep the change! 🎉",cw/2,py+148)
    }
    ctx.fillStyle="#94a3b8";ctx.font="13px sans-serif"
    ctx.fillText("[Z] Done",cw/2,py+ph-20)
    return
  }
  const maxSell=Math.min(playerBerries,npcCanBuy),canSell=menu.amount>0&&maxSell>0
  ctx.fillStyle="rgba(0,0,0,0.45)";ctx.font="13px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
  ctx.fillText("Berries to sell:",px+16,py+70)
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
  ctx.fillText("← → arrow keys",scx,scy+28)
  ctx.font="11px sans-serif";ctx.textBaseline="middle"
  ctx.fillStyle=playerBerries>0?"rgba(0,0,0,0.45)":"#dc2626";ctx.textAlign="left"
  ctx.fillText(`🍒 You have: ${playerBerries}`,px+16,py+168)
  ctx.fillStyle=npcCanBuy>0?"rgba(0,0,0,0.45)":"#dc2626";ctx.textAlign="right"
  ctx.fillText(`Limit: ${npcCanBuy}`,px+pw-16,py+168)
  ctx.strokeStyle="rgba(0,0,0,0.1)";ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(px+16,py+186);ctx.lineTo(px+pw-16,py+186);ctx.stroke()
  ctx.textAlign="center"
  if(npcCanBuy<=0){ctx.fillStyle="#dc2626";ctx.font="bold 13px sans-serif";ctx.fillText("All stocked up for now — come back later!",cw/2,py+212)}
  else if(playerBerries===0){ctx.fillStyle="#dc2626";ctx.font="bold 13px sans-serif";ctx.fillText("You have no berries to sell!",cw/2,py+212)}
  else if(canSell){
    let earnPreview=menu.amount*L1_COIN_PER_BERRY
    if(isTipNpc&&!tipUsed)earnPreview+=L1_TIP_COINS
    const tipNote=isTipNpc&&!tipUsed?" — Keep the change! 🎉":""
    ctx.fillStyle="#16a34a";ctx.font="bold 14px sans-serif"
    ctx.fillText(`You'll earn: 🪙 ${earnPreview}${tipNote}`,cw/2,py+212)
  }else{ctx.fillStyle="rgba(0,0,0,0.3)";ctx.font="13px sans-serif";ctx.fillText("Use ← → to choose an amount",cw/2,py+212)}
  ctx.font="bold 13px sans-serif";ctx.textBaseline="middle"
  ctx.fillStyle=canSell?npcColor:"rgba(0,0,0,0.2)";ctx.textAlign="left"
  ctx.fillText("[Z] Sell",px+20,py+ph-20)
  ctx.fillStyle="#94a3b8";ctx.textAlign="right"
  ctx.fillText("[X] Cancel",px+pw-20,py+ph-20)
}

// ─── Market menu (lesson 3) ───────────────────────────────────────────────────
function drawMarketMenu(ctx:CanvasRenderingContext2D,cw:number,ch:number,coins:number){
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,cw,ch)
  const pw=Math.min(520,cw-40),ph=310
  const px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle="#10b981";ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.fillStyle="#065f46";ctx.font="bold 16px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("🏪  Island Market",cw/2,py+24)
  ctx.strokeStyle="rgba(16,185,129,0.25)";ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(px+16,py+40);ctx.lineTo(px+pw-16,py+40);ctx.stroke()
  const ITEMS=[
    {emoji:"🍞",name:"Freshly Baked Bread",price:`${L3_BREAD_LISTED} 🪙`,available:true},
    {emoji:"🥩",name:"Salted Fish",price:"8 🪙",available:false},
    {emoji:"🍎",name:"Apple Cider",price:"3 🪙",available:false},
  ]
  let iy=py+56
  for(const item of ITEMS){
    ctx.globalAlpha=item.available?1:0.35
    if(item.available){ctx.fillStyle="rgba(16,185,129,0.1)";ctx.beginPath();ctx.roundRect(px+12,iy-13,pw-24,30,8);ctx.fill()}
    ctx.fillStyle=item.available?"#065f46":"#6b7280"
    ctx.font=item.available?"bold 13px sans-serif":"13px sans-serif"
    ctx.textAlign="left";ctx.fillText(`${item.emoji}  ${item.name}`,px+22,iy+2)
    ctx.textAlign="right"
    if(item.available){ctx.fillStyle="#065f46";ctx.font="bold 13px sans-serif";ctx.fillText(item.price,px+pw-18,iy+2)}
    else{ctx.fillStyle="#9ca3af";ctx.font="11px sans-serif";ctx.fillText("Coming soon",px+pw-18,iy+2)}
    ctx.globalAlpha=1;iy+=34
  }
  ctx.strokeStyle="rgba(16,185,129,0.2)";ctx.lineWidth=1
  ctx.beginPath();ctx.moveTo(px+16,iy+4);ctx.lineTo(px+pw-16,iy+4);ctx.stroke()
  iy+=16
  let bgColor:string,line1:string,line2:string,textColor:string,line2Color:string
  if(coins<L3_BREAD_LISTED){
    bgColor="rgba(239,68,68,0.08)";textColor="#dc2626";line2Color="#6b7280"
    line1=`You need ${L3_BREAD_TOTAL} coins total. You only have ${coins}.`
    line2=`Sell more berries to the villagers! (${L3_NPC_BERRIES_COST} berries = 1 coin)`
  }else if(coins===L3_BREAD_LISTED){
    bgColor="rgba(251,146,60,0.1)";textColor="#ea580c";line2Color="#6b7280"
    line1=`⚠️  Bread is ${L3_BREAD_LISTED} coins... but there's a ${L3_BREAD_TAX}-coin SALES TAX!`
    line2=`You need ${L3_BREAD_TOTAL} coins total. Go earn 1 more coin!`
  }else{
    bgColor="rgba(16,185,129,0.1)";textColor="#065f46";line2Color="#374151"
    line1=`✅  ${L3_BREAD_LISTED} coins + ${L3_BREAD_TAX} coin sales tax = ${L3_BREAD_TOTAL} total.`
    line2="Press [Z] to buy your bread!"
  }
  ctx.fillStyle=bgColor;ctx.beginPath();ctx.roundRect(px+12,iy,pw-24,54,10);ctx.fill()
  ctx.fillStyle=textColor;ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText(line1,cw/2,iy+18)
  ctx.fillStyle=line2Color;ctx.font="12px sans-serif"
  ctx.fillText(line2,cw/2,iy+38)
  ctx.fillStyle="#94a3b8";ctx.font="11px sans-serif"
  ctx.fillText("[X] Close",cw/2,py+ph-14)
}

// ─── Notification banner ──────────────────────────────────────────────────────
function drawNotifBanner(ctx:CanvasRenderingContext2D,cw:number,ch:number,text:string,alpha:number){
  ctx.save();ctx.globalAlpha=alpha
  ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  const tw=ctx.measureText(text).width+32,bx=cw/2-tw/2,by=ch/2-110
  ctx.fillStyle="#1a3a0a";ctx.beginPath();ctx.roundRect(bx,by,tw,38,6);ctx.fill()
  ctx.strokeStyle="#4ade80";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(bx,by,tw,38,6);ctx.stroke()
  ctx.fillStyle="#86efac";ctx.fillText(text,cw/2,by+19)
  ctx.restore()
}

// ─── Lesson complete (lesson 3 canvas overlay) ────────────────────────────────
function drawLessonCompleteL3(ctx:CanvasRenderingContext2D,cw:number,ch:number){
  ctx.fillStyle="rgba(0,0,0,0.72)";ctx.fillRect(0,0,cw,ch)
  const pw=440,ph=280,px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle="#4ade80";ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillStyle="#065f46";ctx.font="bold 32px sans-serif";ctx.fillText("🍞 You bought bread!",cw/2,py+52)
  ctx.fillStyle="#374151";ctx.font="15px sans-serif"
  ctx.fillText(`Listed price: ${L3_BREAD_LISTED} coins + ${L3_BREAD_TAX} coin sales tax`,cw/2,py+100)
  ctx.fillStyle="#ea580c";ctx.font="bold 17px sans-serif"
  ctx.fillText(`= ${L3_BREAD_TOTAL} coins total`,cw/2,py+132)
  ctx.fillStyle="#4b5563";ctx.font="13px sans-serif"
  ctx.fillText("That extra coin went to the government — that's sales tax.",cw/2,py+170)
  ctx.fillStyle="#94a3b8";ctx.font="12px sans-serif"
  ctx.fillText("Returning to learn…",cw/2,py+220)
}

// ─── Day-over overlay ─────────────────────────────────────────────────────────
function drawDrops(ctx:CanvasRenderingContext2D,drops:{wx:number;wy:number;berries:number;coins:number}[],camX:number,camY:number){
  for(const d of drops){
    const sx=Math.round(d.wx-camX),sy=Math.round(d.wy-camY)
    // pulsing glow
    ctx.fillStyle="rgba(255,220,50,0.9)";ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.fill()
    ctx.strokeStyle="#b45309";ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.stroke()
    ctx.fillStyle="#92400e";ctx.font="bold 8px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
    ctx.fillText("!",sx,sy)
    const parts:string[]=[]
    if(d.berries>0)parts.push(`🍒${d.berries}`)
    if(d.coins>0)parts.push(`🪙${d.coins}`)
    if(parts.length===0)return
    const label=parts.join(" ")
    ctx.font="bold 10px sans-serif"
    const tw=ctx.measureText(label).width
    ctx.fillStyle="rgba(255,255,255,0.92)";ctx.beginPath();ctx.roundRect(sx-tw/2-4,sy-22,tw+8,14,4);ctx.fill()
    ctx.fillStyle="#1e293b";ctx.textBaseline="top";ctx.fillText(label,sx,sy-22)
  }
}

function drawDayOver(ctx:CanvasRenderingContext2D,cw:number,ch:number,dropped:{berries:number;coins:number},lost:{berries:number;coins:number}){
  ctx.fillStyle="rgba(0,0,0,0.72)";ctx.fillRect(0,0,cw,ch)
  const pw=400,ph=280,px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle="#6366f1";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillStyle="#dc2626";ctx.font="bold 34px sans-serif";ctx.fillText("💀 You Passed Out!",cw/2,py+50)
  ctx.fillStyle="#4b5563";ctx.font="14px sans-serif";ctx.fillText("Your sustenance ran out.",cw/2,py+88)
  const hasDrops=dropped.berries>0||dropped.coins>0
  const hasLost=lost.berries>0||lost.coins>0
  if(hasDrops){
    const dp:string[]=[]
    if(dropped.berries>0)dp.push(`🍒 ${dropped.berries} berr${dropped.berries===1?"y":"ies"}`)
    if(dropped.coins>0)dp.push(`🪙 ${dropped.coins} coin${dropped.coins===1?"":"s"}`)
    ctx.fillStyle="#d97706";ctx.font="bold 14px sans-serif";ctx.fillText("Items dropped nearby (go pick them up!):",cw/2,py+122)
    ctx.fillStyle="#1e293b";ctx.font="14px sans-serif";ctx.fillText(dp.join("  "),cw/2,py+144)
  }
  if(hasLost){
    const lp:string[]=[]
    if(lost.berries>0)lp.push(`🍒 ${lost.berries}`)
    if(lost.coins>0)lp.push(`🪙 ${lost.coins}`)
    ctx.fillStyle="#dc2626";ctx.font="13px sans-serif";ctx.fillText(`Lost forever: ${lp.join("  ")}`,cw/2,py+172)
  }
  ctx.fillStyle="#94a3b8";ctx.font="13px sans-serif";ctx.fillText("Press [R] to respawn",cw/2,py+240)
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
  ctx.fillText(`${b.label.join(" ")} — For Sale`,cw/2,py+24)
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
  ctx.fillText(canAfford?`✅ You can afford this!`:`❌ You only have ${coins} coins — can't afford it!`,cw/2,py+158)
  if(!canAfford){ctx.fillStyle="#6b7280";ctx.font="12px sans-serif";ctx.fillText(`You need ${price-coins} more coins.`,cw/2,py+180)}
  ctx.fillStyle="#94a3b8";ctx.font="11px sans-serif"
  ctx.fillText("[Z] or [X] Close",cw/2,py+ph-16)
}

// ─── Invest: trade menu ───────────────────────────────────────────────────────
const LIV_TRADE_DEFS=[
  {emoji:"🍞",name:"Bread", cost:LIV_BREAD_COST,desc:"Eat [X] to fully restore energy"},
  {emoji:"🌱",name:"Seeds", cost:LIV_SEED_COST, desc:`Sprout in 15s — get ${LIV_SEED_BERRY_YIELD} berries each!`},
  {emoji:"🪵",name:"Wood",  cost:LIV_WOOD_COST, desc:`Walk to the Market — sell for ${LIV_WOOD_COINS} coins each`},
]
function drawLivTradeMenu(ctx:CanvasRenderingContext2D,cw:number,ch:number,berries:number,idx:number,bread:number,seeds:number,wood:number){
  ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,cw,ch)
  const pw=Math.min(520,cw-40),ph=316
  const px=Math.round(cw/2-pw/2),py=Math.round(ch/2-ph/2)
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.fill()
  ctx.strokeStyle="#0d9488";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(px,py,pw,ph,16);ctx.stroke()
  ctx.fillStyle="#0d9488";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("⚓ Port Trader — Import Goods",cw/2,py+22)
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
    ctx.font="26px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
    ctx.fillText(it.emoji,px+26,iy+34)
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
function drawLivInventory(ctx:CanvasRenderingContext2D,x:number,y:number,bread:number,seeds:number,wood:number,seedTimer:number){
  const parts:string[]=[]
  if(bread>0)parts.push(`🍞×${bread}`)
  if(seeds>0)parts.push(`🌱×${seeds}${seedTimer>0?` (${Math.ceil(seedTimer/60)}s)`:""}`)
  if(wood>0)parts.push(`🪵×${wood}`)
  if(parts.length===0)return
  const text=parts.join("  ")
  ctx.font="bold 12px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle"
  const tw=ctx.measureText(text).width+8
  ctx.fillStyle="rgba(255,255,255,0.92)";ctx.beginPath();ctx.roundRect(x,y,tw+16,26,8);ctx.fill()
  ctx.strokeStyle="#0d9488";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,y,tw+16,26,8);ctx.stroke()
  ctx.fillStyle="#0f172a";ctx.fillText(text,x+8,y+13)
}

// ─── Invest: port dock ────────────────────────────────────────────────────────
function drawPortDock(ctx:CanvasRenderingContext2D,camX:number,camY:number){
  const px1=(LIV_PORT_C-1)*TS-camX, px2=(LIV_PORT_C+2)*TS-camX   // 3 tiles wide
  const py1=12*TS-camY, py2=(LIV_PORT_R+1)*TS-camY
  ctx.fillStyle="#7a5030"; ctx.fillRect(px1,py1,px2-px1,py2-py1)
  ctx.strokeStyle="#5a3820"; ctx.lineWidth=1.5
  for(let y=py1+12;y<py2;y+=12){ctx.beginPath();ctx.moveTo(px1,y);ctx.lineTo(px2,y);ctx.stroke()}
  ctx.fillStyle="#5a3820"; ctx.fillRect(px1,py1,4,py2-py1); ctx.fillRect(px2-4,py1,4,py2-py1)
  // bollards
  ctx.fillStyle="#3a2010"
  for(const bx of [px1+8,px2-8]) for(const by of [py1+10,py1+50,py1+90]){ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fill()}
  // PORT sign above the trader
  const signCx=(LIV_PORT_C+0.5)*TS-camX, signY=(LIV_PORT_R-1)*TS-camY-8
  ctx.fillStyle="#e8d5a0"; ctx.beginPath(); ctx.roundRect(signCx-28,signY,56,22,4); ctx.fill()
  ctx.strokeStyle="#b8952a"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(signCx-28,signY,56,22,4); ctx.stroke()
  ctx.fillStyle="#7a4a00"; ctx.font="bold 10px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"
  ctx.fillText("⚓ PORT",signCx,signY+11)
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
  ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  const tw=ctx.measureText(msg).width,bx=cw/2-tw/2-12,by=ch-58
  ctx.fillStyle="#ffffff";ctx.beginPath();ctx.roundRect(bx,by,tw+24,28,14);ctx.fill()
  ctx.strokeStyle="#bfdbfe";ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(bx,by,tw+24,28,14);ctx.stroke()
  ctx.fillStyle=color;ctx.fillText(msg,cw/2,by+14)
}

// ─── Main component ───────────────────────────────────────────────────────────
export function GameMap({ variant, initialCoins = 0, playerColor = "#ef4444" }: { variant: MapVariant; initialCoins?: number; playerColor?: string }) {
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const router=useRouter()
  const completeRef=useRef<(()=>void)|null>(null)
  const [lessonDone, setLessonDone]=useState(false)
  const [finalCoins, setFinalCoins]=useState(0)
  const [showOverlay, setShowOverlay]=useState(false)
  const [overlayOpacity, setOverlayOpacity]=useState(0)

  function triggerFadeOut(then: ()=>void){
    setTimeout(()=>{
      setShowOverlay(true)
      requestAnimationFrame(()=>requestAnimationFrame(()=>setOverlayOpacity(1)))
      setTimeout(then, 1500)
    }, 3000)
  }

  const stageComplete=variant==="lesson1"?L1_COMPLETE:variant==="lessonBudget"?LB_COMPLETE:variant==="lessonLoans"?LL_COMPLETE:variant==="lessonInvest"?LIV_COMPLETE:L3_COMPLETE

  const stateRef=useRef({
    px: 38*TS, py: 22*TS,
    keys: new Set<string>(),
    frame: 0, raf: 0,
    imgs: null as ImgMap|null,
    npcs: initNpcs(variant),
    sustenance: SUSTENANCE_MAX as number,
    inventory: { ...freshInventory(), coins: initialCoins },
    dayOver: false,
    harvestCooldown: 0,
    bloo: initBloo(),
    gameStage: 0 as number,
    dialogIdx: 0 as number,
    completionCalled: false,
    foliage: initFoliage(),
    notifText: "" as string,
    notifTimer: 0 as number,
    // lesson 1 fields
    gov: initGovernor(),
    blooRemindIdx: 0 as number,
    blooHarvestDismissed: false as boolean,
    govArrived: false as boolean,
    govTaxAmount: 0 as number,
    sellMenu: null as SellMenuState|null,
    // lesson 3 fields
    activeConversation: null as {npcIdx:number;phase:number;line:string}|null,
    marketOpen: false as boolean,
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
    drops: [] as {wx:number;wy:number;berries:number;coins:number}[],
    deathDropped: {berries:0,coins:0},
    deathLost: {berries:0,coins:0},
    sprintTimer: 0 as number,
  })

  useEffect(()=>{
    completeRef.current=()=>{
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
      }else if(variant==="lessonTax"){
        saveGameLesson("taxBracketsGameCompleted",inv.coins,inv.berries).catch(()=>{})
        triggerFadeOut(()=>router.push("/learn"))
      }else{
        saveGameLesson("salesTaxGameCompleted",inv.coins,inv.berries).catch(()=>{})
        triggerFadeOut(()=>router.push("/learn"))
      }
    }
  },[router,variant])

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
      stateRef.current.keys.add(e.key)
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault()
    }
    const onUp=(e:KeyboardEvent)=>stateRef.current.keys.delete(e.key)
    window.addEventListener("keydown",onDown)
    window.addEventListener("keyup",onUp)

    ctx.fillStyle="#1a3a2a";ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight)
    ctx.fillStyle="white";ctx.font="bold 18px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
    ctx.fillText("Loading map…",canvas.offsetWidth/2,canvas.offsetHeight/2)

    if(variant==="lessonInvest"){stateRef.current.inventory.berries=LIV_START_BERRIES}

    loadImages().then(imgs=>{
      stateRef.current.imgs=imgs
      computeBuildingBounds(imgs)

      const loop=()=>{
        const s=stateRef.current
        s.frame++
        const{keys}=s

        _bridgesOpen=true

        // ── Sustenance drain ───────────────────────────────────────────────
        if(!s.dayOver&&s.gameStage<stageComplete){
          s.sustenance=Math.max(0,s.sustenance-MAP_DRAIN)
          if(s.sustenance<=0&&!s.dayOver){
            const dBerries=Math.floor(s.inventory.berries*2/3)
            const dCoins=Math.floor(s.inventory.coins*2/3)
            const lBerries=s.inventory.berries-dBerries
            const lCoins=s.inventory.coins-dCoins
            s.deathDropped={berries:dBerries,coins:dCoins}
            s.deathLost={berries:lBerries,coins:lCoins}
            if(dBerries>0||dCoins>0){
              const spread=TS*1.5
              s.drops.push({
                wx:s.px+(Math.random()-0.5)*spread,
                wy:s.py+(Math.random()-0.5)*spread,
                berries:dBerries,coins:dCoins,
              })
            }
            s.inventory.berries=0;s.inventory.coins=0
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
        const noMenu=(variant==="lesson1"||variant==="lessonBudget"||variant==="lessonLoans")?s.sellMenu===null:variant==="lessonInvest"?!s.livTradeMenu:!s.marketOpen
        if((keys.has("z")||keys.has("Z"))&&!s.dayOver&&s.harvestCooldown===0&&nearFoliageIdx>=0&&noMenu){
          s.inventory.berries+=HARVEST_BERRIES
          s.harvestCooldown=HARVEST_COOLDOWN
          s.foliage[nearFoliageIdx].hasFruit=false
          s.foliage[nearFoliageIdx].regenTimer=FOLIAGE_REGEN
          keys.delete("z");keys.delete("Z")
        }

        // ── Eat [X] ────────────────────────────────────────────────────────
        if((keys.has("x")||keys.has("X"))&&!s.dayOver&&noMenu){
          if(variant==="lessonInvest"&&s.livBread>0){
            s.livBread--;s.sustenance=SUSTENANCE_MAX
            keys.delete("x");keys.delete("X")
          }else if(s.inventory.berries>0){
            s.inventory.berries--
            s.sustenance=Math.min(SUSTENANCE_MAX,s.sustenance+BERRY_SUSTENANCE)
            keys.delete("x");keys.delete("X")
            if(variant==="lesson1"&&s.gameStage===L1_HARVEST){
              s.gameStage=L1_SELL_INTRO;s.dialogIdx=0
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
          const blooDialogue=nearBloo&&(
            s.gameStage===L1_INTRO||(s.gameStage===L1_HARVEST&&!s.blooHarvestDismissed)||
            s.gameStage===L1_SELL_INTRO||s.gameStage===L1_GROSS_TALK
          )
          const govDialogue=s.gameStage===L1_GOV_TAX&&s.govArrived
          const anyDialogue=blooDialogue||govDialogue||s.sellMenu!==null

          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)
          updateGovernor(s.gov)

          // sell menu arrow keys
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(s.inventory.berries,L1_NPC_MAX_TRADES-smNpc.tradesDone)
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
            }else if(s.sellMenu.amount>0){
              const smNpc=s.npcs[s.sellMenu.npcIdx]
              const amt=s.sellMenu.amount
              let earned=amt*L1_COIN_PER_BERRY
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed
              if(gettingTip){earned+=L1_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=amt;s.inventory.coins+=earned
              smNpc.tradesDone+=amt
              if(smNpc.tradeTimer===0)smNpc.tradeTimer=L1_NPC_BUY_RESET
              if(gettingTip){s.notifText=`Market Trader tipped you +${L1_TIP_COINS} coins! 🎉`;s.notifTimer=300}
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
          // 2. bloo sell intro
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L1_SELL_INTRO){
            s.dialogIdx++;if(s.dialogIdx>=L1_BLOO_SELL.length){s.gameStage=L1_SELLING;s.dialogIdx=0}
            consumeE()
          }
          // 3. bloo gross talk
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L1_GROSS_TALK){
            s.dialogIdx++
            if(s.dialogIdx>=L1_BLOO_GROSS.length){
              s.gameStage=L1_GOV_TAX;s.dialogIdx=0
              s.gov.forcedTarget={x:s.px,y:s.py}
              s.govTaxAmount=Math.ceil(s.inventory.coins*TAX_RATE)
              s.govArrived=false
            }
            consumeE()
          }
          // 4. governor tax acceptance
          if(eDown&&!eUsed&&s.gameStage===L1_GOV_TAX&&s.govArrived){
            s.inventory.coins=Math.max(0,s.inventory.coins-s.govTaxAmount)
            s.notifText=`Income tax: ${s.govTaxAmount} coins taken!`;s.notifTimer=300
            s.gov.forcedTarget=null
            s.gameStage=L1_COMPLETE
            if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}
            consumeE()
          }
          // 5. open sell menu near NPC
          if(eDown&&!eUsed&&s.gameStage>=L1_SELLING&&s.gameStage<L1_GROSS_TALK&&s.sellMenu===null){
            let nearNpcIdx=-1,nearNpcDist=Infinity
            for(let i=0;i<s.npcs.length;i++){
              const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y)
              if(d<TS*2.5&&d<nearNpcDist){nearNpcDist=d;nearNpcIdx=i}
            }
            if(nearNpcIdx>=0){
              const npc=s.npcs[nearNpcIdx]
              const maxSell=Math.min(s.inventory.berries,L1_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0}
              consumeE()
            }
          }

          updateNpcs(s.npcs,s.sellMenu?.npcIdx??-1)

          // stage transitions
          if(s.gameStage===L1_SELLING&&s.inventory.coins>=L1_COIN_GOAL){
            s.gameStage=L1_GROSS_TALK;s.dialogIdx=0
            s.notifText=`${L1_COIN_GOAL} coins! Find Bloo near the Governor!`;s.notifTimer=360
          }
          if(s.gameStage===L1_GOV_TAX&&!s.govArrived){
            if(Math.hypot(s.px-s.gov.x,s.py-s.gov.y)<GOV_INTERACT){s.govArrived=true;s.gov.forcedTarget=null}
          }

          // movement — flat SPEED, no sustenance penalty
          if(!s.dayOver&&s.gameStage<L1_COMPLETE&&!anyDialogue){
            let dx=0,dy=0
            if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A"))dx-=spd
            if(keys.has("ArrowRight")||keys.has("d")||keys.has("D"))dx+=spd
            if(keys.has("ArrowUp")||keys.has("w")||keys.has("W"))dy-=spd
            if(keys.has("ArrowDown")||keys.has("s")||keys.has("S"))dy+=spd
            if(dx&&dy){dx*=0.707;dy*=0.707}
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy)
              let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=fn.type==="tree"?TREE_HIT_R:BUSH_HIT_R
                const hcy=fn.wy-(fn.type==="tree"?TREE_HIT_OY:BUSH_HIT_OY)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy)
                const minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON BUDGET GAME FLOW  (lesson 10 — Bloo talks about budgeting)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonBudget"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          const blooDialogue=nearBloo&&(s.gameStage===LB_INTRO||s.gameStage===LB_BLOO_BUDGET)
          const anyDialogue=blooDialogue||s.sellMenu!==null||s.houseSaleOpen
          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)

          // sell menu arrow keys
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(s.inventory.berries,LB_NPC_MAX_TRADES-smNpc.tradesDone)
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
              let earned=amt*LB_COIN_PER_BERRY
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed
              if(gettingTip){earned+=LB_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=amt;s.inventory.coins+=earned
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
              s.inventory.berries+=10;s.notifText="Bloo gave you 10 berries! 🍒";s.notifTimer=300
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
              const npc=s.npcs[nearNpcIdx],maxSell=Math.min(s.inventory.berries,LB_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0};consumeE()
            }
          }
          // 5. open house-for-sale menu near building entrance
          if(eDown&&!eUsed&&s.gameStage===LB_EXPLORE&&s.sellMenu===null&&!s.houseSaleOpen){
            for(let ei=1;ei<ENTRANCES.length;ei++){
              if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){s.houseSaleOpen=true;s.houseSaleIdx=ei;consumeE();break}
            }
          }

          updateNpcs(s.npcs,s.sellMenu?.npcIdx??-1)

          // movement
          if(!s.dayOver&&s.gameStage<LB_COMPLETE&&!anyDialogue){
            let dx=0,dy=0
            if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A"))dx-=spd
            if(keys.has("ArrowRight")||keys.has("d")||keys.has("D"))dx+=spd
            if(keys.has("ArrowUp")||keys.has("w")||keys.has("W"))dy-=spd
            if(keys.has("ArrowDown")||keys.has("s")||keys.has("S"))dy+=spd
            if(dx&&dy){dx*=0.707;dy*=0.707}
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy);let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=fn.type==="tree"?TREE_HIT_R:BUSH_HIT_R
                const hcy=fn.wy-(fn.type==="tree"?TREE_HIT_OY:BUSH_HIT_OY)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON LOANS GAME FLOW  (lesson 19 — Bloo says "need a loan", go to bank)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonLoans"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          const blooDialogue=nearBloo&&(s.gameStage===LL_INTRO||s.gameStage===LL_BLOO_TALK)
          const anyDialogue=blooDialogue||s.sellMenu!==null||s.houseSaleOpen
          if(!blooDialogue)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)

          // sell menu arrow keys
          if(s.sellMenu!==null&&s.sellMenu.phase==="select"){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            const maxSell=Math.min(s.inventory.berries,LB_NPC_MAX_TRADES-smNpc.tradesDone)
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
              let earned=amt*LB_COIN_PER_BERRY
              const gettingTip=smNpc.isTipNpc&&!smNpc.tipUsed
              if(gettingTip){earned+=LB_TIP_COINS;smNpc.tipUsed=true}
              s.inventory.berries-=amt;s.inventory.coins+=earned
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
              const npc=s.npcs[nearNpcIdx],maxSell=Math.min(s.inventory.berries,LB_NPC_MAX_TRADES-npc.tradesDone)
              s.sellMenu={npcIdx:nearNpcIdx,amount:Math.min(1,maxSell),phase:"select",resultLine:"",earnedCoins:0};consumeE()
            }
          }
          // 5. open house-for-sale menu near building entrance
          if(eDown&&!eUsed&&s.gameStage===LL_EXPLORE&&s.sellMenu===null&&!s.houseSaleOpen){
            for(let ei=1;ei<ENTRANCES.length;ei++){
              if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){s.houseSaleOpen=true;s.houseSaleIdx=ei;consumeE();break}
            }
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
            let dx=0,dy=0
            if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A"))dx-=spd
            if(keys.has("ArrowRight")||keys.has("d")||keys.has("D"))dx+=spd
            if(keys.has("ArrowUp")||keys.has("w")||keys.has("W"))dy-=spd
            if(keys.has("ArrowDown")||keys.has("s")||keys.has("S"))dy+=spd
            if(dx&&dy){dx*=0.707;dy*=0.707}
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy);let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=fn.type==="tree"?TREE_HIT_R:BUSH_HIT_R
                const hcy=fn.wy-(fn.type==="tree"?TREE_HIT_OY:BUSH_HIT_OY)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON INVEST GAME FLOW  (Lesson 37 — Island Trading Center)
        // ─────────────────────────────────────────────────────────────────
        }else if(variant==="lessonInvest"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          const blooDialogue=nearBloo&&(s.gameStage===LIV_INTRO||s.gameStage===LIV_BOAT)
          const anyDialogue=blooDialogue||s.livTradeMenu
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
              s.inventory.berries+=gained
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
              s.notifText="Walk to the Port Trader at the dock — press [Z]!";s.notifTimer=360
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
                const msgs=["🍞 Got Bread — eat [X] to restore energy!","🌱 Seeds planted! Come back in 15s for berries.","🪵 Got Wood! Sell it at the Market (south-east)."]
                s.notifText=`Trade ${s.livTrades}/${LIV_TRADES_NEEDED}: ${msgs[s.livTradeMenuIdx]}`;s.notifTimer=200
                if(s.livTrades>=LIV_TRADES_NEEDED&&!s.completionCalled){
                  s.gameStage=LIV_COMPLETE;s.completionCalled=true;completeRef.current?.()
                }
              }else{
                s.notifText=`Need ${cost} berries — only have ${s.inventory.berries}!`;s.notifTimer=120
              }
              consumeE()
            }
          }

          updateNpcs(s.npcs)

          // movement
          if(!s.dayOver&&s.gameStage<LIV_COMPLETE&&!anyDialogue){
            let dx=0,dy=0
            if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A"))dx-=spd
            if(keys.has("ArrowRight")||keys.has("d")||keys.has("D"))dx+=spd
            if(keys.has("ArrowUp")||keys.has("w")||keys.has("W"))dy-=spd
            if(keys.has("ArrowDown")||keys.has("s")||keys.has("S"))dy+=spd
            if(dx&&dy){dx*=0.707;dy*=0.707}
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy);let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=fn.type==="tree"?TREE_HIT_R:BUSH_HIT_R
                const hcy=fn.wy-(fn.type==="tree"?TREE_HIT_OY:BUSH_HIT_OY)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy),minD=PLAYER_R+hr
                if(dist<minD&&dist>0){const push=(minD-dist)/dist;nx+=ddx*push;ny+=ddy*push}
              }
              s.px=nx;s.py=ny
            }
          }

        // ─────────────────────────────────────────────────────────────────
        // LESSON 3 GAME FLOW
        // ─────────────────────────────────────────────────────────────────
        }else{
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          const blooDialogue=nearBloo&&s.gameStage===L3_INTRO
          const anyDialogue=blooDialogue||s.activeConversation!==null||s.marketOpen

          if(!blooDialogue&&!s.marketOpen)updateBloo(s.bloo,variant,s.gameStage,s.px,s.py)

          // [X] close market
          if((keys.has("x")||keys.has("X"))&&s.marketOpen){
            s.marketOpen=false;keys.delete("x");keys.delete("X")
          }

          const eDown=keys.has("z")||keys.has("Z")
          let eUsed=false
          const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

          // 0. market open — buy bread
          if(eDown&&!eUsed&&s.marketOpen){
            if(s.inventory.coins>=L3_BREAD_TOTAL){
              s.inventory.coins-=L3_BREAD_TOTAL
              s.marketOpen=false
              s.gameStage=L3_COMPLETE
              s.notifText="🍞 Bread purchased! (+1 coin was sales tax)";s.notifTimer=180
              if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}
            }else{
              s.marketOpen=false
            }
            consumeE()
          }

          // 1. active NPC conversation
          if(eDown&&!eUsed&&s.activeConversation!==null){
            const conv=s.activeConversation
            if(conv.phase===0){
              const npc=s.npcs[conv.npcIdx]
              const canTrade=s.inventory.berries>=L3_NPC_BERRIES_COST&&npc.tradesDone<L3_NPC_MAX_TRADES
              if(canTrade){
                s.inventory.berries-=L3_NPC_BERRIES_COST;s.inventory.coins+=1
                npc.tradesDone++;if(npc.tradeTimer===0)npc.tradeTimer=L3_NPC_BUY_RESET
                s.activeConversation={npcIdx:conv.npcIdx,phase:1,line:L3_NPC_SOLD[conv.npcIdx]}
              }else{
                s.activeConversation=null
              }
            }else{
              s.activeConversation=null
            }
            consumeE()
          }

          // 2. bloo intro dialogue
          if(eDown&&!eUsed&&nearBloo&&s.gameStage===L3_INTRO){
            s.dialogIdx++;if(s.dialogIdx>=L3_BLOO_INTRO.length){s.gameStage=L3_EARN;s.dialogIdx=0}
            consumeE()
          }

          // 3. open NPC conversation or market
          if(eDown&&!eUsed&&s.gameStage>=L3_EARN&&s.activeConversation===null&&!s.marketOpen){
            let nearNpcIdx=-1,nearNpcDist=Infinity
            for(let i=0;i<s.npcs.length;i++){
              const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y)
              if(d<TS*2.5&&d<nearNpcDist){nearNpcDist=d;nearNpcIdx=i}
            }
            if(nearNpcIdx>=0){
              const npc=s.npcs[nearNpcIdx]
              if(npc.isMarket){
                s.marketOpen=true
              }else{
                let line:string
                if(npc.tradesDone>=L3_NPC_MAX_TRADES)line=L3_NPC_FULL[nearNpcIdx]
                else if(s.inventory.berries<L3_NPC_BERRIES_COST)line=L3_NPC_NOT_ENOUGH[nearNpcIdx]
                else line=L3_NPC_OFFER[nearNpcIdx]
                s.activeConversation={npcIdx:nearNpcIdx,phase:0,line}
              }
              consumeE()
            }
          }

          updateNpcs(s.npcs,s.activeConversation?.npcIdx??-1)

          // movement — flat SPEED, no sustenance penalty
          if(!s.dayOver&&s.gameStage<L3_COMPLETE&&!anyDialogue){
            let dx=0,dy=0
            if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A"))dx-=spd
            if(keys.has("ArrowRight")||keys.has("d")||keys.has("D"))dx+=spd
            if(keys.has("ArrowUp")||keys.has("w")||keys.has("W"))dy-=spd
            if(keys.has("ArrowDown")||keys.has("s")||keys.has("S"))dy+=spd
            if(dx&&dy){dx*=0.707;dy*=0.707}
            if(dx||dy){
              const n=resolveMove(s.px,s.py,dx,dy)
              let nx=n.x,ny=n.y
              for(const fn of s.foliage){
                const hr=fn.type==="tree"?TREE_HIT_R:BUSH_HIT_R
                const hcy=fn.wy-(fn.type==="tree"?TREE_HIT_OY:BUSH_HIT_OY)
                const ddx=nx-fn.wx,ddy=ny-hcy,dist=Math.hypot(ddx,ddy)
                const minD=PLAYER_R+hr
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
              s.inventory.berries+=drop.berries;s.inventory.coins+=drop.coins
              const parts:string[]=[]
              if(drop.berries>0)parts.push(`🍒×${drop.berries}`)
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
            s.px=38*TS;s.py=22*TS
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
            }
            else if(t===PATH){
              if(isBridge(r,c)){const wimg=waterImg(imgs,s.frame,r,c);wimg?blit(ctx,wimg,sx,sy):fbWater(ctx,sx,sy);drawBridgeOverlay(ctx,sx,sy,r,c,imgs)}
              else{const img=pathImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbPath(ctx,sx,sy)}
            }
            else if(t>=B_INCOME){const img=pathImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbPath(ctx,sx,sy)}
          }
        }

        if(variant==="lessonInvest"){
          drawPortDock(ctx,camX,camY)
          if(!s.boatGone)drawInvestBoat(ctx,LIV_BOAT_X,s.boatY,s.frame,camX,camY)
        }

        const npcMaxTrades=variant==="lesson1"?L1_NPC_MAX_TRADES:(variant==="lessonBudget"||variant==="lessonLoans")?LB_NPC_MAX_TRADES:variant==="lessonInvest"?LIV_TRADES_NEEDED:L3_NPC_MAX_TRADES
        drawNpcs(ctx,s.npcs,camX,camY,npcMaxTrades)
        if(variant==="lesson1")drawGovernor(ctx,s.gov,camX,camY,s.gameStage===L1_GOV_TAX&&s.govArrived)
        drawBloo(ctx,s.bloo,camX,camY,Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)<TS*2.5)

        const nearFoliageNode=nearFoliageIdx>=0?s.foliage[nearFoliageIdx]:null
        const fBehind=s.foliage.filter(n=>n.wy<s.py)
        const fFront=s.foliage.filter(n=>n.wy>=s.py)
        drawFoliage(ctx,fBehind,camX,camY,cw,ch,imgs,nearFoliageNode)
        drawSharedPlayer(ctx,s.px-camX,s.py-camY,playerColor)
        drawDrops(ctx,s.drops,camX,camY)
        drawFoliage(ctx,fFront,camX,camY,cw,ch,imgs,nearFoliageNode)
        drawBuildings(ctx,camX,camY,cw,ch,imgs)

        drawMinimap(ctx,s.px,s.py,cw)
        drawTopBar(ctx,cw,s.sustenance,s.inventory,s.harvestCooldown,variant,s.gameStage,imgs)

        // task sign
        let taskLabel:string
        if(variant==="lesson1"){
          const labels=["📍 Talk to Bloo — your guide",":berry: Harvest [Z] then eat [X] a berry","💬 Talk to Bloo again",`🪙 Sell berries [Z] — ${s.inventory.coins}/${L1_COIN_GOAL} coins`,"💬 Find Bloo near the Governor","⚠️ The Governor is here!","✅ Lesson complete!"]
          taskLabel=labels[Math.min(s.gameStage,L1_COMPLETE)]
        }else if(variant==="lessonBudget"){
          const labels=["📍 Talk to Bloo","🏠 Press [Z] near a building to check the price","💬 Talk to Bloo — what is a budget?","✅ Lesson complete!"]
          taskLabel=labels[Math.min(s.gameStage,LB_COMPLETE)]
        }else if(variant==="lessonLoans"){
          const labels=["📍 Talk to Bloo","🏠 Press [Z] near a building to check the price","💬 Talk to Bloo again","🏦 Head to the blue building (the bank)","✅ Lesson complete!"]
          taskLabel=labels[Math.min(s.gameStage,LL_COMPLETE)]
        }else if(variant==="lessonInvest"){
          const livLabels=["📍 Talk to Bloo — your guide","🚢 Watch the trade vessel depart",`🪙 Trade at the Port (${s.livTrades}/${LIV_TRADES_NEEDED}) — [Z] near dock`,"✅ Lesson complete!"]
          taskLabel=livLabels[Math.min(s.gameStage,LIV_COMPLETE)]
        }else{
          if(s.gameStage===L3_INTRO)taskLabel="📍 Talk to Bloo — your guide"
          else if(s.inventory.coins<L3_BREAD_TOTAL)taskLabel=`:berry: Sell berries for coins (${s.inventory.coins}/${L3_BREAD_TOTAL}) — ${L3_NPC_BERRIES_COST} berries = 1 coin`
          else taskLabel="🏪 Find the Market Trader (green) — press [Z]"
          if(s.gameStage===L3_COMPLETE)taskLabel="✅ Lesson complete!"
        }
        drawTaskSign(ctx,taskLabel,8,8,imgs)
        drawInventoryPanel(ctx,s.inventory,8,90,imgs)
        if(variant==="lessonInvest")drawLivInventory(ctx,8,136,s.livBread,s.livSeeds,s.livWood,s.livSeedTimer)

        // ── Bottom prompts ────────────────────────────────────────────────
        if(variant==="lessonBudget"){
          const bdBlooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const bdNearBloo=bdBlooDist<TS*2.5
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,LB_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed)
          }else if(s.houseSaleOpen&&s.houseSaleIdx>=0){
            drawHouseSaleMenu(ctx,cw,ch,s.houseSaleIdx,s.inventory.coins)
          }else if(bdNearBloo&&(s.gameStage===LB_INTRO||s.gameStage===LB_BLOO_BUDGET)){
            const lines=s.gameStage===LB_INTRO?LB_BLOO_INTRO:LB_BLOO_BUDGET_TALK
            const line=lines[Math.min(s.dialogIdx,lines.length-1)]
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=lines.length-1)
          }else{
            let nearNpcForPrompt=-1,nDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nDist){nDist=d;nearNpcForPrompt=i}}
            if(nearNpcForPrompt>=0&&s.gameStage>=LB_EXPLORE&&s.gameStage<LB_COMPLETE){
              const npc=s.npcs[nearNpcForPrompt];let msg:string
              if(npc.tradesDone>=LB_NPC_MAX_TRADES)msg=`Full — comes back in ${Math.ceil(npc.tradeTimer/60)}s`
              else if(s.inventory.berries===0)msg="No berries — harvest some first!"
              else if(npc.isTipNpc)msg="[Z] Sell berries (+ possible tip!)"
              else msg="[Z] Sell berries"
              drawPrompt(ctx,cw,ch,msg,npc.tradesDone>=LB_NPC_MAX_TRADES||s.inventory.berries===0?"#dc2626":"#1e40af")
            }else if(s.gameStage===LB_EXPLORE){
              for(let ei=1;ei<ENTRANCES.length;ei++){
                if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){
                  drawPrompt(ctx,cw,ch,`[Z] Check price — ${ENTRANCES[ei].name}`,"#1e40af");break
                }
              }
              if(nearFoliageNode){const fn=nearFoliageNode;const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:"";drawPrompt(ctx,cw,ch,`[Z] Harvest ${fn.type==="tree"?"Tree":"Bush"} (+${HARVEST_BERRIES} berries)${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")}
            }
          }
        }else if(variant==="lessonLoans"){
          const llBlooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const llNearBloo=llBlooDist<TS*2.5
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,LB_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed)
          }else if(s.houseSaleOpen&&s.houseSaleIdx>=0){
            drawHouseSaleMenu(ctx,cw,ch,s.houseSaleIdx,s.inventory.coins)
          }else if(llNearBloo&&(s.gameStage===LL_INTRO||s.gameStage===LL_BLOO_TALK)){
            const lines=s.gameStage===LL_INTRO?LL_BLOO_INTRO:LL_BLOO_LOAN
            const line=lines[Math.min(s.dialogIdx,lines.length-1)]
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=lines.length-1)
          }else if(s.gameStage===LL_BANK){
            drawPrompt(ctx,cw,ch,"Head to the blue building in the center!","#1d4ed8")
          }else{
            let nearNpcForPrompt=-1,nDist=Infinity
            for(let i=0;i<s.npcs.length;i++){const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y);if(d<TS*2.5&&d<nDist){nDist=d;nearNpcForPrompt=i}}
            if(nearNpcForPrompt>=0&&s.gameStage>=LL_EXPLORE&&s.gameStage<LL_BANK){
              const npc=s.npcs[nearNpcForPrompt];let msg:string
              if(npc.tradesDone>=LB_NPC_MAX_TRADES)msg=`Full — comes back in ${Math.ceil(npc.tradeTimer/60)}s`
              else if(s.inventory.berries===0)msg="No berries — harvest some first!"
              else if(npc.isTipNpc)msg="[Z] Sell berries (+ possible tip!)"
              else msg="[Z] Sell berries"
              drawPrompt(ctx,cw,ch,msg,npc.tradesDone>=LB_NPC_MAX_TRADES||s.inventory.berries===0?"#dc2626":"#1e40af")
            }else if(s.gameStage===LL_EXPLORE){
              for(let ei=1;ei<ENTRANCES.length;ei++){
                if(Math.hypot(s.px-ENTRANCES[ei].wx,s.py-ENTRANCES[ei].wy)<TS*2){
                  drawPrompt(ctx,cw,ch,`[Z] Check price — ${ENTRANCES[ei].name}`,"#1e40af");break
                }
              }
              if(nearFoliageNode){const fn=nearFoliageNode;const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:"";drawPrompt(ctx,cw,ch,`[Z] Harvest ${fn.type==="tree"?"Tree":"Bush"} (+${HARVEST_BERRIES} berries)${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")}
            }
          }
        }else if(variant==="lesson1"){
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(s.sellMenu!==null){
            const smNpc=s.npcs[s.sellMenu.npcIdx]
            drawSellMenu(ctx,cw,ch,NPC_NAMES[s.sellMenu.npcIdx],smNpc.color,s.sellMenu,
              s.inventory.berries,L1_NPC_MAX_TRADES-smNpc.tradesDone,smNpc.isTipNpc,smNpc.tipUsed)
          }else if(nearBloo&&s.gameStage===L1_HARVEST&&!s.blooHarvestDismissed){
            const line=L1_BLOO_HARVEST_REMIND[s.blooRemindIdx%L1_BLOO_HARVEST_REMIND.length]
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,true)
          }else if(nearBloo&&(s.gameStage===L1_INTRO||s.gameStage===L1_SELL_INTRO||s.gameStage===L1_GROSS_TALK)){
            const lines=s.gameStage===L1_INTRO?L1_BLOO_INTRO:s.gameStage===L1_SELL_INTRO?L1_BLOO_SELL:L1_BLOO_GROSS
            const line=lines[Math.min(s.dialogIdx,lines.length-1)]
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=lines.length-1)
          }else if(s.gameStage===L1_GOV_TAX&&s.govArrived){
            drawDialogBox(ctx,cw,ch,"The Governor","#f59e0b",L1_GOV_TAX_LINE,true)
            drawPrompt(ctx,cw,ch,`[Z] Accept  (−${s.govTaxAmount} coins)`,"#d97706")
          }else if(s.gameStage===L1_GOV_TAX&&!s.govArrived){
            drawPrompt(ctx,cw,ch,"The Governor is approaching…","#ea580c")
          }else{
            let nearNpcForPrompt=-1,nDist=Infinity
            for(let i=0;i<s.npcs.length;i++){
              const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y)
              if(d<TS*2.5&&d<nDist){nDist=d;nearNpcForPrompt=i}
            }
            if(nearNpcForPrompt>=0&&s.gameStage>=L1_SELLING&&s.gameStage<L1_GROSS_TALK){
              const npc=s.npcs[nearNpcForPrompt]
              let msg:string
              if(npc.tradesDone>=L1_NPC_MAX_TRADES)msg=`Full — comes back in ${Math.ceil(npc.tradeTimer/60)}s`
              else if(s.inventory.berries===0)msg="No berries — go harvest some first!"
              else if(npc.isTipNpc)msg="[Z] Sell berries (+ possible tip!)"
              else msg="[Z] Sell berries"
              drawPrompt(ctx,cw,ch,msg,npc.tradesDone>=L1_NPC_MAX_TRADES||s.inventory.berries===0?"#dc2626":"#1e40af")
            }else if(nearFoliageNode&&s.gameStage>=L1_HARVEST){
              const fn=nearFoliageNode
              const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:""
              drawPrompt(ctx,cw,ch,`[Z] Harvest ${fn.type==="tree"?"Tree":"Bush"} (+${HARVEST_BERRIES} berries)${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")
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
            drawLivTradeMenu(ctx,cw,ch,s.inventory.berries,s.livTradeMenuIdx,s.livBread,s.livSeeds,s.livWood)
          }else if(livNearBloo&&(s.gameStage===LIV_INTRO||s.gameStage===LIV_BOAT)){
            const lines=s.gameStage===LIV_INTRO?LIV_BLOO_INTRO:LIV_BLOO_BOAT
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",lines[Math.min(s.dialogIdx,lines.length-1)],s.dialogIdx>=lines.length-1)
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
            drawPrompt(ctx,cw,ch,`[Z] Harvest ${fn.type==="tree"?"Tree":"Bush"} (+${HARVEST_BERRIES} berries)${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")
          }
        }else{
          // lesson 3 prompts
          const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
          const nearBloo=blooDist<TS*2.5
          if(s.activeConversation!==null){
            const conv=s.activeConversation
            const npc=s.npcs[conv.npcIdx]
            drawDialogBox(ctx,cw,ch,NPC_NAMES[conv.npcIdx],npc.color,conv.line,conv.phase===1)
          }else if(nearBloo&&s.gameStage===L3_INTRO){
            const line=L3_BLOO_INTRO[Math.min(s.dialogIdx,L3_BLOO_INTRO.length-1)]
            drawDialogBox(ctx,cw,ch,"Bloo","#3b82f6",line,s.dialogIdx>=L3_BLOO_INTRO.length-1)
          }else if(!s.marketOpen){
            let nearNpcForPrompt=-1,nDist=Infinity
            for(let i=0;i<s.npcs.length;i++){
              const d=Math.hypot(s.px-s.npcs[i].x,s.py-s.npcs[i].y)
              if(d<TS*2.5&&d<nDist){nDist=d;nearNpcForPrompt=i}
            }
            if(nearNpcForPrompt>=0&&s.gameStage>=L3_EARN){
              const npc=s.npcs[nearNpcForPrompt]
              let msg:string,color:string
              if(npc.isMarket){msg="[Z] Open Market Shop";color="#065f46"}
              else if(npc.tradesDone>=L3_NPC_MAX_TRADES){msg=`Full — restocks in ${Math.ceil(npc.tradeTimer/60)}s`;color="#dc2626"}
              else if(s.inventory.berries<L3_NPC_BERRIES_COST){msg=`[Z] Sell berries (need ${L3_NPC_BERRIES_COST}, you have ${s.inventory.berries})`;color="#dc2626"}
              else{msg=`[Z] Sell ${L3_NPC_BERRIES_COST} berries → 1 coin`;color="#1e40af"}
              drawPrompt(ctx,cw,ch,msg,color)
            }else if(nearFoliageNode){
              const fn=nearFoliageNode
              const cdLeft=s.harvestCooldown>0?`  (${(s.harvestCooldown/60).toFixed(1)}s)`:""
              drawPrompt(ctx,cw,ch,`[Z] Harvest ${fn.type==="tree"?"Tree":"Bush"} (+${HARVEST_BERRIES} berries)${cdLeft}`,s.harvestCooldown>0?"#94a3b8":"#1e40af")
            }
          }
          if(s.marketOpen)drawMarketMenu(ctx,cw,ch,s.inventory.coins)
        }

        // ── Shared overlays ───────────────────────────────────────────────
        if(s.notifTimer>0)drawNotifBanner(ctx,cw,ch,s.notifText,Math.min(1,s.notifTimer/40))
        if(variant==="lesson3"&&s.gameStage===L3_COMPLETE)drawLessonCompleteL3(ctx,cw,ch)
        if(s.dayOver)drawDayOver(ctx,cw,ch,s.deathDropped,s.deathLost)

        s.raf=requestAnimationFrame(loop)
      }

      stateRef.current.raf=requestAnimationFrame(loop)
      canvas.focus()
    })

    return()=>{
      cancelAnimationFrame(stateRef.current.raf)
      window.removeEventListener("keydown",onDown)
      window.removeEventListener("keyup",onUp)
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
              ? "The Governor took his 10% cut — that's income tax in action."
              : isLoans
                ? "You saw how much things cost — that's why budgeting matters. Track what you earn and spend!"
                : isInvest
                  ? "You traded at the Island Port! Markets connect places that each have something the other needs."
                  : "You discovered you need a loan! Time to visit the bank and learn how loans work."}
          </p>
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-8 py-4 text-xl font-semibold text-yellow-700">
            🪙 Coins earned: {finalCoins}
          </div>
          <p className="text-gray-400 text-sm">
            {isL1?"Great work out there, Berry Collector!":isLoans?"Great work exploring!":"On to the bank!"}
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
        style={{imageRendering:"auto"}}
      />
      {showOverlay&&(
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{opacity:overlayOpacity,transition:"opacity 1.5s ease-in"}}
        />
      )}
    </div>
  )
}
