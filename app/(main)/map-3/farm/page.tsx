import { getInitialCoins, getPlayerColor } from "@/actions/game-lesson"
import { GameMap } from "../../map/game-map"

export default async function Map3FarmPage() {
  const [initialCoins, playerColor] = await Promise.all([getInitialCoins(), getPlayerColor()])
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <GameMap variant="lessonFarm" initialCoins={initialCoins} playerColor={playerColor} />
    </div>
  )
}
