"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { saveGameLesson } from "@/actions/game-lesson"
import {
  SHARED_SPEED, SHARED_PLAYER_R,
  SUSTENANCE_MAX, SUSTENANCE_DRAIN,
  BERRY_SUSTENANCE, HARVEST_BERRIES, HARVEST_COOLDOWN,
  FOLIAGE_REGEN, FOLIAGE_RANGE,
  TREE_HIT_R, BUSH_HIT_R, TREE_HIT_OY, BUSH_HIT_OY,
  NPC_HALF, NPC_SPEED,
  type ImgMap, type Inventory, freshInventory,
  sustenanceSpeedMult, drawInventoryPanel,
  drawSharedPlayer,
} from "@/lib/game-shared"

// ─── World constants ──────────────────────────────────────────────────────────
const TS=32,MAP_W=88,MAP_H=58
const SPEED=SHARED_SPEED,PLAYER_R=SHARED_PLAYER_R

// ─── Stage constants ──────────────────────────────────────────────────────────
const STAGE_DAY=0
const STAGE_NIGHT_FALL=1
const STAGE_TIMECARD_1=2
const STAGE_SLEEP_DRAIN=3
const STAGE_TIMECARD_2=4
const STAGE_MORNING=5
const STAGE_HOUSE_PICK=6
const STAGE_CONFIRM=7
const STAGE_COMPLETE=8

// ─── Timing / rate constants ──────────────────────────────────────────────────
const DAY_DURATION=480
const NIGHT_FADE_DUR=120
const TIMECARD_DUR=220
const SLEEP_DRAIN=0.30
const SUSTENANCE_SLEEP_FLOOR=10  // sleep drain stops at 10 % (budget-specific)

// ─── Tile IDs ─────────────────────────────────────────────────────────────────
const WATER=0,GRASS=1,FLOWER=2,PATH=3
const B_INCOME=4,B_TAX=5,B_BUDGET=6,B_SAVINGS=7,B_MARKET=8
type TileID=0|1|2|3|4|5|6|7|8

// ─── House definitions ────────────────────────────────────────────────────────
// Reuse existing buildings:
//   house 0 → Savings Bank (orange, left island)  — shared shack, cheap, 0 storage
//   house 1 → Budget HQ   (purple, center island) — Cozy Cottage, private, expensive
//   house 2 → Tax Office  (red, right island)     — shared apartment, medium, 2 storage
interface HouseDef{
  name:string;desc:string
  downPayment:number;dailyRate:number;storageSlots:number
  color:string;border:string
  entranceX:number;entranceY:number
  labelCenterX:number;labelTopY:number
}
const HOUSE_INTERACT_DIST=2.8*TS
const HOUSE_DEFS:HouseDef[]=[
  { name:"Shrunken Shack",
    desc:"A shared shack split with roommates. Very cheap, but zero storage space.",
    downPayment:5,dailyRate:2,storageSlots:0,
    color:"#f59e0b",border:"#b45309",
    entranceX:8*TS,entranceY:19*TS,
    labelCenterX:8*TS,labelTopY:14*TS },
  { name:"Cozy Cottage",
    desc:"Your own private cabin. It's spacious and includes 4 storage slots but quite pricey.",
    downPayment:50,dailyRate:10,storageSlots:4,
    color:"#8b5cf6",border:"#6d28d9",
    entranceX:Math.round(41.5*TS),entranceY:34*TS,
    labelCenterX:Math.round(41.5*TS),labelTopY:29*TS },
  { name:"Urban Union",
    desc:"A shared apartment where you can split the bills with roommates. Comes with 2 storage slots.",
    downPayment:20,dailyRate:5,storageSlots:2,
    color:"#ef4444",border:"#b91c1c",
    entranceX:Math.round(72.5*TS),entranceY:14*TS,
    labelCenterX:Math.round(72.5*TS),labelTopY:9*TS },
]

// ─── Task labels ──────────────────────────────────────────────────────────────
const TASK_LABELS=[
  "🌅 The day is ending. Enjoy the island!",
  "🌙 Night is falling...",
  "",
  "😴 Sleeping outside...",
  "",
  "💬 Talk to Bloo",
  "🏠 Visit the 3 houses: press [Z] to view",
  "💬 Talk to Bloo",
  "✅ Lesson complete!",
]

// ─── Bloo dialogue ────────────────────────────────────────────────────────────
const BLOO_MORNING:string[]=[
  "OH! There you are! I've been searching everywhere!",
  "You slept OUTSIDE? All night?! In the cold?!",
  "Everyone needs shelter, it's a basic shape need!",
  "Housing is one of the biggest FIXED costs in any budget.",
  "Lucky for you there are 3 houses for rent right here.",
  "Walk up to each one and press [Z] to see the details.",
  "You must pay an starting down payment now, and then daily rent. Choose wisely! 🏠",
]
const BLOO_CONFIRM:string[]=[
  "YES! You paid your down payment. You're officially a resident!",
  "I'm glad you have a home and aren't sleeping outside anymore.",
  "Since homes are so important, you must always set asside coins for them first!",
  "Lesson complete! You have a home base now! 🏠🎉",
]

// ─── Island shapes ────────────────────────────────────────────────────────────
interface Island{cr:number;cc:number;rx:number;ry:number}
const ISLANDS:Island[]=[
  {cr:29,cc:37,rx:17,ry:14},
  {cr:16,cc:9, rx:9, ry:8 },
  {cr:11,cc:73,rx:8, ry:8 },
  {cr:45,cc:73,rx:8, ry:8 },
]
function isLand(r:number,c:number):boolean{
  for(const isl of ISLANDS){
    const nx=(c-isl.cc)/isl.rx,ny=(r-isl.cr)/isl.ry
    const dist=Math.sqrt(nx*nx+ny*ny)
    const angle=Math.atan2(ny,nx)
    const wobble=0.08*Math.sin(angle*5+1.1)+0.05*Math.sin(angle*9-0.7)
    if(dist<1+wobble) return true
  }
  return false
}

// ─── Building definitions (original 5 only — no extra house tiles) ────────────
interface BuildingDef{tile:TileID;r1:number;r2:number;c1:number;c2:number;color:string;border:string;label:string[];svg:string}
const BUILDING_DEFS:BuildingDef[]=[
  {tile:B_INCOME, r1:20,r2:24,c1:27,c2:32,color:"#3b82f6",border:"#1d4ed8",label:["Income","Center"],svg:"house"},
  {tile:B_BUDGET, r1:29,r2:33,c1:39,c2:44,color:"#8b5cf6",border:"#6d28d9",label:["Budget","HQ"],   svg:"cabin"},
  {tile:B_SAVINGS,r1:14,r2:18,c1:5, c2:10,color:"#f59e0b",border:"#b45309",label:["Savings","Bank"],svg:"tallcabin"},
  {tile:B_TAX,    r1:9, r2:13,c1:70,c2:75,color:"#ef4444",border:"#b91c1c",label:["Tax","Office"],  svg:"tallhouse"},
  {tile:B_MARKET, r1:43,r2:47,c1:70,c2:75,color:"#10b981",border:"#065f46",label:["Market"],        svg:"cabin"},
]

