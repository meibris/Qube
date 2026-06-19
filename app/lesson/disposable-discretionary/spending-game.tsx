"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { saveGameLesson, getInitialCoins } from "@/actions/game-lesson"

// ─── Constants ────────────────────────────────────────────────────────────────

const CW = 800
const CH = 480
const SPEED = 3
const PW = 20     // player width
const PH = 28     // player height
const INTERACT_DIST = 58
const SALES_TAX = 0.08

// ─── Types ────────────────────────────────────────────────────────────────────

type Scene   = "VILLAGE" | "STORE" | "COMPLETE"
type Facing  = "up" | "down" | "left" | "right"

interface Player  { x: number; y: number; facing: Facing }
interface Rect    { x: number; y: number; w: number; h: number }

interface StoreItem {
    id: string; name: string; emoji: string; price: number
    sx: number; sy: number  // canvas position in store scene
}

type Dialogue =
    | { kind: "ITEM";     item: StoreItem }
    | { kind: "NO_FUNDS"; item: StoreItem }
    | { kind: "CHECKOUT"; item: StoreItem; tax: number; total: number }

// ─── Store items ──────────────────────────────────────────────────────────────

const ITEMS: StoreItem[] = [
    { id: "apple",    name: "Fresh Apple",     emoji: "🍎", price:  5, sx: 148, sy:  88 },
    { id: "bread",    name: "Bread Loaf",       emoji: "🍞", price:  8, sx: 308, sy:  88 },
    { id: "game",     name: "Used Game",         emoji: "🎮", price: 25, sx: 468, sy:  88 },
    { id: "hat",      name: "Baseball Cap",      emoji: "🧢", price: 18, sx: 148, sy: 208 },
    { id: "flowers",  name: "Flower Bouquet",    emoji: "🌹", price: 12, sx: 308, sy: 208 },
]

// ─── Geometry ─────────────────────────────────────────────────────────────────

// Village: colliders the player cannot walk through
const V_COL: Rect[] = [
    { x: 258, y:   0, w: 164, h: 148 }, // top house
    { x: 258, y: 332, w: 164, h: 148 }, // bottom house
    { x: 612, y: 130, w: 183, h:  80 }, // store upper wall
    { x: 612, y: 265, w: 183, h:  85 }, // store lower wall
    { x: 792, y: 130, w:  10, h: 220 }, // store right edge
]
// Village: entering the store door
const V_DOOR: Rect = { x: 600, y: 209, w: 16, h: 62 }

// Store: colliders
const S_COL: Rect[] = [
    { x:   0, y:   0, w: 800, h:  62 }, // top wall
    { x:   0, y: 418, w: 800, h:  62 }, // bottom wall
    { x:   0, y:   0, w:  42, h: 196 }, // left wall (above exit)
    { x:   0, y: 284, w:  42, h: 196 }, // left wall (below exit)
    { x: 758, y:   0, w:  42, h: 480 }, // right wall
    { x:  55, y:  62, w: 638, h:  46 }, // top shelf
    { x:  55, y: 180, w: 248, h:  46 }, // middle shelf
    { x: 498, y: 268, w: 262, h: 150 }, // checkout counter
]
const S_EXIT:     Rect = { x:   0, y: 196, w:  46, h:  88 }
const S_CHECKOUT: Rect = { x: 486, y: 260, w:  56, h: 158 }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function overlaps(px: number, py: number, r: Rect): boolean {
    return px < r.x + r.w && px + PW > r.x && py < r.y + r.h && py + PH > r.y
}
function dist(ax: number, ay: number, bx: number, by: number) {
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
}
function ri(n: number) { return Math.round(n) }

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function fr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
    ctx.fillStyle = c; ctx.fillRect(ri(x), ri(y), w, h)
}
function txt(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, size = 11, color = "#fff", align: CanvasTextAlign = "center") {
    ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.fillText(t, ri(x), ri(y))
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, held: StoreItem | null) {
    const x = ri(p.x), y = ri(p.y)
    ctx.fillStyle = "rgba(0,0,0,0.18)"
    ctx.beginPath(); ctx.ellipse(x + PW/2, y + PH + 2, 11, 4, 0, 0, Math.PI*2); ctx.fill()
    fr(ctx, x + 1, y + 19, 9,  9, "#1d4ed8") // left leg
    fr(ctx, x + 10, y + 19, 9, 9, "#1d4ed8") // right leg
    fr(ctx, x,     y + 25, 10, 4, "#92400e") // left shoe
    fr(ctx, x + 10, y + 25, 10, 4, "#92400e") // right shoe
    fr(ctx, x - 4, y +  9, 5, 12, "#fde68a") // left arm
    fr(ctx, x + PW - 1, y + 9, 5, 12, "#fde68a") // right arm
    fr(ctx, x,     y +  8, PW, 13, "#3b82f6") // body
    fr(ctx, x + 1, y -  1, PW - 2, 11, "#fde68a") // head
    fr(ctx, x + 1, y -  3, PW - 2, 5, "#92400e")  // hair
    if (p.facing !== "up") {
        ctx.fillStyle = "#1e1b4b"
        ctx.fillRect(x + 4, y + 3, 3, 3); ctx.fillRect(x + 13, y + 3, 3, 3)
    }
    if (held) {
        ctx.font = "18px serif"; ctx.textAlign = "center"
        ctx.fillText(held.emoji, x + PW/2, y - 8)
    }
}

