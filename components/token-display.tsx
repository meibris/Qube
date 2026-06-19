"use client"

import { useEffect, useState } from "react"

interface Props {
    baseTokens: number          // tokens already stored in DB
    tokenRate: number           // 🪙 per hour
    jobStartedAt: string | null // ISO timestamp when earning began
}

/** Format a raw token count into tiered display */
export function formatTokenTier(tokens: number): { text: string; className: string } {
    if (tokens < 1000) {
        // Bronze
        return { text: `🪙 ${tokens}`, className: "text-amber-600" }
    }
    if (tokens < 1_000_000) {
        // Silver: 1000 bronze = 1 silver
        const silver = tokens / 1000
        const display = silver < 10 ? silver.toFixed(1) : Math.round(silver).toString()
        return { text: `🥈 ${display}`, className: "text-slate-400" }
    }
    // Gold: 1000 silver = 1 gold
    const gold = tokens / 1_000_000
    const display = gold < 10 ? gold.toFixed(1) : Math.round(gold).toString()
    return { text: `🥇 ${display}`, className: "text-yellow-500" }
}

export function TokenDisplay({ baseTokens, tokenRate, jobStartedAt }: Props) {
    const [tokens, setTokens] = useState(baseTokens)

    useEffect(() => {
        if (!jobStartedAt || tokenRate <= 0) return

        const msPerToken = 3600_000 / tokenRate

        function tick() {
            const elapsed = Date.now() - new Date(jobStartedAt!).getTime()
            setTokens(baseTokens + Math.floor(elapsed / msPerToken))
        }

        tick()
        const id = setInterval(tick, 60_000)
        return () => clearInterval(id)
    }, [baseTokens, tokenRate, jobStartedAt])

    const { text, className } = formatTokenTier(tokens)

    return <span className={`font-bold ${className}`}>{text}</span>
}
