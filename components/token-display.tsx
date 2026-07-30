"use client"

interface Props {
    baseTokens: number          // tokens already stored in DB
    tokenRate: number           // unused — passive idle income was removed
    jobStartedAt: string | null // unused — passive idle income was removed
}

/** Format a raw token count into tiered display */
export function formatTokenTier(tokens: number): { icon: "coin" | "silver" | "gold"; text: string; className: string } {
    if (tokens < 1000) {
        // Bronze
        return { icon: "coin", text: `${tokens}`, className: "text-amber-600" }
    }
    if (tokens < 1_000_000) {
        // Silver: 1000 bronze = 1 silver
        const silver = tokens / 1000
        const display = silver < 10 ? silver.toFixed(1) : Math.round(silver).toString()
        return { icon: "silver", text: `🥈 ${display}`, className: "text-slate-400" }
    }
    // Gold: 1000 silver = 1 gold
    const gold = tokens / 1_000_000
    const display = gold < 10 ? gold.toFixed(1) : Math.round(gold).toString()
    return { icon: "gold", text: `🥇 ${display}`, className: "text-yellow-500" }
}

export function TokenDisplay({ baseTokens }: Props) {
    const { icon, text, className } = formatTokenTier(baseTokens)

    return (
        <span className={`font-bold inline-flex items-center gap-1 ${className}`}>
            {icon === "coin" && <img src="/coin.svg" alt="" className="w-4 h-4" />}
            {text}
        </span>
    )
}