function drawVillage(ctx: CanvasRenderingContext2D, player: Player, held: StoreItem | null) {
    ctx.imageSmoothingEnabled = false
    // Grass
    fr(ctx, 0, 0, CW, CH, "#5a9e50")
    for (let ty = 0; ty < CH; ty += 16)
        for (let tx = 0; tx < CW; tx += 16) {
            const n = ((tx / 16) * 7 + (ty / 16) * 13) % 17
            if (n < 4) fr(ctx, tx, ty, 16, 16, "#4e8f45")
            else if (n < 6) fr(ctx, tx + 4, ty + 4, 8, 8, "#63ae58")
        }

    // Paths
    const D = "#c8a870", DE = "#a88650"
    fr(ctx, 0, 209, 612, 52, D); fr(ctx, 0, 209, 612, 3, DE); fr(ctx, 0, 258, 612, 3, DE)
    for (let px = 28; px < 580; px += 46) {
        ctx.fillStyle = "#b89860"; ctx.fillRect(px, 222, 14, 6); ctx.fillRect(px + 23, 238, 10, 5)
    }
    fr(ctx, 340, 0, 50, 212, D); fr(ctx, 340, 0, 3, 212, DE); fr(ctx, 387, 0, 3, 212, DE)
    fr(ctx, 340, 261, 50, CH, D); fr(ctx, 340, 261, 3, CH, DE); fr(ctx, 387, 261, 3, CH, DE)

    // Top house
    drawHouse(ctx, 258, 8, 164, 140, "#d4856a", "#a0522d")
    // Bottom house
    drawHouse(ctx, 258, 332, 164, 148, "#7ab87a", "#4a7a3c")
    // Shop
    drawShopExterior(ctx)
    drawPlayer(ctx, player, held)
}

function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wall: string, roof: string) {
    fr(ctx, x, y, w, h, wall)
    fr(ctx, x - 10, y - 14, w + 20, 20, roof)
    fr(ctx, x + w - 38, y - 30, 18, 20, roof)
    fr(ctx, x + w - 40, y - 34, 22, 8, "#555")
    // windows
    const wy = y + 22
    for (const wx of [x + 16, x + w - 54]) {
        fr(ctx, wx, wy, 38, 32, "#bde0f0")
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(wx, wy, 38, 32)
        ctx.beginPath()
        ctx.moveTo(wx + 19, wy); ctx.lineTo(wx + 19, wy + 32)
        ctx.moveTo(wx, wy + 16); ctx.lineTo(wx + 38, wy + 16)
        ctx.stroke()
    }
    // door toward center path
    const dx = x + w / 2 - 16
    const dy = y + h - 46
    fr(ctx, dx, dy, 32, 46, "#8b5e38"); fr(ctx, dx + 3, dy + 3, 26, 40, "#7a4c28")
    ctx.fillStyle = "#f0c040"; ctx.beginPath(); ctx.arc(dx + 24, dy + 24, 3, 0, Math.PI * 2); ctx.fill()
}

