// Shared game mechanics for all map lessons.
// Import these in every game-map file so constants and core functions
// stay identical across lessons automatically.

// ─── World / movement ────────────────────────────────────────────────────────
export const SHARED_SPEED    = 3
export const SHARED_PLAYER_R = 10

// ─── Sustenance / energy ─────────────────────────────────────────────────────
export const SUSTENANCE_MAX   = 100
// Full drain in 500 s at 60 fps (1 % per 5 s)
export const SUSTENANCE_DRAIN = SUSTENANCE_MAX / (60 * 500)
export const BERRY_SUSTENANCE = 5   // +5 % per berry eaten

// ─── Berry harvest ───────────────────────────────────────────────────────────
export const HARVEST_BERRIES  = 3   // berries added per [Z] press
export const HARVEST_COOLDOWN = 90  // frames between harvests (~1.5 s)

// ─── Foliage ─────────────────────────────────────────────────────────────────
export const FOLIAGE_REGEN = 20 * 60  // frames until fruit regrows
export const FOLIAGE_RANGE = 32 * 1.4 // interact distance (TS × 1.4)
export const TREE_HIT_R    = 14
export const BUSH_HIT_R    = 10
export const TREE_HIT_OY   = 16
export const BUSH_HIT_OY   = 6

// ─── NPC ─────────────────────────────────────────────────────────────────────
export const NPC_HALF  = 6
export const NPC_SPEED = 0.8

// ─── Types ───────────────────────────────────────────────────────────────────
export type ImgMap = Record<string, HTMLImageElement>
export interface Inventory { berries: number; coins: number }
export function freshInventory(): Inventory { return { berries: 0, coins: 0 } }

// ─── Speed multiplier based on sustenance ────────────────────────────────────
// > 50 % → full speed
// > 25 % → 65 % speed
// > 10 % → 35 % speed (very slow, audible warning colour on bar)
// ≤ 10 % → 15 % (crawl — eat something!)
export function sustenanceSpeedMult(s: number): number {
  if (s > 50) return 1.00
  if (s > 25) return 0.65
  if (s > 10) return 0.35
  return 0.15
}

// ─── Inventory panel (left-side 3-slot column) ───────────────────────────────
// Call after drawing the task sign so it sits below it.
// x=8, y=90 works when the task sign is at y=8 with height 74.
export function drawInventoryPanel(
  ctx: CanvasRenderingContext2D,
  inventory: Inventory,
  x: number,
  y: number,
  imgs: ImgMap,
) {
  const SLOT = 62, GAP = 8, R = 14, ISZ = 30
  const slots = [
    { type: "berry", count: inventory.berries, color: "#16a34a", fallback: "🍒" },
    { type: "coin",  count: inventory.coins,   color: "#d97706", fallback: "🪙" },
    { type: "empty", count: -1,               color: "#e2e8f0", fallback: "" },
  ]
  for (let i = 0; i < slots.length; i++) {
    const sx = x, sy = y + i * (SLOT + GAP), s = slots[i]
    ctx.fillStyle = "#ffffff"
    ctx.beginPath(); ctx.roundRect(sx, sy, SLOT, SLOT, R); ctx.fill()
    ctx.strokeStyle = s.count >= 0 ? s.color : "#e2e8f0"; ctx.lineWidth = 2
    ctx.beginPath(); ctx.roundRect(sx, sy, SLOT, SLOT, R); ctx.stroke()
    if (s.count < 0) continue
    const iconCX = sx + SLOT / 2, iconCY = sy + SLOT / 2 - 10
    if (s.type === "berry" && imgs["berry"]) {
      ctx.drawImage(imgs["berry"], iconCX - ISZ / 2, iconCY - ISZ / 2, ISZ, ISZ)
    } else {
      ctx.font = "22px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText(s.fallback, iconCX, iconCY)
    }
    ctx.font = "bold 14px sans-serif"; ctx.fillStyle = "#1e293b"
    ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.fillText(String(s.count), sx + SLOT / 2, sy + SLOT - 14)
  }
}

// ─── Player sprite ───────────────────────────────────────────────────────────
export function drawSharedPlayer(ctx: CanvasRenderingContext2D, sx: number, sy: number, color = "#ef4444") {
  const S = SHARED_PLAYER_R
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(sx - S + 2, sy + S, S * 2 - 2, 3)
  // body
  ctx.fillStyle = color; ctx.fillRect(sx - S, sy - S, S * 2, S * 2)
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(sx - S + 1, sy - S + 1, S - 1, S - 1)
  // border (slightly darker shade of fill color)
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5
  ctx.strokeRect(sx - S, sy - S, S * 2, S * 2)
  // "you" label above player
  ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.beginPath(); ctx.roundRect(sx - 20, sy - S - 22, 40, 17, 3); ctx.fill()
  ctx.fillStyle = color; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.fillText("You", sx, sy - S - 13)
}

// ─── Dialogue box ────────────────────────────────────────────────────────────
export function drawDialogBox(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  speaker: string, speakerColor: string,
  text: string, isLast: boolean,
) {
  const pw = Math.min(820, cw - 32), ph = 130
  const px = Math.round(cw / 2 - pw / 2), py = ch - ph - 20
  ctx.fillStyle = "#ffffff"
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.fill()
  ctx.strokeStyle = speakerColor; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.stroke()
  ctx.fillStyle = speakerColor; ctx.font = "bold 16px sans-serif"
  ctx.textAlign = "left"; ctx.textBaseline = "middle"
  ctx.fillText(speaker, px + 16, py + 22)
  ctx.strokeStyle = `${speakerColor}44`; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(px + 16, py + 38); ctx.lineTo(px + pw - 16, py + 38); ctx.stroke()
  ctx.fillStyle = "#1e293b"; ctx.font = "17px sans-serif"
  ctx.fillText(text, px + 16, py + 78)
  ctx.fillStyle = "#94a3b8"; ctx.font = "13px sans-serif"; ctx.textAlign = "right"
  ctx.fillText(isLast ? "[Z] ok" : "[Z] next", px + pw - 14, py + ph - 14)
}