// ─── Map generation ───────────────────────────────────────────────────────────
const GRASS_LAYER:number[][]=[]
const FLOWER_MAP:boolean[][]=[]
function buildMap():TileID[][]{
  const m:TileID[][]=Array.from({length:MAP_H},()=>new Array<TileID>(MAP_W).fill(WATER))
  const fill=(r1:number,r2:number,c1:number,c2:number,t:TileID)=>{
    for(let r=Math.max(0,r1);r<=Math.min(MAP_H-1,r2);r++)
      for(let c=Math.max(0,c1);c<=Math.min(MAP_W-1,c2);c++)
        m[r][c]=t
  }
  const diag=(r1:number,c1:number,r2:number,c2:number,t:TileID)=>{
    const dr=r2-r1,dc=c2-c1,steps=Math.max(Math.abs(dr),Math.abs(dc))
    for(let i=0;i<=steps;i++){
      const r=Math.round(r1+dr*i/steps),c=Math.round(c1+dc*i/steps)
      if(r>=0&&r<MAP_H&&c>=0&&c<MAP_W) m[r][c]=t
      if(Math.abs(dc)>=Math.abs(dr)){if(r+1>=0&&r+1<MAP_H&&c>=0&&c<MAP_W) m[r+1][c]=t}
      else{if(r>=0&&r<MAP_H&&c+1>=0&&c+1<MAP_W) m[r][c+1]=t}
    }
  }
  for(let r=0;r<MAP_H;r++) for(let c=0;c<MAP_W;c++) if(isLand(r,c)) m[r][c]=GRASS
  for(let c=0;c<MAP_W;c++) if(m[25][c]===GRASS||m[26][c]===GRASS){if(c>=20&&c<=54){m[25][c]=WATER;m[26][c]=WATER}}
  diag(17,14,22,20,PATH);diag(22,51,10,65,PATH);diag(29,51,44,65,PATH)
  fill(22,23,20,55,PATH);fill(28,29,20,55,PATH);fill(22,29,40,41,PATH)
  fill(19,22,29,30,PATH);fill(19,19,29,33,PATH)
  fill(28,34,43,44,PATH);fill(28,28,38,44,PATH)
  fill(16,19,9,14,PATH);fill(13,16,7,8,PATH);fill(13,13,7,11,PATH)
  fill(10,15,65,68,PATH);fill(10,10,66,73,PATH)
  fill(45,48,65,68,PATH);fill(45,45,66,73,PATH);fill(44,45,65,66,PATH)
  {
    const scatter=(r:number,c:number,pct:number)=>{
      if(r<0||r>=MAP_H||c<0||c>=MAP_W||m[r][c]!==PATH) return
      let pn=0
      if(m[r-1]?.[c]===PATH)pn++;if(m[r+1]?.[c]===PATH)pn++
      if(m[r]?.[c-1]===PATH)pn++;if(m[r]?.[c+1]===PATH)pn++
      if(pn>=3) return
      if(((r*1337+c*7919)%100)/100<pct) m[r][c]=GRASS
    }
    for(const b of BUILDING_DEFS){
      const{r1,r2,c1,c2}=b
      fill(r1-3,r1-1,c1-1,c2+1,PATH)
      fill(r1,r2,c1-1,c1-1,PATH)
      fill(r1,r2,c2+1,c2+1,PATH)
      fill(r2+1,r2+2,c1-2,c2+2,PATH)
      for(let c=c1-2;c<=c2+2;c++){
        scatter(r2+2,c,0.42)
        if(c<c1-1||c>c2+1) scatter(r2+1,c,0.55)
      }
    }
  }
  for(const b of BUILDING_DEFS) fill(b.r1,b.r2,b.c1,b.c2,b.tile)
  for(let r=0;r<MAP_H;r++){GRASS_LAYER.push(new Array(MAP_W).fill(0));FLOWER_MAP.push(new Array(MAP_W).fill(false))}
  const seeds:{r:number;c:number;type:number}[]=[]
  const prng=(n:number)=>((n*1664525+1013904223)&0xffffffff)>>>0
  let state=42
  for(let i=0;i<35;i++){
    state=prng(state);const r=(state%MAP_H+MAP_H)%MAP_H
    state=prng(state);const c=(state%MAP_W+MAP_W)%MAP_W
    state=prng(state);const type=state%6
    seeds.push({r,c,type})
  }
  for(let r=0;r<MAP_H;r++) for(let c=0;c<MAP_W;c++){
    if(m[r][c]!==GRASS&&m[r][c]!==FLOWER) continue
    let best=Infinity,bestType=0
    for(const s of seeds){const d=(r-s.r)**2+(c-s.c)**2;if(d<best){best=d;bestType=s.type}}
    GRASS_LAYER[r][c]=bestType
  }
  const flowerCenters=[[7,4],[9,14],[23,32],[33,30],[35,50],[13,78],[7,77],[47,78],[39,52],[22,25]]
  for(const [fr,fc] of flowerCenters){
    for(let r=fr-5;r<=fr+5;r++) for(let c=fc-5;c<=fc+5;c++){
      if(r<0||r>=MAP_H||c<0||c>=MAP_W||m[r][c]!==GRASS) continue
      const dist=Math.sqrt((r-fr)**2+(c-fc)**2);if(dist>5) continue
      let tooClose=false
      for(let dr=-1;dr<=1&&!tooClose;dr++) for(let dc=-1;dc<=1&&!tooClose;dc++){
        const nr=r+dr,nc=c+dc;if(nr<0||nr>=MAP_H||nc<0||nc>=MAP_W) continue
        const t=m[nr][nc];if(t===PATH||t>=B_INCOME||t===WATER) tooClose=true
      }
      if(tooClose) continue
      const prob=1-dist/5,hash=((r*1337+c*7919)%100)/100
      if(hash<prob*0.7) FLOWER_MAP[r][c]=true
    }
  }
  return m
}
const MAP=buildMap()

// ─── Bridge barriers ──────────────────────────────────────────────────────────
let _bridgesOpen=true
function computeBarrierTiles():Set<string>{
  const set=new Set<string>()
  const addBarrier=(r1:number,c1:number,r2:number,c2:number)=>{
    const dr=r2-r1,dc=c2-c1,steps=Math.max(Math.abs(dr),Math.abs(dc))
    const lo=Math.floor(steps*0.25),hi=Math.ceil(steps*0.75)
    for(let i=lo;i<=hi;i++){
      const r=Math.round(r1+dr*i/steps),c=Math.round(c1+dc*i/steps)
      set.add(`${r},${c}`)
      if(Math.abs(dc)>=Math.abs(dr)) set.add(`${r+1},${c}`)
      else set.add(`${r},${c+1}`)
    }
  }
  addBarrier(17,14,22,20);addBarrier(22,51,10,65);addBarrier(29,51,44,65)
  return set
}
const BARRIER_TILES=computeBarrierTiles()