function drawShopExterior(ctx: CanvasRenderingContext2D) {
    const [sx, sy, sw, sh] = [612, 130, 183, 220]
    fr(ctx, sx, sy, sw, sh, "#f5e0b0")
    // Roof shingles
    for (let rx = sx - 10; rx < sx + sw + 10; rx += 20)
        fr(ctx, rx, sy - 16, 18, 22, rx % 40 === 0 ? "#c07840" : "#b06830")
    fr(ctx, sx - 10, sy - 16, sw + 20, 4, "#906020")
    // Sign
    fr(ctx, sx + 26, sy - 36, 130, 24, "#f0c040")
    ctx.strokeStyle = "#c8a020"; ctx.lineWidth = 2; ctx.strokeRect(sx + 26, sy - 36, 130, 24)
    txt(ctx, "🛒  SHOP", sx + sw / 2, sy - 18, 13, "#7a4a10")
    // Windows
    for (const wx of [sx + 14, sx + sw - 58]) {
        fr(ctx, wx, sy + 20, 44, 40, "#bde0f0")
        ctx.strokeStyle = "#8ab0c0"; ctx.lineWidth = 2; ctx.strokeRect(wx, sy + 20, 44, 40)
    }
    // Door opening (left edge, aligned with horizontal path)
    fr(ctx, sx, sy + 79, 38, 74, "#c8a870")
    fr(ctx, sx + 2, sy + 81, 34, 70, "#b89860")
    txt(ctx, "→", sx - 18, sy + 120, 16, "#f0c040")
}

function drawStore(
    ctx: CanvasRenderingContext2D,
    player: Player,
    items: StoreItem[],
    held: StoreItem | null,
    nearItem: StoreItem | null,
    nearCheckout: boolean,
) {
    ctx.imageSmoothingEnabled = false
    // Floor planks
    fr(ctx, 0, 0, CW, CH, "#d4a96a")
    for (let fy = 62; fy < 418; fy += 24)
        fr(ctx, 42, fy, 716, 22, fy % 48 === 0 ? "#c89858" : "#d4a96a")
    for (let fy = 62; fy < 418; fy += 24) {
        ctx.strokeStyle = "#b88848"; ctx.lineWidth = 1; ctx.strokeRect(42, fy, 716, 22)
    }
    // Walls
    fr(ctx, 0, 0, CW, 62, "#7a5030")
    fr(ctx, 0, 418, CW, 62, "#7a5030")
    fr(ctx, 0, 0, 42, CH, "#6a4020")
    fr(ctx, 758, 0, 42, CH, "#6a4020")
    for (let wx = 0; wx < CW; wx += 32) {
        ctx.strokeStyle = "#5a3010"; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, 62); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(wx, 418); ctx.lineTo(wx, 480); ctx.stroke()
    }
    // Exit door
    fr(ctx, 0, 196, 42, 88, "#c8a870")
    fr(ctx, 2, 198, 38, 84, "#b89860")
    txt(ctx, "← EXIT", 22, 248, 9, "#7a4a10")

    // Top shelf
    fr(ctx, 55, 62, 638, 46, "#6a4020")
    fr(ctx, 55, 62, 638, 6, "#8b5530")
    fr(ctx, 55, 102, 638, 6, "#5a3010")
    for (let bx = 100; bx < 680; bx += 155) { fr(ctx, bx, 62, 8, 46, "#5a3010") }

    // Middle-left shelf
    fr(ctx, 55, 180, 248, 46, "#6a4020")
    fr(ctx, 55, 180, 248, 6, "#8b5530")
    fr(ctx, 55, 220, 248, 5, "#5a3010")
    fr(ctx, 100, 180, 8, 46, "#5a3010"); fr(ctx, 250, 180, 8, 46, "#5a3010")

    // Items
    for (const item of items) {
        if (held?.id === item.id) continue
        const isNear = nearItem?.id === item.id && !held
        if (isNear) {
            ctx.save(); ctx.shadowColor = "#ffe060"; ctx.shadowBlur = 20
            ctx.fillStyle = "rgba(255,230,80,0.18)"
            ctx.beginPath(); ctx.ellipse(item.sx, item.sy - 6, 28, 28, 0, 0, Math.PI * 2); ctx.fill()
            ctx.restore()
        }
        ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.fillText(item.emoji, ri(item.sx), ri(item.sy))
        fr(ctx, item.sx - 22, item.sy + 4, 44, 16, "#fff9e6")
        ctx.strokeStyle = "#c8a020"; ctx.lineWidth = 1; ctx.strokeRect(item.sx - 22, item.sy + 4, 44, 16)
        txt(ctx, `🪙 ${item.price}`, item.sx, item.sy + 15, 9, "#7a4a10")
    }

    // Checkout counter
    fr(ctx, 498, 268, 262, 150, nearCheckout ? "#e8b830" : "#6a4020")
    fr(ctx, 498, 256, 262, 18, "#c8a050")
    ctx.strokeStyle = "#a08030"; ctx.lineWidth = 2; ctx.strokeRect(498, 256, 262, 18)
    // Counter decoration
    fr(ctx, 718, 266, 36, 28, "#333"); fr(ctx, 720, 268, 32, 22, "#22c55e")
    txt(ctx, "$", 736, 283, 12)
    // Cashier
    drawCashier(ctx, 648, 222)

    // SPACE prompt above near item
    if (nearItem && !held) drawSpacePrompt(ctx, nearItem.sx, nearItem.sy - 34)

    drawPlayer(ctx, player, held)
}

