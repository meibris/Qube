import { getInitialCoins, getPlayerColor } from "@/actions/game-lesson"
import { Map3Client } from "./map-3-client"

export default async function Map3Page() {
  const [initialCoins, playerColor] = await Promise.all([getInitialCoins(), getPlayerColor()])
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Map3Client initialCoins={initialCoins} playerColor={playerColor} />
    </div>
  )
}
