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
export const MUSHROOM_HIT_R  = 8
export const WOOD_HIT_R      = 9
export const MUSHROOM_HIT_OY = 2
export const WOOD_HIT_OY     = 2

// ─── NPC ─────────────────────────────────────────────────────────────────────
export const NPC_HALF  = 6
export const NPC_SPEED = 0.8

// ─── Types ───────────────────────────────────────────────────────────────────
export type ImgMap = Record<string, HTMLImageElement>
export const MAX_INVENTORY_SLOTS = 5
export interface Inventory {
  berries: number
  apples: number
  mushrooms: number
  wood: number
  coins: number
  // Item-type key ("berry", "apple", ...) held in each slot, or null if the
  // slot is open. Index = visual slot position; the player can drag slots
  // around to reorder this freely (see swapInventorySlots).
  slots: (string | null)[]
}
export function freshInventory(): Inventory {
  return { berries: 0, apples: 0, mushrooms: 0, wood: 0, coins: 0, slots: new Array(MAX_INVENTORY_SLOTS).fill(null) }
}
export function inventoryItemCount(inventory: Inventory, type: string): number {
  if (type === "berry") return inventory.berries
  if (type === "apple") return inventory.apples
  if (type === "mushroom") return inventory.mushrooms
  if (type === "wood") return inventory.wood
  return 0
}

// Call whenever an item type's count grows from 0 (a harvest, a gift, a
// pickup). Stacks into the slot the type already occupies, if any;
// otherwise drops into the first empty slot, checked in order (slot 1,
// then 2, ...). Slots whose item has since been fully sold/eaten are
// released back to empty first, so they're eligible again. No-op if every
// slot is genuinely full.
export function claimInventorySlot(inventory: Inventory, type: string) {
  for (let i = 0; i < inventory.slots.length; i++) {
    const t = inventory.slots[i]
    if (t && t !== type && inventoryItemCount(inventory, t) <= 0) inventory.slots[i] = null
  }
  if (inventory.slots.includes(type)) return
  const freeIdx = inventory.slots.indexOf(null)
  if (freeIdx === -1) return
  inventory.slots[freeIdx] = type
}

// Player-driven drag-and-drop reorder: swap whatever is in two slots.
export function swapInventorySlots(inventory: Inventory, i: number, j: number) {
  if (i === j || i < 0 || j < 0 || i >= inventory.slots.length || j >= inventory.slots.length) return
  const tmp = inventory.slots[i]
  inventory.slots[i] = inventory.slots[j]
  inventory.slots[j] = tmp
}

// ─── Speed multiplier based on sustenance ────────────────────────────────────
// > 50 % → full speed
// > 25 % → 65 % speed
// > 10 % → 35 % speed (very slow, audible warning colour on bar)
// ≤ 10 % → 15 % (crawl, eat something!)
export function sustenanceSpeedMult(s: number): number {
  if (s > 50) return 1.00
  if (s > 25) return 0.65
  if (s > 10) return 0.35
  return 0.15
}