// ─── Image loading ────────────────────────────────────────────────────────────
async function loadImages():Promise<ImgMap>{
  const pngNames=["grass1","grass2","grass3","grass4","grass5","grass6","grassflower1","grassflower2","path1","path2","path3","path4","path5","path6","water1","water2"]
  const woodSvgNames=["house","cabin","tallcabin","tallhouse"]
  const imgs:ImgMap={}
  return Promise.all([
    ...pngNames.map(n=>new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs[n]=img;res()};img.onerror=()=>res();img.src=`/${n}.png`})),
    ...woodSvgNames.map(n=>new Promise<void>(res=>{const img=new Image();img.onload=()=>{imgs[n]=img;res()};img.onerror=()=>res();img.src=`/woodbuildings/${n}.svg`})),
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
  if(r<0||r>=MAP_H||c<0||c>=MAP_W) return true
  const t=MAP[r][c]
  if(t===WATER) return true
  if(!_bridgesOpen&&t===PATH&&BARRIER_TILES.has(`${r},${c}`)) return true
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
  homeX:number;homeY:number
  goingHome:boolean;atHome:boolean
}
function initNpcs():NpcState[]{
  const W=2
  return[
    {x:43.5*TS,y:34.5*TS,tx:43.5*TS,ty:34.5*TS,wait:60,color:"#8b5cf6",border:"#6d28d9",bx1:(39-W)*TS,bx2:(44+1+W)*TS,by1:(29-W)*TS,by2:(33+1+W)*TS,homeX:41*TS,homeY:34*TS,goingHome:false,atHome:false},
    {x:11.5*TS,y:19.5*TS,tx:11.5*TS,ty:19.5*TS,wait:60,color:"#f59e0b",border:"#b45309",bx1:(5-W)*TS, bx2:(10+1+W)*TS,by1:(14-W)*TS,by2:(18+1+W)*TS,homeX:8*TS, homeY:15*TS,goingHome:false,atHome:false},
    {x:67.5*TS,y:14.5*TS,tx:67.5*TS,ty:14.5*TS,wait:60,color:"#ef4444",border:"#b91c1c",bx1:(70-W)*TS,bx2:(75+1+W)*TS,by1:(9-W)*TS, by2:(13+1+W)*TS,homeX:71*TS,homeY:10*TS,goingHome:false,atHome:false},
    {x:67.5*TS,y:48.5*TS,tx:67.5*TS,ty:48.5*TS,wait:60,color:"#10b981",border:"#065f46",bx1:(70-W)*TS,bx2:(75+1+W)*TS,by1:(43-W)*TS,by2:(47+1+W)*TS,homeX:71*TS,homeY:44*TS,goingHome:false,atHome:false},
  ]
}
function updateNpcs(npcs:NpcState[],nightMode:boolean){
  for(const n of npcs){
    if(n.atHome) continue
    if(nightMode&&!n.goingHome){n.goingHome=true;n.tx=n.homeX;n.ty=n.homeY}
    if(n.goingHome){
      const dx=n.homeX-n.x,dy=n.homeY-n.y,dist=Math.sqrt(dx*dx+dy*dy)
      if(dist<TS*0.5){n.atHome=true;continue}
      const spd=Math.min(NPC_SPEED*1.5,dist)
      n.x+=dx/dist*spd;n.y+=dy/dist*spd
      continue
    }
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
function drawNpcs(ctx:CanvasRenderingContext2D,npcs:NpcState[],camX:number,camY:number){
  for(const n of npcs){
    if(n.atHome) continue
    const sx=Math.round(n.x-camX),sy=Math.round(n.y-camY)
    ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(sx-NPC_HALF+2,sy+NPC_HALF,NPC_HALF*2-2,3)
    ctx.fillStyle=n.color;ctx.fillRect(sx-NPC_HALF,sy-NPC_HALF,NPC_HALF*2,NPC_HALF*2)
    ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillRect(sx-NPC_HALF+1,sy-NPC_HALF+1,NPC_HALF-1,NPC_HALF-1)
    ctx.strokeStyle=n.border;ctx.lineWidth=1.5;ctx.strokeRect(sx-NPC_HALF,sy-NPC_HALF,NPC_HALF*2,NPC_HALF*2)
  }
}

// ─── Bloo ─────────────────────────────────────────────────────────────────────
interface BlooState{x:number;y:number;tx:number;ty:number;wait:number;path:{x:number;y:number}[];pathTimer:number}
function initBloo():BlooState{return{x:41*TS,y:22*TS,tx:41*TS,ty:22*TS,wait:30,path:[],pathTimer:0}}
function blooOnLand(wx:number,wy:number):boolean{
  const R=8
  return !isBlocking(wx+R,wy+R)&&!isBlocking(wx-R,wy+R)&&!isBlocking(wx+R,wy-R)&&!isBlocking(wx-R,wy-R)
}

// A* on the tile grid — returns world-space waypoints Bloo should walk through
function findPath(sx:number,sy:number,gx:number,gy:number):{x:number;y:number}[]{
  const sc=Math.floor(sx/TS),sr=Math.floor(sy/TS)
  const gc=Math.floor(gx/TS),gr=Math.floor(gy/TS)
  if(sc===gc&&sr===gr) return []
  const walkable=(r:number,c:number)=>{
    if(r<0||r>=MAP_H||c<0||c>=MAP_W) return false
    const t=MAP[r][c];return t!==WATER&&t<B_INCOME
  }
  type N={r:number;c:number;g:number;h:number;parent:N|null}
  const key=(r:number,c:number)=>r*MAP_W+c
  const open=new Map<number,N>()
  const closed=new Set<number>()
  open.set(key(sr,sc),{r:sr,c:sc,g:0,h:Math.abs(gc-sc)+Math.abs(gr-sr),parent:null})
  for(let iter=0;iter<600&&open.size>0;iter++){
    let best:N|null=null
    for(const n of open.values()) if(!best||n.g+n.h<best.g+best.h) best=n
    if(!best) break
    if(best.r===gr&&best.c===gc){
      const path:{x:number;y:number}[]=[]
      let n:N|null=best
      while(n){path.unshift({x:(n.c+0.5)*TS,y:(n.r+0.5)*TS});n=n.parent}
      path.shift() // skip start tile
      return path
    }
    const k=key(best.r,best.c);open.delete(k);closed.add(k)
    for(const[dr,dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
      const nr=best.r+dr,nc=best.c+dc
      if(!walkable(nr,nc)||closed.has(key(nr,nc))) continue
      const g=best.g+(dr&&dc?1.414:1)
      const h=Math.abs(gc-nc)+Math.abs(gr-nr)
      const ek=key(nr,nc);const ex=open.get(ek)
      if(!ex||g<ex.g) open.set(ek,{r:nr,c:nc,g,h,parent:best})
    }
  }
  return []
}

function updateBloo(bloo:BlooState,stage:number,px:number,py:number){
  if(stage===STAGE_MORNING||stage===STAGE_CONFIRM||stage===STAGE_HOUSE_PICK){
    const dist=Math.hypot(px-bloo.x,py-bloo.y)
    if(dist<=2*TS){bloo.path=[];return}
    // Recalculate path periodically so Bloo tracks a moving player
    bloo.pathTimer--
    if(bloo.pathTimer<=0||bloo.path.length===0){
      bloo.path=findPath(bloo.x,bloo.y,px,py)
      bloo.pathTimer=90
    }
    if(bloo.path.length>0){
      const wp=bloo.path[0]
      const wdx=wp.x-bloo.x,wdy=wp.y-bloo.y,wdist=Math.hypot(wdx,wdy)
      if(wdist<TS*0.6){
        bloo.path.shift()
      }else{
        const spd=Math.min(2.0,wdist)
        const nx=bloo.x+wdx/wdist*spd,ny=bloo.y+wdy/wdist*spd
        if(blooOnLand(nx,ny)){bloo.x=nx;bloo.y=ny}
        else{bloo.path=[]}  // path invalidated — recompute next frame
      }
    }else{
      // No path — try angled fallback directions
      const dx=px-bloo.x,dy=py-bloo.y
      const angle=Math.atan2(dy,dx),spd=Math.min(2.0,dist)
      for(const off of[0,0.5,-0.5,1.0,-1.0,1.5,-1.5]){
        const nx=bloo.x+Math.cos(angle+off)*spd,ny=bloo.y+Math.sin(angle+off)*spd
        if(blooOnLand(nx,ny)){bloo.x=nx;bloo.y=ny;break}
      }
    }
    return
  }
  if(stage>=STAGE_NIGHT_FALL&&stage<STAGE_MORNING){
    const hx=30*TS,hy=20*TS
    const dx=hx-bloo.x,dy=hy-bloo.y,dist=Math.sqrt(dx*dx+dy*dy)
    if(dist>2){const spd=Math.min(1.5,dist);const nx=bloo.x+dx/dist*spd,ny=bloo.y+dy/dist*spd;if(blooOnLand(nx,ny)){bloo.x=nx;bloo.y=ny}}
    return
  }
  const homeX=41*TS,homeY=22*TS
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
    const spd=Math.min(1.2,dist)
    const nx=bloo.x+dx/dist*spd,ny=bloo.y+dy/dist*spd
    if(blooOnLand(nx,ny)){bloo.x=nx;bloo.y=ny}
  }
}
function drawBloo(ctx:CanvasRenderingContext2D,bloo:BlooState,camX:number,camY:number,nearPlayer:boolean){
  const sx=Math.round(bloo.x-camX),sy=Math.round(bloo.y-camY),S=10
  ctx.fillStyle="rgba(0,0,0,0.22)";ctx.fillRect(sx-S+2,sy+S,S*2-2,3)
  ctx.fillStyle="#3b82f6";ctx.fillRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="rgba(255,255,255,0.3)";ctx.fillRect(sx-S+1,sy-S+1,S-1,S-1)
  ctx.strokeStyle=nearPlayer?"#93c5fd":"#1d4ed8";ctx.lineWidth=1.5;ctx.strokeRect(sx-S,sy-S,S*2,S*2)
  ctx.fillStyle="#93c5fd";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
  ctx.fillText("Bloo",sx,sy-S-13)
}

// ─── Foliage ──────────────────────────────────────────────────────────────────
const TREE_DW=64,TREE_DH=64,BUSH_DW=48,BUSH_DH=24
interface FoliageNode{wx:number;wy:number;type:"tree"|"bush";hasFruit:boolean;regenTimer:number}
function initFoliage():FoliageNode[]{
  const nodes:FoliageNode[]=[],MIN_GAP=2*TS
  const try_=(c:number,r:number,type:"tree"|"bush")=>{
    if(r<0||r>=MAP_H||c<0||c>=MAP_W||MAP[r][c]!==GRASS) return
    const wx=(c+0.5)*TS,wy=(r+0.5)*TS
    if(nodes.some(n=>Math.hypot(n.wx-wx,n.wy-wy)<MIN_GAP)) return
    nodes.push({wx,wy,type,hasFruit:true,regenTimer:0})
  }
  try_(22,17,"tree");try_(24,18,"bush");try_(21,20,"bush")
  try_(48,17,"tree");try_(51,18,"tree");try_(46,19,"bush");try_(52,20,"bush")
  try_(22,25,"tree");try_(25,26,"bush");try_(23,27,"bush")
  try_(50,24,"tree");try_(53,25,"bush");try_(48,26,"bush");try_(52,27,"tree")
  try_(23,31,"tree");try_(26,33,"bush");try_(22,34,"bush")
  try_(51,32,"tree");try_(49,34,"bush");try_(53,36,"tree");try_(51,37,"bush")
  try_(34,39,"tree");try_(38,41,"bush");try_(33,41,"bush")
  try_(6,10,"tree");try_(10,11,"bush");try_(13,10,"bush")
  try_(70,6,"tree");try_(75,5,"tree");try_(72,7,"bush");try_(77,7,"bush")
  try_(70,39,"tree");try_(76,40,"tree");try_(73,38,"bush")
  return nodes
}
function drawFoliage(ctx:CanvasRenderingContext2D,foliage:FoliageNode[],camX:number,camY:number,cw:number,ch:number,imgs:ImgMap){
  const sorted=[...foliage].sort((a,b)=>a.wy-b.wy)
  for(const n of sorted){
    const sx=Math.round(n.wx-camX),sy=Math.round(n.wy-camY)
    const isTree=n.type==="tree",DW=isTree?TREE_DW:BUSH_DW,DH=isTree?TREE_DH:BUSH_DH
    if(sx+DW/2<0||sx-DW/2>cw||sy<-DH||sy>ch+DH) continue
    const imgKey=isTree?(n.hasFruit?"treeApples":"treeNoApples"):(n.hasFruit?"bushBerry":"bushNoBerry")
    const fi=imgs[imgKey]
    if(fi){
      const nw=fi.naturalWidth||DW,nh=fi.naturalHeight||DH
      const scale=Math.min(DW/nw,DH/nh),dw=Math.round(nw*scale),dh=Math.round(nh*scale)
      ctx.drawImage(fi,Math.round(sx-dw/2),Math.round(sy-dh),dw,dh)
    }else{
      ctx.fillStyle=isTree?"#5a9e42":"#4a8e38"
      ctx.beginPath();ctx.ellipse(sx,sy-(isTree?24:10),isTree?22:16,isTree?22:10,0,0,Math.PI*2);ctx.fill()
    }
  }
}

// ─── Bridge detection ─────────────────────────────────────────────────────────
function isBridge(r:number,c:number):boolean{
  return[[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc])=>{
    const nr=r+dr,nc=c+dc
    if(nr<0||nr>=MAP_H||nc<0||nc>=MAP_W) return false
    return MAP[nr][nc]===WATER
  })
}

// ─── Tile drawing helpers ─────────────────────────────────────────────────────
function blit(ctx:CanvasRenderingContext2D,img:HTMLImageElement,sx:number,sy:number){ctx.drawImage(img,sx,sy,TS,TS)}
function fbGrass(ctx:CanvasRenderingContext2D,sx:number,sy:number,r:number,c:number){const v=((r*17+c*31)%5)*6;ctx.fillStyle=`rgb(${72+v},${140+v},${48+v})`;ctx.fillRect(sx,sy,TS,TS)}
function fbWater(ctx:CanvasRenderingContext2D,sx:number,sy:number){ctx.fillStyle="#1565a8";ctx.fillRect(sx,sy,TS,TS)}
function fbPath(ctx:CanvasRenderingContext2D,sx:number,sy:number){ctx.fillStyle="#c9a96e";ctx.fillRect(sx,sy,TS,TS);ctx.fillStyle="#b99558";ctx.fillRect(sx+1,sy+1,TS-2,TS-2)}
function drawBridgeOverlay(ctx:CanvasRenderingContext2D,sx:number,sy:number,r:number,c:number){
  const hasH=(c>0&&MAP[r][c-1]===PATH)||(c<MAP_W-1&&MAP[r][c+1]===PATH)
  const hasDiagH=(r>0&&c>0&&MAP[r-1][c-1]===PATH)||(r>0&&c<MAP_W-1&&MAP[r-1][c+1]===PATH)||(r<MAP_H-1&&c>0&&MAP[r+1][c-1]===PATH)||(r<MAP_H-1&&c<MAP_W-1&&MAP[r+1][c+1]===PATH)
  const hBridge=hasH||hasDiagH
  ctx.fillStyle="#9a6f3a"
  if(hBridge){ctx.fillRect(sx,sy+4,TS,TS-8);ctx.fillStyle="#7d5828";for(let i=0;i<3;i++)ctx.fillRect(sx+i*(TS/3),sy+4,TS/3-1,TS-8);ctx.strokeStyle="#5c3d12";ctx.lineWidth=1;ctx.strokeRect(sx,sy+4,TS,TS-8)}
  else{ctx.fillRect(sx+4,sy,TS-8,TS);ctx.fillStyle="#7d5828";for(let i=0;i<3;i++)ctx.fillRect(sx+4,sy+i*(TS/3),TS-8,TS/3-1);ctx.strokeStyle="#5c3d12";ctx.lineWidth=1;ctx.strokeRect(sx+4,sy,TS-8,TS)}
}

// ─── Building renderer ────────────────────────────────────────────────────────
function drawBuildings(ctx:CanvasRenderingContext2D,camX:number,camY:number,cw:number,ch:number,imgs:ImgMap){
  for(const b of BUILDING_DEFS){
    const bx=b.c1*TS-camX,by=b.r1*TS-camY,bw=(b.c2-b.c1+1)*TS,bh=(b.r2-b.r1+1)*TS
    if(bx+bw<0||bx>cw||by+bh<0||by>ch) continue
    const svgImg=imgs[b.svg]
    if(svgImg){
      const iw=svgImg.naturalWidth||bw,ih=svgImg.naturalHeight||bh
      const scale=Math.min(bw/iw,bh/ih),dw=iw*scale,dh=ih*scale
      const ix=bx+(bw-dw)/2,iy=by+bh-dh
      ctx.save();ctx.beginPath();ctx.rect(bx,by,bw,bh);ctx.clip();ctx.drawImage(svgImg,ix,iy,dw,dh);ctx.restore()
    }
  }
}


// ─── Minimap ──────────────────────────────────────────────────────────────────
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

// ─── Display state (drives HTML UI overlay) ───────────────────────────────────
interface DisplayState{
  sustenance:number;coins:number;berries:number
  gameStage:number;housePicked:number;houseMenuOpen:number
  showDialog:boolean;dialogText:string;dialogIsLast:boolean
  nightAlpha:number
  showTimecard:boolean;timecardTitle:string;timecardSubtitle:string;timecardAlpha:number
  showSleepWarning:boolean
  taskText:string
  nearHouseIdx:number
  notifText:string;notifAlpha:number
  nearFoliageHasFruit:boolean
}

// ─── Main component ───────────────────────────────────────────────────────────
type Props={initialCoins:number}
export function GameMapBudget({initialCoins}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const labelsContainerRef=useRef<HTMLDivElement>(null)
  const router=useRouter()
  const completeRef=useRef<(()=>void)|null>(null)
  const [lessonDone,setLessonDone]=useState(false)
  const [pickedIdx,setPickedIdx]=useState(-1)
  const [display,setDisplay]=useState<DisplayState>({
    sustenance:SUSTENANCE_MAX,coins:initialCoins,berries:0,
    gameStage:STAGE_DAY,housePicked:-1,houseMenuOpen:-1,
    showDialog:false,dialogText:"",dialogIsLast:false,
    nightAlpha:0,
    showTimecard:false,timecardTitle:"",timecardSubtitle:"",timecardAlpha:0,
    showSleepWarning:false,
    taskText:TASK_LABELS[0],
    nearHouseIdx:-1,
    notifText:"",notifAlpha:0,
    nearFoliageHasFruit:false,
  })

  const stateRef=useRef({
    px:38*TS,py:22*TS,
    keys:new Set<string>(),
    frame:0,raf:0,
    imgs:null as ImgMap|null,
    npcs:initNpcs(),
    bloo:initBloo(),
    foliage:initFoliage(),
    sustenance:SUSTENANCE_MAX as number,
    coins:initialCoins as number,
    inventory:freshInventory(),
    gameStage:STAGE_DAY as number,
    stageTimer:DAY_DURATION as number,
    dialogIdx:0 as number,
    nightAlpha:0 as number,
    houseMenuOpen:-1 as number,
    housePicked:-1 as number,
    notifText:"" as string,
    notifTimer:0 as number,
    harvestCooldown:0 as number,
    completionCalled:false as boolean,
  })

  useEffect(()=>{
    completeRef.current=()=>{
      saveGameLesson("budgetLesson1Completed").catch(()=>{})
      setPickedIdx(stateRef.current.housePicked)
      setLessonDone(true)
    }
  },[])

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas) return
    const ctx=canvas.getContext("2d")
    if(!ctx) return
    ctx.imageSmoothingEnabled=false

    const dpr=window.devicePixelRatio||1
    const resize=()=>{canvas.width=canvas.offsetWidth*dpr;canvas.height=canvas.offsetHeight*dpr;ctx.scale(dpr,dpr);ctx.imageSmoothingEnabled=false}
    resize()
    const ro=new ResizeObserver(resize);ro.observe(canvas)

    const onDown=(e:KeyboardEvent)=>{
      stateRef.current.keys.add(e.key)
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault()
    }
    const onUp=(e:KeyboardEvent)=>stateRef.current.keys.delete(e.key)
    window.addEventListener("keydown",onDown)
    window.addEventListener("keyup",onUp)

    ctx.fillStyle="#1a3a2a";ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight)
    ctx.fillStyle="white";ctx.font="bold 18px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle"
    ctx.fillText("Loading map…",canvas.offsetWidth/2,canvas.offsetHeight/2)

    loadImages().then(imgs=>{
      stateRef.current.imgs=imgs
      computeBuildingBounds(imgs)

      const loop=()=>{
        const s=stateRef.current
        s.frame++
        const {keys}=s
        _bridgesOpen=true

        // ── Stage timer / transition logic ─────────────────────────────────
        if(s.gameStage===STAGE_DAY){
          if(s.stageTimer>0){s.stageTimer--}
          else{
            s.gameStage=STAGE_NIGHT_FALL
            s.stageTimer=NIGHT_FADE_DUR
            for(const n of s.npcs) n.goingHome=true
          }
        } else if(s.gameStage===STAGE_NIGHT_FALL){
          s.nightAlpha=Math.min(0.78,s.nightAlpha+0.78/NIGHT_FADE_DUR)
          if(s.stageTimer>0){s.stageTimer--}
          else{s.gameStage=STAGE_TIMECARD_1;s.stageTimer=TIMECARD_DUR}
        } else if(s.gameStage===STAGE_TIMECARD_1){
          if(s.stageTimer>0){s.stageTimer--}
          else{s.gameStage=STAGE_SLEEP_DRAIN}
        } else if(s.gameStage===STAGE_SLEEP_DRAIN){
          s.sustenance=Math.max(SUSTENANCE_SLEEP_FLOOR,s.sustenance-SLEEP_DRAIN)
          if(s.sustenance<=SUSTENANCE_SLEEP_FLOOR){
            s.gameStage=STAGE_TIMECARD_2
            s.stageTimer=TIMECARD_DUR
          }
        } else if(s.gameStage===STAGE_TIMECARD_2){
          if(s.stageTimer>0){s.stageTimer--}
          else{
            s.gameStage=STAGE_MORNING
            s.nightAlpha=0
            s.dialogIdx=0
            s.bloo.x=29*TS;s.bloo.y=21*TS
            s.bloo.tx=s.px;s.bloo.ty=s.py
          }
        }

        // ── Sustenance drain (day/morning/house-pick stages) ──────────────
        const isActivePlaying=s.gameStage===STAGE_DAY||s.gameStage===STAGE_MORNING||s.gameStage===STAGE_HOUSE_PICK||s.gameStage===STAGE_CONFIRM
        if(isActivePlaying) s.sustenance=Math.max(0,s.sustenance-SUSTENANCE_DRAIN)

        // ── Foliage regen + find nearest harvestable node ─────────────────
        let nearFoliageIdx=-1,nearFoliageDist=Infinity
        for(let fi=0;fi<s.foliage.length;fi++){
          const fn=s.foliage[fi]
          if(!fn.hasFruit&&fn.regenTimer>0){fn.regenTimer--;if(fn.regenTimer===0)fn.hasFruit=true}
          const d=Math.hypot(s.px-fn.wx,s.py-fn.wy)
          if(d<FOLIAGE_RANGE&&d<nearFoliageDist&&fn.hasFruit){nearFoliageDist=d;nearFoliageIdx=fi}
        }
        if(s.harvestCooldown>0) s.harvestCooldown--

        // ── Bloo + NPC update ──────────────────────────────────────────────
        const isCinematic=s.gameStage===STAGE_TIMECARD_1||s.gameStage===STAGE_TIMECARD_2||s.gameStage===STAGE_SLEEP_DRAIN
        const nightMode=s.gameStage>=STAGE_NIGHT_FALL
        if(!isCinematic){
          updateBloo(s.bloo,s.gameStage,s.px,s.py)
          updateNpcs(s.npcs,nightMode)
        }

        // ── Z / X key interactions ─────────────────────────────────────────
        const eDown=keys.has("z")||keys.has("Z")
        let eUsed=false
        const consumeE=()=>{eUsed=true;keys.delete("z");keys.delete("Z")}

        if(s.houseMenuOpen>=0&&(keys.has("x")||keys.has("X"))){
          s.houseMenuOpen=-1;keys.delete("x");keys.delete("X")
        }

        if(eDown&&!eUsed&&s.houseMenuOpen>=0){
          const h=HOUSE_DEFS[s.houseMenuOpen]
          if(s.coins>=h.downPayment){
            s.coins-=h.downPayment
            s.housePicked=s.houseMenuOpen
            s.houseMenuOpen=-1
            s.gameStage=STAGE_CONFIRM
            s.dialogIdx=0
            s.notifText=`You moved into the ${h.name}! Down payment: ${h.downPayment} coins.`
            s.notifTimer=280
          }
          consumeE()
        }

        const blooDist=Math.hypot(s.px-s.bloo.x,s.py-s.bloo.y)
        const nearBloo=blooDist<TS*2.5

        if(eDown&&!eUsed&&nearBloo&&(s.gameStage===STAGE_MORNING||s.gameStage===STAGE_CONFIRM)){
          const lines=s.gameStage===STAGE_MORNING?BLOO_MORNING:BLOO_CONFIRM
          s.dialogIdx++
          if(s.dialogIdx>=lines.length){
            if(s.gameStage===STAGE_MORNING){s.gameStage=STAGE_HOUSE_PICK;s.dialogIdx=0}
            else{s.gameStage=STAGE_COMPLETE;if(!s.completionCalled){s.completionCalled=true;completeRef.current?.()}}
          }
          consumeE()
        }

        if(eDown&&!eUsed&&s.gameStage===STAGE_HOUSE_PICK&&s.houseMenuOpen<0){
          for(let i=0;i<HOUSE_DEFS.length;i++){
            const h=HOUSE_DEFS[i]
            if(Math.hypot(s.px-h.entranceX,s.py-h.entranceY)<HOUSE_INTERACT_DIST){
              s.houseMenuOpen=i;consumeE();break
            }
          }
        }

        // ── [Z] near foliage → harvest berries into inventory ────────────
        if(eDown&&!eUsed&&nearFoliageIdx>=0&&s.harvestCooldown===0&&isActivePlaying&&s.houseMenuOpen<0){
          s.inventory.berries+=HARVEST_BERRIES
          s.foliage[nearFoliageIdx].hasFruit=false
          s.foliage[nearFoliageIdx].regenTimer=FOLIAGE_REGEN
          s.harvestCooldown=HARVEST_COOLDOWN
          consumeE()
        }

        // ── [X] eat berry from inventory ──────────────────────────────────
        if((keys.has("x")||keys.has("X"))&&s.houseMenuOpen<0&&s.inventory.berries>0&&isActivePlaying){
          s.inventory.berries--
          s.sustenance=Math.min(SUSTENANCE_MAX,s.sustenance+BERRY_SUSTENANCE)
          keys.delete("x");keys.delete("X")
        }

        // ── Movement (speed slows when low energy) ───────────────────────
        const blooDialogue=nearBloo&&(s.gameStage===STAGE_MORNING||s.gameStage===STAGE_CONFIRM)
        const frozen=isCinematic||blooDialogue||s.houseMenuOpen>=0
        if(!frozen&&s.gameStage<STAGE_COMPLETE){
          const speedMult=sustenanceSpeedMult(s.sustenance)
          let dx=0,dy=0
          if(keys.has("ArrowLeft")||keys.has("a")||keys.has("A")) dx-=SPEED*speedMult
          if(keys.has("ArrowRight")||keys.has("d")||keys.has("D")) dx+=SPEED*speedMult
          if(keys.has("ArrowUp")||keys.has("w")||keys.has("W")) dy-=SPEED*speedMult
          if(keys.has("ArrowDown")||keys.has("s")||keys.has("S")) dy+=SPEED*speedMult
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

        if(s.notifTimer>0) s.notifTimer--

        // ── Canvas render (world only) ─────────────────────────────────────
        const cw=canvas.offsetWidth,ch=canvas.offsetHeight
        const camX=Math.max(0,Math.min(s.px-cw/2,MAP_W*TS-cw))
        const camY=Math.max(0,Math.min(s.py-ch/2,MAP_H*TS-ch))
        ctx.clearRect(0,0,cw,ch)

        // Tiles
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
              if(isBridge(r,c)){const wimg=waterImg(imgs,s.frame,r,c);wimg?blit(ctx,wimg,sx,sy):fbWater(ctx,sx,sy);drawBridgeOverlay(ctx,sx,sy,r,c)}
              else{const img=pathImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbPath(ctx,sx,sy)}
            }
            else if(t>=B_INCOME){const img=grassImg(imgs,r,c);img?blit(ctx,img,sx,sy):fbGrass(ctx,sx,sy,r,c)}
          }
        }

        // World objects
        drawNpcs(ctx,s.npcs,camX,camY)
        drawBloo(ctx,s.bloo,camX,camY,nearBloo)
        const fBehind=s.foliage.filter(n=>n.wy<s.py)
        const fFront=s.foliage.filter(n=>n.wy>=s.py)
        drawFoliage(ctx,fBehind,camX,camY,cw,ch,imgs)
        drawSharedPlayer(ctx,s.px-camX,s.py-camY)
        drawFoliage(ctx,fFront,camX,camY,cw,ch,imgs)
        drawBuildings(ctx,camX,camY,cw,ch,imgs)
        drawMinimap(ctx,s.px,s.py,cw)
        if(imgs) drawInventoryPanel(ctx,s.inventory,8,90,imgs)

        // ── Compute display values for HTML overlay ────────────────────────
        const showDialog=nearBloo&&(s.gameStage===STAGE_MORNING||s.gameStage===STAGE_CONFIRM)
        const dialogLines=s.gameStage===STAGE_MORNING?BLOO_MORNING:BLOO_CONFIRM
        let nearHouseIdx=-1
        if(s.gameStage===STAGE_HOUSE_PICK&&s.houseMenuOpen<0){
          for(let i=0;i<HOUSE_DEFS.length;i++){
            if(Math.hypot(s.px-HOUSE_DEFS[i].entranceX,s.py-HOUSE_DEFS[i].entranceY)<HOUSE_INTERACT_DIST){nearHouseIdx=i;break}
          }
        }
        let timecardAlpha=0
        if(s.gameStage===STAGE_TIMECARD_1||s.gameStage===STAGE_TIMECARD_2){
          const elapsed=TIMECARD_DUR-s.stageTimer
          timecardAlpha=Math.min(1,elapsed/30)*Math.min(1,s.stageTimer/30)
        }
        // ── Direct DOM label update (no React lag) ─────────────────────────
        const lc=labelsContainerRef.current
        if(lc){
          if(s.gameStage>=STAGE_HOUSE_PICK){
            lc.style.display="block"
            const children=lc.children
            for(let i=0;i<HOUSE_DEFS.length&&i<children.length;i++){
              const h=HOUSE_DEFS[i]
              const el=children[i] as HTMLElement
              el.style.left=`${h.labelCenterX-camX}px`
              el.style.top=`${h.labelTopY-camY-28}px`
              const pill=el.firstElementChild as HTMLElement
              if(pill){
                const isOwned=s.housePicked===i
                pill.style.background=isOwned?"#16a34a":h.color
                pill.textContent=isOwned?`🏠 ${h.name} (YOUR HOME)`:h.name
              }
            }
          }else{
            lc.style.display="none"
          }
        }

        setDisplay({
          sustenance:s.sustenance,coins:s.coins,berries:s.inventory.berries,
          gameStage:s.gameStage,housePicked:s.housePicked,houseMenuOpen:s.houseMenuOpen,
          showDialog,
          dialogText:showDialog?dialogLines[Math.min(s.dialogIdx,dialogLines.length-1)]:"",
          dialogIsLast:showDialog&&s.dialogIdx>=dialogLines.length-1,
          nightAlpha:s.nightAlpha,
          showTimecard:s.gameStage===STAGE_TIMECARD_1||s.gameStage===STAGE_TIMECARD_2,
          timecardTitle:s.gameStage===STAGE_TIMECARD_1?"🌙  Night Falls":"☀️  Morning",
          timecardSubtitle:s.gameStage===STAGE_TIMECARD_1?"The island grows quiet...":"You survived — barely.",
          timecardAlpha,
          showSleepWarning:s.gameStage===STAGE_SLEEP_DRAIN,
          taskText:s.gameStage!==STAGE_TIMECARD_1&&s.gameStage!==STAGE_TIMECARD_2
            ?TASK_LABELS[Math.min(s.gameStage,STAGE_COMPLETE)]:"",
          nearHouseIdx,
          notifText:s.notifText,
          notifAlpha:Math.min(1,s.notifTimer/40),
          nearFoliageHasFruit:nearFoliageIdx>=0&&s.harvestCooldown===0&&isActivePlaying&&s.houseMenuOpen<0,
        })

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
  },[])

  if(lessonDone){
    const h=pickedIdx>=0?HOUSE_DEFS[pickedIdx]:null
    return(
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6 text-center px-8">
          <div className="text-6xl">🏠</div>
          <h1 className="text-3xl font-bold text-gray-800">Budget Lesson 1 Complete!</h1>
          {h&&(
            <>
              <p className="text-gray-500 text-base max-w-sm">
                You moved into the <strong>{h.name}</strong>.
              </p>
              <div className="flex gap-4 flex-wrap justify-center">
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-6 py-3 text-lg font-semibold text-amber-700">
                  💰 Down payment: {h.downPayment} coins
                </div>
                <div className="bg-red-50 border border-red-300 rounded-xl px-6 py-3 text-lg font-semibold text-red-700">
                  📅 {h.dailyRate} coins / day
                </div>
                {h.storageSlots>0&&(
                  <div className="bg-blue-50 border border-blue-300 rounded-xl px-6 py-3 text-lg font-semibold text-blue-700">
                    📦 {h.storageSlots} storage slots
                  </div>
                )}
              </div>
            </>
          )}
          <p className="text-gray-400 text-sm max-w-xs">
            Housing is a fixed cost — it comes out of your budget every single day. Always plan for it first!
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

  const isNightUi=display.gameStage>=STAGE_NIGHT_FALL&&display.gameStage<=STAGE_SLEEP_DRAIN
  const energyPct=display.sustenance/SUSTENANCE_MAX
  const barColor=isNightUi?"#f87171":energyPct>0.5?"#4ade80":energyPct>0.25?"#facc15":energyPct>0.1?"#fb923c":"#f87171"

  return(
    <div className="relative w-full h-full">
      {/* Canvas — world rendering only */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 w-full h-full outline-none block"
        style={{imageRendering:"auto"}}
      />

      {/* Night overlay */}
      {display.nightAlpha>0&&(
        <div
          className="absolute inset-0 pointer-events-none"
          style={{background:`rgba(5,10,40,${display.nightAlpha})`}}
        />
      )}

      {/* Time card — full screen cinematic */}
      {display.showTimecard&&(
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{background:"rgba(0,0,5,0.7)",opacity:display.timecardAlpha}}
        >
          <div className="w-3/4 h-px bg-white/50 mb-8"/>
          <div className="text-white text-4xl font-bold" style={{fontFamily:"Georgia,serif"}}>{display.timecardTitle}</div>
          <div className="text-white/60 text-lg mt-3">{display.timecardSubtitle}</div>
          <div className="w-3/4 h-px bg-white/50 mt-8"/>
        </div>
      )}

      {/* House name labels — positions updated directly by game loop via ref (no React lag) */}
      <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none overflow-hidden" style={{display:"none"}}>
        {HOUSE_DEFS.map((h,i)=>(
          <div key={i} className="absolute" style={{transform:"translateX(-50%)"}}>
            <div
              className="px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg whitespace-nowrap"
              style={{background:h.color}}
            >
              {h.name}
            </div>
          </div>
        ))}
      </div>

      {/* UI layer — always above night */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">

        {/* ── Budget top bar: 3 tabs ────────────────────────────────────── */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-2">
          {/* Energy */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-b-4 border-slate-200 w-48 px-3 pt-2 pb-2.5">
            <div className={`text-[11px] font-bold uppercase tracking-wide flex justify-between ${isNightUi?"text-red-600":"text-blue-800"}`}>
              <span>Energy</span>
              {display.gameStage===STAGE_SLEEP_DRAIN&&<span className="text-red-400 font-semibold normal-case">draining</span>}
            </div>
            <div className="mt-1.5 h-2.5 rounded-full bg-black/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-75" style={{width:`${display.sustenance}%`,background:barColor}}/>
            </div>
            <div className={`text-[11px] mt-1 font-semibold ${isNightUi?"text-red-600":"text-slate-500"}`}>{Math.ceil(display.sustenance)}%</div>
          </div>
          {/* Coins */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-b-4 border-slate-200 w-48 px-3 pt-2 pb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Coins</div>
            <div className="text-xl font-bold text-amber-500 mt-1">🪙 {display.coins}</div>
            <div className="text-[11px] text-slate-400">your savings</div>
          </div>
          {/* Housing */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-b-4 border-slate-200 w-48 px-3 pt-2 pb-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Housing</div>
            {display.housePicked>=0?(
              <>
                <div className="text-sm font-bold mt-1" style={{color:HOUSE_DEFS[display.housePicked].color}}>{HOUSE_DEFS[display.housePicked].name}</div>
                <div className="text-[11px] text-slate-500">{HOUSE_DEFS[display.housePicked].dailyRate} coins/day</div>
              </>
            ):display.gameStage>=STAGE_HOUSE_PICK?(
              <>
                <div className="text-sm font-bold text-red-500 mt-1">Choose a home!</div>
                <div className="text-[11px] text-slate-400">Visit each house</div>
              </>
            ):(
              <div className="text-sm text-slate-300 mt-1">—</div>
            )}
          </div>
        </div>

        {/* ── Task sign — top left ──────────────────────────────────────── */}
        {display.taskText&&(
          <div className="absolute top-2 left-2 bg-white rounded-2xl shadow-xl border-2 border-b-4 border-slate-200 px-3 pt-2 pb-2.5 max-w-[220px]">
            <div className="text-[11px] font-bold uppercase tracking-wide text-blue-800">Task</div>
            <div className="text-[12px] font-bold text-slate-700 mt-1 leading-snug">{display.taskText}</div>
          </div>
        )}

        {/* ── Sleep drain warning ───────────────────────────────────────── */}
        {display.showSleepWarning&&(
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse bg-red-950/90 text-red-200 rounded-2xl px-6 py-4 font-bold text-base text-center shadow-2xl border border-red-500/60 max-w-sm">
            😴 No shelter... your energy drains through the night...
          </div>
        )}

        {/* ── Bloo dialogue ─────────────────────────────────────────────── */}
        {display.showDialog&&(
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-b-4 border-blue-300 px-5 py-4">
              <div className="text-base font-bold text-blue-500 mb-1">Bloo</div>
              <div className="h-px bg-blue-100 mb-3"/>
              <div className="text-[17px] text-slate-800 leading-snug">{display.dialogText}</div>
              <div className="text-right text-sm text-slate-400 mt-3">{display.dialogIsLast?"[Z] ok":"[Z] next"}</div>
            </div>
          </div>
        )}

        {/* ── House proximity prompt ────────────────────────────────────── */}
        {display.nearHouseIdx>=0&&display.houseMenuOpen<0&&(
          <div
            className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white rounded-full px-5 py-2 font-bold text-sm shadow-xl border-2 border-b-4 whitespace-nowrap"
            style={{borderColor:HOUSE_DEFS[display.nearHouseIdx].color,color:HOUSE_DEFS[display.nearHouseIdx].color}}
          >
            [Z] View {HOUSE_DEFS[display.nearHouseIdx].name}
          </div>
        )}

        {/* ── Harvest prompt (near fruit) / Eat prompt (has berries) ──────── */}
        {display.nearFoliageHasFruit&&display.nearHouseIdx<0&&!display.showDialog&&(
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white rounded-full px-5 py-2 font-bold text-sm shadow-xl border-2 border-b-4 border-green-400 text-green-600 whitespace-nowrap">
            [Z] Harvest berries (+{HARVEST_BERRIES})&nbsp;&nbsp;[X] Eat (+{BERRY_SUSTENANCE}%)
          </div>
        )}

        {/* ── Notification banner ───────────────────────────────────────── */}
        {display.notifAlpha>0&&(
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-green-950 text-green-300 font-bold text-sm rounded-xl px-5 py-2 shadow-xl border border-green-500/60 whitespace-nowrap"
            style={{opacity:display.notifAlpha}}
          >
            {display.notifText}
          </div>
        )}

      </div>

      {/* ── House menu ───────────────────────────────────────────────────── */}
      {display.houseMenuOpen>=0&&(()=>{
        const h=HOUSE_DEFS[display.houseMenuOpen]
        const canAfford=display.coins>=h.downPayment
        return(
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2" style={{borderColor:h.color}}>
              <div className="px-5 py-3 text-white text-center font-bold text-lg" style={{background:h.color}}>
                {h.name}
              </div>
              <div className="px-5 py-3 text-center text-sm text-slate-500">{h.desc}</div>
              <div className="mx-4 h-px bg-slate-100"/>
              <div className="px-5 py-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">💰 Down Payment</div>
                  <div className="text-xl font-bold text-green-600 mt-1">{h.downPayment} coins</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">📅 Daily Rate</div>
                  <div className="text-xl font-bold text-red-500 mt-1">{h.dailyRate} coins/day</div>
                </div>
              </div>
              <div className="px-5 pb-3 text-center text-sm text-slate-600">
                {h.storageSlots===0?"🔒 No storage slots":h.storageSlots===2?"📦📦 2 storage slots":"📦📦📦📦 4 storage slots"}
              </div>
              <div className="mx-4 h-px bg-slate-100"/>
              <div className="px-5 py-4 flex gap-3">
                <div
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-center border-2 border-b-4 select-none ${canAfford?"text-white":"text-slate-400 border-slate-200 bg-slate-100"}`}
                  style={canAfford?{background:h.color,borderColor:h.border}:{}}
                >
                  {canAfford?`[Z] Move In (−${h.downPayment})`:`Need ${h.downPayment-display.coins} more`}
                </div>
                <div className="flex-1 py-2.5 rounded-xl font-bold text-sm text-center bg-slate-500 text-white border-2 border-b-4 border-slate-600 select-none">
                  [X] Close
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