function drawCashier(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "rgba(0,0,0,0.15)"
    ctx.beginPath(); ctx.ellipse(x, y + 30, 12, 5, 0, 0, Math.PI * 2); ctx.fill()
    fr(ctx, x - 12, y + 4, 24, 22, "#22c55e")
    fr(ctx, x - 9, y - 14, 18, 18, "#fde68a")
    fr(ctx, x - 9, y - 16, 18, 6, "#b45309")
    ctx.fillStyle = "#1e1b4b"; ctx.fillRect(x - 5, y - 9, 3, 3); ctx.fillRect(x + 2, y - 9, 3, 3)
    ctx.strokeStyle = "#7c3f00"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(x, y - 3, 5, 0.2, Math.PI - 0.2); ctx.stroke()
    fr(ctx, x - 8, y + 7, 16, 10, "#fff")
    txt(ctx, "CASH", x, y + 15, 7, "#333")
}

function drawSpacePrompt(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const w = 82, h = 20
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(ri(x - w/2), ri(y - h), w, h)
    ctx.strokeStyle = "#ffe060"; ctx.lineWidth = 1.5; ctx.strokeRect(ri(x - w/2), ri(y - h), w, h)
    txt(ctx, "[ SPACE ]", x, y - 5, 10, "#ffe060")
}

// ─── Main game component ──────────────────────────────────────────────────────

