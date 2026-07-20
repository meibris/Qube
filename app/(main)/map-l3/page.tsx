import { getInitialCoins, getPlayerColor } from "@/actions/game-lesson"
import { MapL3Client } from "./map-l3-client"

export default async function MapL3Page() {
  const [initialCoins, playerColor] = await Promise.all([getInitialCoins(), getPlayerColor()])
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <MapL3Client initialCoins={initialCoins} playerColor={playerColor} />
    </div>
  )
}
