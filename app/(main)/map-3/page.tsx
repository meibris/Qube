import { getInitialCoins, getPlayerColor } from "@/actions/game-lesson"
import { Map3Client } from "./map-3-client"

export default async function Map3Page({ searchParams }: { searchParams: Promise<{ freeplay?: string }> }) {
  const [[initialCoins, playerColor], { freeplay }] = await Promise.all([
    Promise.all([getInitialCoins(), getPlayerColor()]),
    searchParams,
  ])
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Map3Client initialCoins={initialCoins} playerColor={playerColor} freeplay={freeplay==="1"} />
    </div>
  )
}