export function SpendingGame() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // React state — drives re-renders for UI overlays only
    const [scene, setScene]             = useState<Scene>("VILLAGE")
    const [coins, setCoins]             = useState(0)
    const [coinsReady, setCoinsReady]   = useState(false)
    const [dialogue, setDialogue]       = useState<Dialogue | null>(null)
    const [heldItem, setHeldItem]       = useState<StoreItem | null>(null)
    const [nearItem, setNearItem]       = useState<StoreItem | null>(null)
    const [nearCheckout, setNearCheckout] = useState(false)
    const [storeItems, setStoreItems]   = useState<StoreItem[]>(ITEMS)
    const [purchased, setPurchased]     = useState<StoreItem | null>(null)
    const [xpGained, setXpGained]       = useState(0)
    const [saving, setSaving]           = useState(false)

    // Mutable refs for game loop (avoid stale closures)
    const playerRef      = useRef<Player>({ x: 80, y: 228, facing: "right" })
    const keysRef        = useRef(new Set<string>())
    const sceneRef       = useRef<Scene>("VILLAGE")
    const dialogueRef    = useRef<Dialogue | null>(null)
    const heldRef        = useRef<StoreItem | null>(null)
    const nearItemRef    = useRef<StoreItem | null>(null)
    const nearCoRef      = useRef(false)
    const storeItemsRef  = useRef<StoreItem[]>(ITEMS)
    const coinsRef       = useRef(0)

    // Fetch initial coin balance once on mount
    useEffect(() => {
        getInitialCoins().then(c => {
            coinsRef.current = c
            setCoins(c)
            setCoinsReady(true)
        })
    }, [])

    // Keep refs in sync with state
    useEffect(() => { sceneRef.current    = scene    }, [scene])
    useEffect(() => { dialogueRef.current = dialogue }, [dialogue])
    useEffect(() => { heldRef.current     = heldItem }, [heldItem])
    useEffect(() => { storeItemsRef.current = storeItems }, [storeItems])

    // ── Auto-trigger checkout when player steps up with an item ──────────────
    useEffect(() => {
        if (!nearCheckout || !heldItem || dialogue) return
        const tax   = heldItem.price * SALES_TAX
        const total = heldItem.price + tax
        const d: Dialogue = coinsRef.current >= total
            ? { kind: "CHECKOUT", item: heldItem, tax, total }
            : { kind: "NO_FUNDS", item: heldItem }
        setDialogue(d); dialogueRef.current = d
    }, [nearCheckout, heldItem, dialogue])

    // ── Keyboard handler ─────────────────────────────────────────────────────
    const onKeyDown = useCallback((e: KeyboardEvent) => {
        const key = e.key.toLowerCase()
        if (key === " ") e.preventDefault()
        keysRef.current.add(key)

        const dlg = dialogueRef.current
        if (!dlg) {
            // SPACE to inspect nearby item
            if (key === " " && nearItemRef.current && !heldRef.current) {
                const d: Dialogue = { kind: "ITEM", item: nearItemRef.current }
                setDialogue(d); dialogueRef.current = d
            }
            return
        }

        if (dlg.kind === "ITEM") {
            if (key === "z") {
                setHeldItem(dlg.item); heldRef.current = dlg.item
                setDialogue(null); dialogueRef.current = null
            }
            if (key === "x") { setDialogue(null); dialogueRef.current = null }
        }
        if (dlg.kind === "NO_FUNDS") {
            if (key === " " || key === "z" || key === "x") {
                setHeldItem(null); heldRef.current = null
                setDialogue(null); dialogueRef.current = null
            }
        }
        if (dlg.kind === "CHECKOUT") {
            if (key === " " || key === "z") {
                if (saving) return
                setSaving(true)
                const item = dlg.item
                setPurchased(item)
                setStoreItems(prev => prev.filter(i => i.id !== item.id))
                setHeldItem(null); heldRef.current = null
                setDialogue(null); dialogueRef.current = null
                saveGameLesson("disposableDiscCompleted").then(({ xpGain }) => {
                    setXpGained(xpGain)
                    setScene("COMPLETE")
                })
            }
        }
    }, [saving])

    const onKeyUp = useCallback((e: KeyboardEvent) => {
        keysRef.current.delete(e.key.toLowerCase())
    }, [])

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown)
        window.addEventListener("keyup",   onKeyUp)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener("keyup",   onKeyUp)
        }
    }, [onKeyDown, onKeyUp])

    // ── Game loop ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")!
        ctx.imageSmoothingEnabled = false
        let raf: number

        function tick() {
            const keys  = keysRef.current
            const p     = playerRef.current
            const sc    = sceneRef.current
            const dlg   = dialogueRef.current

            if (!dlg) {
                let nx = p.x, ny = p.y
                if (keys.has("arrowleft")  || keys.has("a")) { nx -= SPEED; p.facing = "left"  }
                if (keys.has("arrowright") || keys.has("d")) { nx += SPEED; p.facing = "right" }
                if (keys.has("arrowup")    || keys.has("w")) { ny -= SPEED; p.facing = "up"    }
                if (keys.has("arrowdown")  || keys.has("s")) { ny += SPEED; p.facing = "down"  }
                nx = Math.max(0, Math.min(CW - PW, nx))
                ny = Math.max(0, Math.min(CH - PH, ny))

                const cols = sc === "VILLAGE" ? V_COL : S_COL
                // Try full move
                let blocked = cols.some(c => overlaps(nx, ny, c))
                if (!blocked) { p.x = nx; p.y = ny }
                else {
                    // Slide
                    if (!cols.some(c => overlaps(nx, p.y, c))) p.x = nx
                    if (!cols.some(c => overlaps(p.x, ny, c))) p.y = ny
                }

                // Scene triggers
                if (sc === "VILLAGE" && overlaps(p.x, p.y, V_DOOR)) {
                    playerRef.current = { x: 68, y: 228, facing: "right" }
                    sceneRef.current = "STORE"; setScene("STORE")
                }
                if (sc === "STORE" && overlaps(p.x, p.y, S_EXIT)) {
                    playerRef.current = { x: 568, y: 218, facing: "left" }
                    sceneRef.current = "VILLAGE"; setScene("VILLAGE")
                    heldRef.current = null; setHeldItem(null)
                }

                // Near-item detection (store)
                if (sc === "STORE") {
                    const cx = p.x + PW / 2, cy = p.y + PH / 2
                    const held = heldRef.current
                    let found: StoreItem | null = null
                    if (!held) {
                        for (const item of storeItemsRef.current) {
                            if (dist(cx, cy, item.sx, item.sy) < INTERACT_DIST) { found = item; break }
                        }
                    }
                    if (found?.id !== nearItemRef.current?.id) {
                        nearItemRef.current = found; setNearItem(found)
                    }
                    const co = !!held && overlaps(p.x, p.y, S_CHECKOUT)
                    if (co !== nearCoRef.current) {
                        nearCoRef.current = co; setNearCheckout(co)
                    }
                } else {
                    if (nearItemRef.current) { nearItemRef.current = null; setNearItem(null) }
                    if (nearCoRef.current)   { nearCoRef.current = false; setNearCheckout(false) }
                }
            }

            // Render
            ctx.clearRect(0, 0, CW, CH)
            if (sc === "VILLAGE") {
                drawVillage(ctx, playerRef.current, heldRef.current)
            } else if (sc === "STORE") {
                drawStore(ctx, playerRef.current, storeItemsRef.current, heldRef.current, nearItemRef.current, nearCoRef.current)
            }

            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [])

    // ── Complete screen ───────────────────────────────────────────────────────
    if (scene === "COMPLETE" && purchased) {
        return <ShoppingComplete item={purchased} xp={xpGained} />
    }

    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
            {/* Loading overlay — shown until coins are fetched */}
            {!coinsReady && (
                <div className="absolute inset-0 z-30 bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-lg font-bold animate-pulse">Loading…</span>
                </div>
            )}

            {/* Coin counter */}
            <div className="absolute top-4 right-5 z-20 bg-white/90 backdrop-blur rounded-2xl px-4 py-2 shadow-lg flex items-center gap-2">
                <span className="text-xl">🪙</span>
                <span className="font-black text-lg text-gray-800">{coins.toLocaleString()}</span>
            </div>

            {/* Held item badge */}
            {heldItem && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-yellow-100 border-2 border-yellow-400 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-2">
                    <span className="text-xl">{heldItem.emoji}</span>
                    <span className="font-bold text-sm text-yellow-800">Holding: {heldItem.name}</span>
                </div>
            )}

            {/* Canvas */}
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={CW}
                    height={CH}
                    className="block rounded-xl shadow-2xl"
                    style={{ imageRendering: "pixelated", maxWidth: "100vw", maxHeight: "80vh" }}
                />
                <div className="absolute bottom-2 left-3 bg-black/55 rounded-lg px-2 py-1 text-white text-[11px] font-mono select-none">
                    {scene === "VILLAGE" && "WASD / ↑↓←→ · Walk right into the SHOP"}
                    {scene === "STORE"   && !heldItem && "WASD · SPACE near item to inspect · Z = pick up · X = pass"}
                    {scene === "STORE"   && heldItem  && "WASD · Walk to the checkout counter →"}
                </div>
            </div>

            {/* Dialogue overlays */}
            {dialogue && (
                <DialogueOverlay dialogue={dialogue} />
            )}
        </div>
    )
}