// ─── Inventory panel (left-side 5-slot column) ───────────────────────────────
// Call after drawing the task sign so it sits below it.
// x=8, y=90 works when the task sign is at y=8 with height 74.
// Item types land in the first open slot (slot 1, then 2, ...) as they're
// picked up, and the player can drag-and-drop slots to reorder them.
const INVENTORY_ITEM_META: Record<string, { color: string; fallback: string }> = {
  berry: { color: "#e11d48", fallback: "🍓" },
  apple: { color: "#16a34a", fallback: "🍎" },
  mushroom: { color: "#a855f7", fallback: "🍄" },
  wood: { color: "#92400e", fallback: "🪵" },
}
export const INVENTORY_SLOT = 62, INVENTORY_GAP = 8
// Full pixel height of the 5-slot panel, so callers can center it (e.g.
// `y = Math.round(ch / 2 - inventoryPanelHeight() / 2)`).
export function inventoryPanelHeight(): number {
  return MAX_INVENTORY_SLOTS * INVENTORY_SLOT + (MAX_INVENTORY_SLOTS - 1) * INVENTORY_GAP
}
// Hit-test a screen-space point against the panel drawn at (panelX, panelY).
// Returns the slot index under the point, or -1 if outside every slot
// (including the gaps between them). Shared by rendering and pointer input
// so the two always agree on where each slot actually is.
export function inventorySlotIndexAt(px: number, py: number, panelX: number, panelY: number): number {
  if (px < panelX || px > panelX + INVENTORY_SLOT) return -1
  const rel = py - panelY
  if (rel < 0) return -1
  const period = INVENTORY_SLOT + INVENTORY_GAP
  const i = Math.floor(rel / period)
  if (i < 0 || i >= MAX_INVENTORY_SLOTS) return -1
  if (rel - i * period > INVENTORY_SLOT) return -1 // in the gap between slots
  return i
}
export interface InventoryDrag {
  fromIndex: number
  overIndex: number
  pointerX: number
  pointerY: number
}
function drawInventorySlotBox(
  ctx: CanvasRenderingContext2D, sx: number, sy: number,
  type: string | null, count: number, imgs: ImgMap,
  opts: { alpha?: number; highlight?: boolean } = {},
) {
  const SLOT = INVENTORY_SLOT, R = 14, ISZ = 30
  const meta = type ? INVENTORY_ITEM_META[type] : undefined
  const empty = !type || !meta || count <= 0
  ctx.save()
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha
  ctx.fillStyle = "#ffffff"
  ctx.beginPath(); ctx.roundRect(sx, sy, SLOT, SLOT, R); ctx.fill()
  ctx.strokeStyle = opts.highlight ? "#3b82f6" : empty ? "#e2e8f0" : meta!.color
  ctx.lineWidth = opts.highlight ? 3 : 2
  ctx.beginPath(); ctx.roundRect(sx, sy, SLOT, SLOT, R); ctx.stroke()
  if (!empty) {
    const iconCX = sx + SLOT / 2, iconCY = sy + SLOT / 2 - 10
    if (imgs[type!]) {
      ctx.drawImage(imgs[type!], iconCX - ISZ / 2, iconCY - ISZ / 2, ISZ, ISZ)
    } else {
      ctx.font = "22px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText(meta!.fallback, iconCX, iconCY)
    }
    ctx.font = "bold 14px sans-serif"; ctx.fillStyle = "#1e293b"
    ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.fillText(String(count), sx + SLOT / 2, sy + SLOT - 14)
  }
  ctx.restore()
}
export function drawInventoryPanel(
  ctx: CanvasRenderingContext2D,
  inventory: Inventory,
  x: number,
  y: number,
  imgs: ImgMap,
  drag?: InventoryDrag | null,
) {
  const SLOT = INVENTORY_SLOT, GAP = INVENTORY_GAP
  // Coins live in the top bar, not this panel. Only actual carried items go here.
  for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
    const type = inventory.slots[i]
    const count = type ? inventoryItemCount(inventory, type) : 0
    const sx = x, sy = y + i * (SLOT + GAP)
    const isDragSource = drag != null && drag.fromIndex === i
    const isDragTarget = drag != null && drag.overIndex === i && drag.overIndex !== drag.fromIndex
    drawInventorySlotBox(ctx, sx, sy, type, count, imgs, {
      alpha: isDragSource ? 0.35 : 1,
      highlight: isDragTarget,
    })
  }
  // Floating icon following the pointer while dragging.
  if (drag != null) {
    const type = inventory.slots[drag.fromIndex]
    const count = type ? inventoryItemCount(inventory, type) : 0
    if (type && count > 0) {
      drawInventorySlotBox(ctx, drag.pointerX - SLOT / 2, drag.pointerY - SLOT / 2, type, count, imgs, { alpha: 0.9 })
    }
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

// ─── Text wrapping (canvas has no native word-wrap) ──────────────────────────
// Splits text into lines that fit maxWidth under ctx's *current* font. Call
// after setting ctx.font, before measuring/drawing.
export function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let cur = ""
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (cur && ctx.measureText(test).width > maxWidth) {
      lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// ─── Dialogue box ────────────────────────────────────────────────────────────
// Wraps long lines and grows to fit; on very small screens it shrinks font
// and, as a last resort, clips with a "more below" cue rather than ever
// letting text spill outside the box.
export function drawDialogBox(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  speaker: string, speakerColor: string,
  text: string, isLast: boolean,
  revealChars: number = Infinity,
) {
  const small = cw < 520
  const fontSize = small ? 14 : 17
  const lineHeight = fontSize + 7
  const pw = Math.min(820, cw - 24)
  const padX = small ? 12 : 16
  const headerH = 38, hintH = 24, vPad = 14
  const maxPh = ch - 32

  ctx.font = `${fontSize}px sans-serif`
  const lines = wrapCanvasText(ctx, text, pw - padX * 2)
  const wantPh = headerH + lines.length * lineHeight + hintH + vPad
  const ph = Math.max(small ? 96 : 110, Math.min(maxPh, wantPh))
  const px = Math.round(cw / 2 - pw / 2), py = ch - ph - (small ? 10 : 20)

  ctx.fillStyle = "#ffffff"
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.fill()
  ctx.strokeStyle = speakerColor; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.stroke()
  ctx.fillStyle = speakerColor; ctx.font = `bold ${small ? 14 : 16}px sans-serif`
  ctx.textAlign = "left"; ctx.textBaseline = "middle"
  ctx.fillText(speaker, px + padX, py + headerH / 2 + 4)
  ctx.strokeStyle = `${speakerColor}44`; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(px + padX, py + headerH); ctx.lineTo(px + pw - padX, py + headerH); ctx.stroke()

  const textAreaH = ph - headerH - hintH - vPad
  const maxLines = Math.max(1, Math.floor(textAreaH / lineHeight))
  const overflow = lines.length > maxLines
  ctx.save()
  ctx.beginPath(); ctx.rect(px + padX, py + headerH, pw - padX * 2, textAreaH); ctx.clip()
  ctx.fillStyle = "#1e293b"; ctx.font = `${fontSize}px sans-serif`
  ctx.textAlign = "left"; ctx.textBaseline = "top"
  const shown = overflow ? lines.slice(0, maxLines) : lines
  let remaining = revealChars
  for (let i = 0; i < shown.length; i++) {
    const full = shown[i]
    const visible = remaining >= full.length ? full : full.slice(0, Math.max(0, remaining))
    remaining -= full.length + 1 // +1 for the space/line-break consumed between wrapped lines
    ctx.fillText(visible, px + padX, py + headerH + 6 + i * lineHeight)
  }
  ctx.restore()
  const typing = revealChars < text.length
  if (overflow && !typing) {
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px sans-serif"; ctx.textAlign = "center"
    ctx.fillText("▼ more", px + pw / 2, py + headerH + textAreaH - 2)
  }

  ctx.fillStyle = "#94a3b8"; ctx.font = `${small ? 11 : 13}px sans-serif`; ctx.textAlign = "right"
  ctx.fillText(isLast ? "[Z] ok · tap" : "[Z] next · tap", px + pw - padX, py + ph - 12)
}

// ─── Choice dialogue box (in-game decision, distinct from the parchment scroll) ─
// Used for "normal" gameplay decisions, e.g. picking how to fund a farm plot,
// as opposed to the big CYOA stream picker, which stays a StoryScroll.
export interface DialogChoiceOption { icon: string; text: string }

export function drawChoiceDialogBox(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  speaker: string, speakerColor: string,
  prompt: string,
  choices: DialogChoiceOption[],
  selectedIndex: number,
) {
  const small = cw < 520
  const fontSize = small ? 13 : 15
  const padX = small ? 12 : 16
  const pw = Math.min(820, cw - 24)
  const headerH = 52, gap = 8, choicePadY = 10
  const lineHeight = fontSize + 5
  const textMaxW = pw - padX * 2 - 28

  ctx.font = `${fontSize}px sans-serif`
  const choiceLines = choices.map(c => wrapCanvasText(ctx, `${c.icon}  ${c.text}`, textMaxW))
  const choiceHeights = choiceLines.map(lines => Math.max(38, lines.length * lineHeight + choicePadY * 2))
  const ph = headerH + choiceHeights.reduce((a, b) => a + b + gap, 0) + 6
  const px = Math.round(cw / 2 - pw / 2), py = ch - ph - (small ? 10 : 20)

  ctx.fillStyle = "#ffffff"
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.fill()
  ctx.strokeStyle = speakerColor; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.stroke()
  ctx.fillStyle = speakerColor; ctx.font = `bold ${small ? 14 : 16}px sans-serif`
  ctx.textAlign = "left"; ctx.textBaseline = "middle"
  ctx.fillText(speaker, px + padX, py + 22)
  ctx.strokeStyle = `${speakerColor}44`; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(px + padX, py + 38); ctx.lineTo(px + pw - padX, py + 38); ctx.stroke()
  ctx.fillStyle = "#64748b"; ctx.font = `${small ? 12 : 14}px sans-serif`
  ctx.fillText(prompt, px + padX, py + 49)

  let cy = py + headerH
  for (let i = 0; i < choices.length; i++) {
    const selected = i === selectedIndex
    const boxH = choiceHeights[i]
    ctx.fillStyle = selected ? "#eff6ff" : "#f8fafc"
    ctx.beginPath(); ctx.roundRect(px + padX, cy, pw - padX * 2, boxH, 10); ctx.fill()
    ctx.strokeStyle = selected ? "#3b82f6" : "#e2e8f0"; ctx.lineWidth = selected ? 2.5 : 1.5
    ctx.beginPath(); ctx.roundRect(px + padX, cy, pw - padX * 2, boxH, 10); ctx.stroke()
    ctx.fillStyle = "#1e293b"; ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = "left"; ctx.textBaseline = "middle"
    const lines = choiceLines[i]
    const lineBlockH = lines.length * lineHeight
    const firstY = cy + boxH / 2 - lineBlockH / 2 + lineHeight / 2
    for (let j = 0; j < lines.length; j++) {
      const label = j === 0 ? `${i + 1}. ${lines[j]}` : `   ${lines[j]}`
      ctx.fillText(label, px + padX + 14, firstY + j * lineHeight)
    }
    cy += boxH + gap
  }

  ctx.fillStyle = "#94a3b8"; ctx.font = `${small ? 10 : 12}px sans-serif`; ctx.textAlign = "right"
  ctx.fillText(small ? "tap to select · confirm" : "[↑↓] select   [Z] confirm · tap", px + pw - padX, py + ph - 8)
}
