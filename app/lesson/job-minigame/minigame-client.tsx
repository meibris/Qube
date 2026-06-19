"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Confetti from "react-confetti"
import { useWindowSize } from "react-use"
import { X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useExitModal } from "@/store/use-exit-modal"
import { saveMinigameCompleted } from "@/actions/minigame"
import { ResultCard } from "../result-card"

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase = "PLAYING" | "COMPLETE"

interface OrbState {
    x: number; y: number; r: number
    type: "gold" | "blue"
    collected: boolean
}

interface Props {
    jobName: string
    jobIcon: string
    playerImage: string
    playerBgColor: string
    coins: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 800
const H = 460
const WORLD_W = 2400
const WORLD_H = 900

const MOVE_SPEED  = 3.5
const PLAYER_W    = 44
const PLAYER_H    = 44

const COIN_VALUE  = 10
const OT_MULT     = 1.5

// ─── World layout: walls  [worldX, worldY, w, h] ──────────────────────────────
// These are solid obstacles the player must navigate around.
const WALLS: [number, number, number, number][] = [
    // Zone 1
    [280,   0,  20, 340],
    [280, 560,  20, 340],
    [  0, 400, 200,  20],

    // Zone 2
    [660,   0,  20, 260],
    [660, 480,  20, 420],
    [760, 320, 180,  20],

    // Zone 3
    [1100,   0,  20, 380],
    [1100, 580,  20, 320],
    [1200, 420, 240,  20],

    // Zone 4
    [1580,   0,  20, 300],
    [1580, 520,  20, 380],
    [1700, 360, 200,  20],

    // Zone 5
    [1980,   0,  20, 260],
    [1980, 480,  20, 420],
    [2080, 320, 160,  20],

    // Near exit
    [2260,  60,  20, 280],
    [2260, 560,  20, 280],
]

// ─── Coin placement: [worldX, worldY, type] ──────────────────────────────────
const ORB_DEFS: Array<[number, number, "gold" | "blue"]> = [
    // Zone 1 – left room
    [120, 200, "gold"],
    [140, 650, "gold"],
    [420, 150, "gold"],
    [420, 720, "gold"],
    [160, 430, "blue"],

    // Zone 2
    [820, 130, "gold"],
    [820, 750, "gold"],
    [940, 420, "gold"],
    [560, 430, "blue"],
    [1040, 200, "gold"],

    // Zone 3
    [1320, 100, "gold"],
    [1320, 780, "gold"],
    [1420, 450, "gold"],
    [1050, 440, "blue"],
    [1500, 250, "gold"],

    // Zone 4
    [1800, 150, "gold"],
    [1800, 730, "gold"],
    [1900, 400, "gold"],
    [1660, 420, "blue"],
    [2060, 130, "gold"],

    // Zone 5 / near exit
    [2160, 430, "gold"],
    [2160, 760, "gold"],
    [2360, 430, "gold"],
    [2100, 440, "blue"],
    [2360, 200, "gold"],
    [2360, 680, "blue"],
]

// ─── Exit door (world coords) ─────────────────────────────────────────────────
const DOOR_WX = 2330
const DOOR_WY = WORLD_H / 2 - 43
const DOOR_DW = 52
const DOOR_DH = 86

// ─── Job visual themes ────────────────────────────────────────────────────────

interface Theme {
    floorA: string; floorB: string
    wallColor: string; wallEdge: string
    accentColor: string
    groundLabel: string
}

const JOB_THEMES: Record<string, Theme> = {
    "Video Game Beta Tester": {
        floorA: "#1e1b4b", floorB: "#312e81",
        wallColor: "#3730a3", wallEdge: "#6366f1",
        accentColor: "#818cf8",
        groundLabel: "GAME LAB",
    },
    "Treehouse Architect": {
        floorA: "#14532d", floorB: "#166534",
        wallColor: "#78350f", wallEdge: "#a16207",
        accentColor: "#86efac",
        groundLabel: "TREEHOUSE FLOOR",
    },
    "Pillow Softness Rater": {
        floorA: "#fce7f3", floorB: "#fdf2f8",
        wallColor: "#fbcfe8", wallEdge: "#f9a8d4",
        accentColor: "#f472b6",
        groundLabel: "PILLOW WAREHOUSE",
    },
    "Volcano Explorer": {
        floorA: "#1c0a02", floorB: "#431407",
        wallColor: "#7c2d12", wallEdge: "#b91c1c",
        accentColor: "#fb923c",
        groundLabel: "VOLCANIC BASE",
    },
    "Hologram Designer": {
        floorA: "#082f49", floorB: "#0c4a6e",
        wallColor: "#0e7490", wallEdge: "#0891b2",
        accentColor: "#67e8f9",
        groundLabel: "HOLO STUDIO",
    },
    "Comic Book Artist": {
        floorA: "#fef9c3", floorB: "#fef08a",
        wallColor: "#7c3aed", wallEdge: "#a855f7",
        accentColor: "#f9a8d4",
        groundLabel: "STUDIO FLOOR",
    },
    "Forensic Scientist": {
        floorA: "#e2e8f0", floorB: "#cbd5e1",
        wallColor: "#374151", wallEdge: "#6b7280",
        accentColor: "#94a3b8",
        groundLabel: "LAB FLOOR",
    },
    "Animal Translator": {
        floorA: "#d1fae5", floorB: "#a7f3d0",
        wallColor: "#15803d", wallEdge: "#4ade80",
        accentColor: "#34d399",
        groundLabel: "JUNGLE CLEARING",
    },
    "Food Taster": {
        floorA: "#fffbeb", floorB: "#fef3c7",
        wallColor: "#b45309", wallEdge: "#f59e0b",
        accentColor: "#fcd34d",
        groundLabel: "TEST KITCHEN",
    },
}

const DEFAULT_THEME: Theme = {
    floorA: "#dbeafe", floorB: "#bfdbfe",
    wallColor: "#475569", wallEdge: "#94a3b8",
    accentColor: "#60a5fa",
    groundLabel: "WORKPLACE",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MinigameClient({ jobName, jobIcon, playerImage, playerBgColor, coins }: Props) {
    const router              = useRouter()
    const { open: openExit }  = useExitModal()
    const { width, height }   = useWindowSize()
    const [showIntro, setShowIntro]       = useState(true)
    const [showPayday, setShowPayday]     = useState(false)
    const [showEndScreen, setShowEndScreen] = useState(false)
    const [coinsEarned, setCoinsEarned]   = useState(0)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ctxRef    = useRef<CanvasRenderingContext2D | null>(null)
    const dprRef    = useRef(1)

    // ── Game state refs ───────────────────────────────────────────────────────

    const phaseRef     = useRef<GamePhase>("PLAYING")
    const playerRef    = useRef({
        x: 80,
        y: WORLD_H / 2 - PLAYER_H / 2,
        facingRight: true,
    })
    const camXRef      = useRef(0)
    const camYRef      = useRef(WORLD_H / 2 - H / 2)
    const orbsRef      = useRef<OrbState[]>(
        ORB_DEFS.map(([x, y, type]) => ({ x, y, r: 10, type, collected: false }))
    )
    const incomeRef    = useRef(0)
    const keysRef      = useRef(new Set<string>())
    const frameRef     = useRef(0)
    const doneFrameRef = useRef(0)
    const playerImgRef = useRef<HTMLImageElement | null>(null)
    const fontReadyRef = useRef(false)
    const savedRef         = useRef(false)
    const gameStartTimeRef = useRef<number>(0)

    const theme = JOB_THEMES[jobName] ?? DEFAULT_THEME

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m}:${s.toString().padStart(2, "0")}`
    }

    // ── Canvas setup ──────────────────────────────────────────────────────────

    useLayoutEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dpr = window.devicePixelRatio || 1
        dprRef.current = dpr
        canvas.width  = W * dpr
        canvas.height = H * dpr
        const ctx = canvas.getContext("2d")!
        ctx.scale(dpr, dpr)
        ctxRef.current = ctx
    }, [])

    // ── Asset loading ─────────────────────────────────────────────────────────

    useEffect(() => {
        const img = new window.Image()
        img.src = playerImage
        img.onload = () => { playerImgRef.current = img }

        new FontFace(
            "PS2P",
            "url(https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2)"
        )
            .load()
            .then(f => { document.fonts.add(f); fontReadyRef.current = true })
            .catch(() => { fontReadyRef.current = true })
    }, [playerImage])

    // ── Keyboard input ────────────────────────────────────────────────────────

    useEffect(() => {
        if (showIntro) return
        const onDown = (e: KeyboardEvent) => {
            keysRef.current.add(e.key)
            if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault()
        }
        const onUp   = (e: KeyboardEvent) => { keysRef.current.delete(e.key) }
        window.addEventListener("keydown", onDown)
        window.addEventListener("keyup",   onUp)
        return () => {
            window.removeEventListener("keydown", onDown)
            window.removeEventListener("keyup",   onUp)
        }
    }, [showIntro])

    // ── Game loop ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (showIntro) return
        const ctx = ctxRef.current
        if (!ctx) return

        const gf = () => fontReadyRef.current ? "'PS2P', monospace" : "monospace"

        // ── Rounded rect helper ───────────────────────────────────────────────
        function rr(x: number, y: number, w: number, h: number, r: number) {
            ctx.beginPath()
            ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
            ctx.quadraticCurveTo(x + w, y, x + w, y + r)
            ctx.lineTo(x + w, y + h - r)
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
            ctx.lineTo(x + r, y + h)
            ctx.quadraticCurveTo(x, y + h, x, y + h - r)
            ctx.lineTo(x, y + r)
            ctx.quadraticCurveTo(x, y, x + r, y)
            ctx.closePath()
        }

        // ── Physics ───────────────────────────────────────────────────────────

        function updatePlayer() {
            const p = playerRef.current
            const k = keysRef.current

            const right = (k.has("ArrowRight") || k.has("d") || k.has("D")) ? 1 : 0
            const left  = (k.has("ArrowLeft")  || k.has("a") || k.has("A")) ? 1 : 0
            const down  = (k.has("ArrowDown")  || k.has("s") || k.has("S")) ? 1 : 0
            const up    = (k.has("ArrowUp")    || k.has("w") || k.has("W")) ? 1 : 0

            const dx = right - left
            const dy = down  - up

            if (right) p.facingRight = true
            if (left)  p.facingRight = false

            // Normalize diagonals
            const len = Math.hypot(dx, dy) || 1
            const nx = dx === 0 ? 0 : (dx / len) * MOVE_SPEED
            const ny = dy === 0 ? 0 : (dy / len) * MOVE_SPEED

            // Move X then resolve wall collisions
            p.x += nx
            for (const [wx, wy, ww, wh] of WALLS) {
                if (p.x + PLAYER_W > wx && p.x < wx + ww &&
                    p.y + PLAYER_H > wy && p.y < wy + wh) {
                    if (nx > 0) p.x = wx - PLAYER_W
                    if (nx < 0) p.x = wx + ww
                }
            }

            // Move Y then resolve wall collisions
            p.y += ny
            for (const [wx, wy, ww, wh] of WALLS) {
                if (p.x + PLAYER_W > wx && p.x < wx + ww &&
                    p.y + PLAYER_H > wy && p.y < wy + wh) {
                    if (ny > 0) p.y = wy - PLAYER_H
                    if (ny < 0) p.y = wy + wh
                }
            }

            // Clamp to world bounds
            p.x = Math.max(0, Math.min(WORLD_W - PLAYER_W, p.x))
            p.y = Math.max(0, Math.min(WORLD_H - PLAYER_H, p.y))

            // Camera follows player (smooth lerp)
            const targetCamX = p.x + PLAYER_W / 2 - W / 2
            const targetCamY = p.y + PLAYER_H / 2 - H / 2
            camXRef.current += (Math.max(0, Math.min(WORLD_W - W, targetCamX)) - camXRef.current) * 0.12
            camYRef.current += (Math.max(0, Math.min(WORLD_H - H, targetCamY)) - camYRef.current) * 0.12
        }

        function checkOrbs() {
            const p   = playerRef.current
            const pcx = p.x + PLAYER_W / 2
            const pcy = p.y + PLAYER_H / 2

            for (const orb of orbsRef.current) {
                if (orb.collected) continue
                if (Math.hypot(pcx - orb.x, pcy - orb.y) < PLAYER_W / 2 + orb.r + 2) {
                    orb.collected     = true
                    const value       = orb.type === "gold" ? COIN_VALUE : COIN_VALUE * OT_MULT
                    incomeRef.current += value
                }
            }
        }

        function checkDoor() {
            if (phaseRef.current !== "PLAYING") return
            const p = playerRef.current
            const hit =
                p.x + PLAYER_W > DOOR_WX &&
                p.x            < DOOR_WX + DOOR_DW &&
                p.y + PLAYER_H > DOOR_WY &&
                p.y            < DOOR_WY + DOOR_DH

            if (hit) {
                phaseRef.current     = "COMPLETE"
                doneFrameRef.current = frameRef.current
                if (!savedRef.current) {
                    savedRef.current = true
                    const elapsed = Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
                    setCoinsEarned(Math.round(incomeRef.current))
                    setElapsedSeconds(elapsed)
                    setTimeout(() => setShowPayday(true), 600)
                    saveMinigameCompleted().catch(() => {})
                }
            }
        }

        // ── Draw ──────────────────────────────────────────────────────────────

        function drawFloor() {
            const camX = camXRef.current
            const camY = camYRef.current

            // Base fill
            ctx.fillStyle = theme.floorA
            ctx.fillRect(0, 0, W, H)

            // Tile grid
            const tileSize = 60
            const offX = -(camX % tileSize)
            const offY = -(camY % tileSize)
            ctx.strokeStyle = theme.floorB
            ctx.lineWidth = 1
            ctx.globalAlpha = 0.4
            for (let gx = offX; gx < W; gx += tileSize) {
                ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()
            }
            for (let gy = offY; gy < H; gy += tileSize) {
                ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke()
            }
            ctx.globalAlpha = 1

            // World-edge borders (visible when near edges)
            ctx.fillStyle = theme.wallColor
            ctx.globalAlpha = 0.6
            if (camY <= 0)           ctx.fillRect(0, -camY,          W, 8)
            if (camY + H >= WORLD_H) ctx.fillRect(0, WORLD_H - camY - 8, W, 8)
            if (camX <= 0)           ctx.fillRect(-camX, 0,          8, H)
            if (camX + W >= WORLD_W) ctx.fillRect(WORLD_W - camX - 8, 0, 8, H)
            ctx.globalAlpha = 1

            // Floor watermark label
            const f = gf()
            ctx.font = `9px ${f}`
            ctx.fillStyle = "rgba(255,255,255,0.08)"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(theme.groundLabel, W / 2, H / 2)
        }

        function drawWalls() {
            const camX = camXRef.current
            const camY = camYRef.current

            for (const [wx, wy, ww, wh] of WALLS) {
                const sx = wx - camX
                const sy = wy - camY
                if (sx + ww < -20 || sx > W + 20 || sy + wh < -20 || sy > H + 20) continue

                // Shadow
                ctx.save()
                ctx.shadowColor   = "rgba(0,0,0,0.4)"
                ctx.shadowBlur    = 10
                ctx.shadowOffsetX = 3
                ctx.shadowOffsetY = 3
                ctx.fillStyle = theme.wallColor
                rr(sx, sy, ww, wh, 4)
                ctx.fill()
                ctx.restore()

                // Edge highlight
                ctx.fillStyle = theme.wallEdge
                ctx.globalAlpha = 0.5
                const isVert = wh > ww
                if (isVert) ctx.fillRect(sx, sy + 4, Math.min(ww, 4), wh - 8)
                else        ctx.fillRect(sx + 4, sy, ww - 8, Math.min(wh, 4))
                ctx.globalAlpha = 1
            }
        }

        function drawOrbs() {
            const camX = camXRef.current
            const camY = camYRef.current
            const t    = frameRef.current

            for (const orb of orbsRef.current) {
                if (orb.collected) continue
                const sx = orb.x - camX
                const sy = orb.y - camY
                if (sx + orb.r < -10 || sx - orb.r > W + 10 ||
                    sy + orb.r < -10 || sy - orb.r > H + 10) continue

                const pulse = Math.sin(t * 0.1 + orb.x * 0.04) * 0.12 + 0.88
                const r     = orb.r * pulse

                ctx.save()
                if (orb.type === "gold") {
                    const g = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, r)
                    g.addColorStop(0, "#fef9c3")
                    g.addColorStop(0.45, "#fbbf24")
                    g.addColorStop(1, "#d97706")
                    ctx.fillStyle   = g
                    ctx.shadowColor = "#fbbf24"
                    ctx.shadowBlur  = 12
                } else {
                    const g = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, r)
                    g.addColorStop(0, "#e0f2fe")
                    g.addColorStop(0.45, "#38bdf8")
                    g.addColorStop(1, "#0284c7")
                    ctx.fillStyle   = g
                    ctx.shadowColor = "#38bdf8"
                    ctx.shadowBlur  = 16
                }
                ctx.beginPath()
                ctx.arc(sx, sy, r, 0, Math.PI * 2)
                ctx.fill()

                // Coin face line
                ctx.shadowBlur  = 0
                ctx.strokeStyle = orb.type === "gold"
                    ? "rgba(120,53,15,0.45)"
                    : "rgba(12,74,110,0.45)"
                ctx.lineWidth = 1.5
                ctx.beginPath()
                ctx.moveTo(sx - r * 0.55, sy)
                ctx.lineTo(sx + r * 0.55, sy)
                ctx.stroke()
                ctx.restore()

                if (orb.type === "blue") {
                    ctx.save()
                    ctx.fillStyle = "#fbbf24"
                    ctx.font = "bold 7px monospace"
                    ctx.textAlign = "center"
                    ctx.textBaseline = "bottom"
                    ctx.fillText("x1.5", sx, sy - r - 2)
                    ctx.restore()
                }
            }
        }

        function drawDoor() {
            const camX = camXRef.current
            const camY = camYRef.current
            const sx   = DOOR_WX - camX
            const sy   = DOOR_WY - camY
            if (sx + DOOR_DW < -20 || sx > W + 20 || sy + DOOR_DH < -20 || sy > H + 20) return

            const glow = Math.sin(frameRef.current * 0.07) * 6 + 14
            const f = gf()

            ctx.save()
            ctx.shadowColor = "#4ade80"
            ctx.shadowBlur  = glow

            ctx.fillStyle = "#7c2d12"
            rr(sx, sy, DOOR_DW, DOOR_DH, 5)
            ctx.fill()

            ctx.shadowBlur = 0
            ctx.fillStyle  = "#451a03"
            rr(sx + 5, sy + 5, DOOR_DW - 10, DOOR_DH - 5, 3)
            ctx.fill()

            const panelH = Math.floor((DOOR_DH - 24) / 2)
            ctx.fillStyle = "#6c2a10"
            rr(sx + 9, sy + 8,            DOOR_DW - 18, panelH, 2); ctx.fill()
            rr(sx + 9, sy + 11 + panelH,  DOOR_DW - 18, panelH, 2); ctx.fill()

            ctx.fillStyle   = "#fbbf24"
            ctx.shadowColor = "#fbbf24"
            ctx.shadowBlur  = 6
            ctx.beginPath()
            ctx.arc(sx + DOOR_DW - 13, sy + DOOR_DH / 2, 4, 0, Math.PI * 2)
            ctx.fill()

            ctx.shadowBlur = 0
            ctx.fillStyle  = "#4ade80"
            ctx.font = `7px ${f}`
            ctx.textAlign    = "center"
            ctx.textBaseline = "bottom"
            ctx.fillText("END",   sx + DOOR_DW / 2, sy - 7)
            ctx.fillText("SHIFT", sx + DOOR_DW / 2, sy)
            ctx.restore()
        }

        function drawPlayer() {
            const p    = playerRef.current
            const camX = camXRef.current
            const camY = camYRef.current
            const sx   = p.x - camX
            const sy   = p.y - camY

            ctx.save()
            const img = playerImgRef.current
            if (img) {
                const scale = PLAYER_H / img.naturalHeight
                const drawW = img.naturalWidth * scale
                const offX  = (PLAYER_W - drawW) / 2
                if (!p.facingRight) {
                    ctx.translate(sx + PLAYER_W, sy)
                    ctx.scale(-1, 1)
                    ctx.drawImage(img, offX, 0, drawW, PLAYER_H)
                } else {
                    ctx.drawImage(img, sx + offX, sy, drawW, PLAYER_H)
                }
            } else {
                ctx.fillStyle = playerBgColor
                ctx.beginPath()
                ctx.arc(sx + PLAYER_W / 2, sy + PLAYER_H / 2, PLAYER_W / 2, 0, Math.PI * 2)
                ctx.fill()
            }
            ctx.restore()

            // Nametag
            ctx.save()
            const f = gf()
            ctx.font = `7px ${f}`
            const tw = ctx.measureText("YOU").width + 10
            const tx = sx + PLAYER_W / 2 - tw / 2
            const ty = sy - 20
            ctx.fillStyle = "rgba(0,0,0,0.6)"
            rr(tx, ty, tw, 14, 3)
            ctx.fill()
            ctx.fillStyle = "#ffffff"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText("YOU", sx + PLAYER_W / 2, ty + 7)
            ctx.restore()
        }

        function drawHUD() {
            const f = gf()

            // ── Coins (top-left) ──
            ctx.save()
            ctx.fillStyle = "rgba(0,0,0,0.6)"
            rr(8, 8, 172, 38, 7)
            ctx.fill()
            ctx.fillStyle = "#fbbf24"
            ctx.font = `9px ${f}`
            ctx.textAlign = "left"
            ctx.textBaseline = "middle"
            ctx.fillText(`COINS: ${Math.round(incomeRef.current)}`, 20, 27)
            ctx.restore()

            // ── Coin count remaining (top-right) ──
            const goldLeft = orbsRef.current.filter(o => o.type === "gold" && !o.collected).length
            const blueLeft = orbsRef.current.filter(o => o.type === "blue" && !o.collected).length
            const allDone  = goldLeft === 0 && blueLeft === 0

            ctx.save()
            ctx.fillStyle = "rgba(0,0,0,0.6)"
            rr(W - 186, 8, 178, 38, 7)
            ctx.fill()
            ctx.font = `7px ${f}`
            ctx.textBaseline = "middle"
            ctx.textAlign = "right"
            if (allDone) {
                ctx.fillStyle = "#4ade80"
                ctx.fillText("All coins! End Shift ->", W - 14, 27)
            } else {
                ctx.fillStyle = "#fbbf24"
                ctx.fillText(`Gold x${goldLeft}   Blue x${blueLeft}`, W - 14, 18)
                ctx.fillStyle = "#94a3b8"
                ctx.fillText("Find the Exit Door ->", W - 14, 36)
            }
            ctx.restore()

            // ── Mini-map (top-center) ──
            const mmW = 120, mmH = 46
            const mmX = W / 2 - mmW / 2
            const mmY = 8
            const scaleX = mmW / WORLD_W
            const scaleY = mmH / WORLD_H

            ctx.save()
            ctx.fillStyle = "rgba(0,0,0,0.6)"
            rr(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 6)
            ctx.fill()
            ctx.fillStyle = "rgba(255,255,255,0.06)"
            ctx.fillRect(mmX, mmY, mmW, mmH)

            // Uncollected orbs on mini-map
            for (const orb of orbsRef.current) {
                if (orb.collected) continue
                ctx.fillStyle = orb.type === "gold" ? "#fbbf24" : "#38bdf8"
                ctx.fillRect(mmX + orb.x * scaleX - 1, mmY + orb.y * scaleY - 1, 2, 2)
            }
            // Door on mini-map
            ctx.fillStyle = "#4ade80"
            ctx.fillRect(mmX + DOOR_WX * scaleX - 2, mmY + DOOR_WY * scaleY - 2, 4, 4)
            // Player on mini-map
            const p = playerRef.current
            ctx.fillStyle = "#ffffff"
            ctx.beginPath()
            ctx.arc(mmX + p.x * scaleX, mmY + p.y * scaleY, 2.5, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()

            // ── Controls hint (bottom) ──
            ctx.save()
            const hint = "WASD / ARROW KEYS  to move"
            ctx.font = `7px ${f}`
            const hw = Math.min(ctx.measureText(hint).width + 24, W - 20)
            ctx.fillStyle = "rgba(0,0,0,0.35)"
            rr(W / 2 - hw / 2, H - 38, hw, 14, 4)
            ctx.fill()
            ctx.fillStyle = "#e2e8f0"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(hint, W / 2, H - 31)
            ctx.restore()
        }

        // ── Main loop ─────────────────────────────────────────────────────────

        let animId: number

        const loop = () => {
            frameRef.current++

            if (phaseRef.current === "PLAYING") {
                updatePlayer()
                checkOrbs()
                checkDoor()
            }

            drawFloor()
            drawWalls()
            drawOrbs()
            drawDoor()
            drawPlayer()
            drawHUD()

            animId = requestAnimationFrame(loop)
        }

        animId = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(animId)

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showIntro])

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <style>{`
                @keyframes envelopeDrop {
                    0%   { transform: translateY(-110vh) rotate(-6deg); opacity: 0; }
                    55%  { transform: translateY(20px) rotate(2deg); opacity: 1; }
                    72%  { transform: translateY(-12px) rotate(-1deg); }
                    85%  { transform: translateY(6px) rotate(0.4deg); }
                    100% { transform: translateY(0) rotate(0deg); }
                }
                @keyframes flapOpen {
                    from { transform: perspective(600px) rotateX(0deg); }
                    to   { transform: perspective(600px) rotateX(-90deg); }
                }
                @keyframes paycheckSlide {
                    0%   { transform: translateY(60px); opacity: 0; }
                    60%  { transform: translateY(-18px); opacity: 1; }
                    80%  { transform: translateY(6px); }
                    100% { transform: translateY(-28px); opacity: 1; }
                }
                @keyframes fadeInHint {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <header className="lg:pt-[50px] pt-[20px] px-10 flex gap-x-7 items-center justify-between max-w-[1140px] mx-auto w-full">
                <X
                    onClick={openExit}
                    className="text-slate-500 hover:opacity-75 transition cursor-pointer"
                />
                <Progress value={50} />
                <div className="text-yellow-500 flex items-center font-bold">
                    🪙 {coins}
                </div>
            </header>

            <div className="flex flex-1 items-center justify-center px-4 py-6 bg-white">
                <canvas
                    ref={canvasRef}
                    style={{
                        width: `${W}px`,
                        height: `${H}px`,
                        maxWidth: "100%",
                        cursor: "default",
                        borderRadius: "12px",
                        boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
                        border: "1px solid #e2e8f0",
                        display: "block",
                    }}
                />
            </div>

            {/* ── Payday animation ──────────────────────────────────────────── */}
            {showPayday && (
                <div
                    className="fixed inset-0 flex flex-col items-center justify-center z-50 select-none cursor-pointer"
                    style={{ background: "rgba(0,0,0,0.78)" }}
                    onClick={() => { setShowPayday(false); setShowEndScreen(true) }}
                >
                    <div style={{ animation: "envelopeDrop 1s cubic-bezier(0.34,1.1,0.64,1) both" }}>
                        <p style={{
                            textAlign: "center", marginBottom: 16,
                            color: "#fbbf24", fontSize: 26, fontWeight: 900,
                            letterSpacing: 3, textShadow: "0 0 28px rgba(251,191,36,0.9)",
                        }}>
                            💰 PAYDAY! 💰
                        </p>

                        <div style={{ position: "relative", width: 320, height: 200 }}>
                            <div style={{
                                position: "absolute", inset: 0,
                                background: "#fef9c3",
                                border: "3px solid #d97706",
                                borderRadius: 12,
                                zIndex: 1,
                            }} />
                            <div style={{
                                position: "absolute", bottom: 0, left: 0, right: 0,
                                height: "48%",
                                background: "#fde68a",
                                clipPath: "polygon(0% 100%, 50% 0%, 100% 100%)",
                                zIndex: 2,
                                borderRadius: "0 0 12px 12px",
                            }} />
                            <div style={{
                                position: "absolute",
                                top: 18, left: 14, right: 14,
                                background: "linear-gradient(145deg, #ffffff, #f0fdf4)",
                                border: "2px solid #4ade80",
                                borderRadius: 10,
                                padding: "14px 18px",
                                zIndex: 3,
                                opacity: 0,
                                animation: "paycheckSlide 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards",
                                animationDelay: "1.5s",
                                boxShadow: "0 4px 24px rgba(74,222,128,0.35)",
                                textAlign: "center",
                            }}>
                                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, letterSpacing: 2, marginBottom: 6, textTransform: "uppercase" }}>
                                    Official Paycheck
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", marginBottom: 10 }}>
                                    First Shift Completed! 🎉
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 900, color: "#d97706" }}>
                                    🪙 {coinsEarned}
                                </div>
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>coins earned</div>
                            </div>
                            <div style={{
                                position: "absolute",
                                top: 0, left: 0, right: 0,
                                height: "50%",
                                background: "#fde68a",
                                border: "3px solid #d97706",
                                borderBottom: "none",
                                borderRadius: "12px 12px 0 0",
                                clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)",
                                transformOrigin: "center bottom",
                                zIndex: 5,
                                animation: "flapOpen 0.6s ease-in forwards",
                                animationDelay: "0.9s",
                            }} />
                        </div>

                        <p style={{
                            textAlign: "center", marginTop: 18,
                            color: "#9ca3af", fontSize: 13,
                            opacity: 0,
                            animation: "fadeInHint 0.5s ease forwards",
                            animationDelay: "2.3s",
                        }}>
                            Click anywhere to collect your pay →
                        </p>
                    </div>
                </div>
            )}

            {/* ── End screen ────────────────────────────────────────────────── */}
            {showEndScreen && (
                <>
                    <Confetti
                        width={width}
                        height={height}
                        recycle={false}
                        numberOfPieces={500}
                        tweenDuration={10000}
                    />
                    <div className="fixed inset-0 bg-white/90 flex flex-col items-center justify-center z-50">
                        <div className="flex flex-col gap-y-4 lg:gap-y-8 max-w-lg mx-auto text-center items-center justify-center h-full">
                            <Image
                                src="/finish.svg"
                                alt="Finish"
                                className="block lg:hidden"
                                height={50}
                                width={50}
                            />
                            <Image
                                src="/finish.svg"
                                alt="Finish"
                                className="hidden lg:block"
                                height={100}
                                width={100}
                            />
                            <h1 className="text-xl lg:text-3xl font-bold text-neutral-700">
                                Great job! <br /> You&apos;ve completed the lesson.
                            </h1>
                            <div className="flex items-center gap-x-4 w-full">
                                <ResultCard variant="points" value={coinsEarned} />
                            </div>
                            <div className="flex items-center justify-center gap-4 bg-sky-50 border-2 border-sky-200 rounded-2xl w-full py-4">
                                <span className="text-3xl">⏱️</span>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-sky-500 uppercase tracking-widest">Time</div>
                                    <div className="text-2xl font-bold text-sky-700">{formatTime(elapsedSeconds)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full px-6 lg:px-10 py-6 border-t border-gray-100 bg-white">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-8 py-3 rounded-xl border-2 border-b-4 border-slate-200 font-bold text-slate-500 uppercase hover:bg-slate-50 transition text-sm"
                            >
                                Practice Again
                            </button>
                            <button
                                onClick={() => router.push("/learn")}
                                className="px-8 py-3 rounded-xl border-2 border-b-4 border-green-600 bg-green-500 font-bold text-white uppercase hover:bg-green-400 transition text-sm"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </>
            )}

            {showIntro && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">{jobIcon}</span>
                            <h2 className="text-xl font-bold text-gray-800">First Shift!</h2>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed mb-5">
                            It&apos;s your first day as a <strong>{jobName}</strong>.
                            Explore the workplace, collect coins to earn your{" "}
                            <strong>Gross Income</strong>, then find the Exit Door to end your shift!
                        </p>
                        <div className="bg-blue-50 rounded-xl p-4 mb-4 flex flex-col gap-3 border border-blue-100">
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <span className="text-lg">🕹️</span>
                                <span><strong>Arrow Keys / WASD</strong> to move in any direction</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <span className="text-lg">🪙</span>
                                <span><strong>Gold coins</strong> = regular wages &nbsp;|&nbsp; <strong>Blue coins</strong> = <strong>1.5× overtime pay!</strong></span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                <span className="text-lg">🗺️</span>
                                <span>Use the <strong>mini-map</strong> at the top to find coins and the exit.</span>
                            </div>
                        </div>
                        <div className="bg-amber-50 rounded-xl px-4 py-3 mb-6 border border-amber-100">
                            <p className="text-sm text-amber-700 font-semibold">
                                🚪 Collect coins then reach the <strong>Exit Door</strong> on the far right to end your shift!
                            </p>
                        </div>
                        <button
                            onClick={() => { gameStartTimeRef.current = Date.now(); setShowIntro(false) }}
                            className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base shadow-md transition-all active:scale-95"
                        >
                            Start My Shift! 🚀
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