// ─── Dialogue overlay ─────────────────────────────────────────────────────────

function DialogueOverlay({ dialogue }: { dialogue: Dialogue }) {
    if (dialogue.kind === "ITEM") {
        const { item } = dialogue
        return (
            <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-20">
                <div className="relative bg-white rounded-3xl shadow-2xl border-4 border-gray-200 px-8 py-6 text-center min-w-[280px] pointer-events-auto">
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-gray-200" />
                    <div className="absolute -bottom-[10px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-white" />
                    <div className="text-5xl mb-2">{item.emoji}</div>
                    <div className="font-black text-xl text-gray-800 mb-1">{item.name}</div>
                    <div className="text-2xl font-black text-yellow-600 mb-5">🪙 {item.price}</div>
                    <div className="flex gap-3 justify-center">
                        <span className="px-4 py-2 bg-green-500 text-white font-black rounded-xl text-sm border-b-4 border-green-700">Z — Pick up</span>
                        <span className="px-4 py-2 bg-gray-200 text-gray-700 font-black rounded-xl text-sm border-b-4 border-gray-400">X — Pass</span>
                    </div>
                </div>
            </div>
        )
    }

    if (dialogue.kind === "NO_FUNDS") {
        return (
            <div className="absolute inset-0 pointer-events-none flex items-end justify-end pb-20 pr-10">
                <div className="relative bg-white rounded-3xl shadow-2xl border-4 border-red-200 px-7 py-6 max-w-[300px] pointer-events-auto">
                    <div className="text-4xl text-center mb-3">😔</div>
                    <p className="text-center text-gray-700 font-semibold text-sm leading-relaxed">
                        Sorry, you don&apos;t have enough funds for the <strong>{dialogue.item.name}</strong>.
                    </p>
                    <div className="mt-4 text-center">
                        <span className="px-4 py-2 bg-gray-200 text-gray-700 font-black rounded-xl text-sm border-b-4 border-gray-400">SPACE / Z / X — OK</span>
                    </div>
                </div>
            </div>
        )
    }

    if (dialogue.kind === "CHECKOUT") {
        const { item, tax, total } = dialogue
        return (
            <div className="absolute inset-0 pointer-events-none flex items-end justify-end pb-20 pr-10">
                <div className="bg-white rounded-3xl shadow-2xl border-4 border-green-200 px-7 py-6 min-w-[300px] pointer-events-auto">
                    <div className="text-center mb-4">
                        <span className="text-4xl">🤑</span>
                        <p className="font-black text-gray-800 mt-1">Ready to check out?</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4 font-mono text-sm space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-gray-600">{item.emoji} {item.name}</span>
                            <span className="font-bold">🪙 {item.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-xs">
                            <span>Sales tax (8%)</span>
                            <span>🪙 {tax.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-1.5 flex justify-between font-black">
                            <span>Total</span>
                            <span className="text-green-600">🪙 {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <span className="px-4 py-2 bg-green-500 text-white font-black rounded-xl text-sm border-b-4 border-green-700">SPACE / Z — Buy it!</span>
                    </div>
                </div>
            </div>
        )
    }

    return null
}

// ─── Shopping complete card ───────────────────────────────────────────────────

function ShoppingComplete({ item, xp }: { item: StoreItem; xp: number }) {
    const router = useRouter()
    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 px-6">
            <div className="text-7xl mb-2">🎉</div>
            <h1 className="text-2xl lg:text-3xl font-black text-neutral-700 text-center mb-6">
                You made your first purchase!
            </h1>

            {/* Purchased item card */}
            <div className="w-full max-w-xs bg-yellow-50 border-2 border-yellow-300 rounded-3xl p-6 mb-4 flex flex-col items-center gap-2 shadow-md">
                <div className="text-5xl">{item.emoji}</div>
                <div className="font-black text-lg text-gray-800">{item.name}</div>
                <div className="text-yellow-600 font-bold text-sm">
                    🪙 {(item.price * (1 + SALES_TAX)).toFixed(2)} spent (incl. tax)
                </div>
            </div>

            {/* XP card */}
            <div className="w-full max-w-xs rounded-2xl border-2 border-orange-400 overflow-hidden shadow mb-6">
                <div className="bg-orange-400 text-white text-xs font-black uppercase tracking-widest py-1 text-center">XP Gained</div>
                <div className="bg-white py-3 flex items-center justify-center gap-2">
                    <span className="text-orange-400 text-xl">⚡</span>
                    <span className="font-black text-lg text-orange-500">{xp}</span>
                </div>
            </div>

            <button
                onClick={() => router.push("/learn")}
                className="w-full max-w-xs py-3 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-black text-base shadow-md border-b-4 border-green-700 transition-all"
            >
                Continue
            </button>
        </div>
    )
}
