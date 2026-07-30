// Inline coin icon sized in `em` units so it drops into running text (numbers,
// table cells, headings) at whatever font-size surrounds it, like an emoji would.
export function CoinIcon({ className = "" }: { className?: string }) {
    return (
        <img
            src="/coin.svg"
            alt=""
            className={`inline-block w-[1em] h-[1em] align-[-0.15em] ${className}`}
        />
    )
}
