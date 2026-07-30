"use client"

import { useState } from "react"
import { lockedPlantsFor, SEED_PACK_COST, SEED_PACK_SIZE, SEEDS_NEEDED, type PlantId } from "@/lib/farm-plot"

export const FARM_BREAD_COST = 15

interface FarmMarketProps {
  coins: number
  seedsOwned: number
  assignedPlant: PlantId | null
  onBuySeedPack: () => void
  onBuyBread: () => void
  onClose: () => void
}

type Category = "farm" | "food"

function ItemCard({
  icon, name, desc, cost, coins, disabled, doneLabel, onBuy,
}: {
  icon: string; name: string; desc: string; cost: number; coins: number
  disabled?: boolean; doneLabel?: string; onBuy: () => void
}) {
  const canAfford = coins >= cost
  const isDone = !!disabled && !!doneLabel
  const isImageIcon = icon.startsWith("/")
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3">
      <div className="text-3xl w-10 h-10 flex items-center justify-center shrink-0">
        {isImageIcon ? <img src={icon} alt="" className="w-7 h-7" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-sm">{name}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <button
        type="button"
        disabled={disabled || !canAfford}
        onClick={onBuy}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
          isDone
            ? "bg-green-100 text-green-700 cursor-default"
            : disabled || !canAfford
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-white cursor-pointer"
        }`}
      >
        {isDone ? doneLabel : <><img src="/coin.svg" alt="" className="w-3.5 h-3.5" /> {cost}</>}
      </button>
    </div>
  )
}

function LockedPlantCard({ emoji, name }: { emoji: string; name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 opacity-70">
      <div className="text-3xl w-10 text-center shrink-0 grayscale">{emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-500 text-sm">{name}</p>
        <p className="text-xs text-slate-400">🔒 Unlocks with more experience</p>
      </div>
    </div>
  )
}

export function FarmMarket({ coins, seedsOwned, assignedPlant, onBuySeedPack, onBuyBread, onClose }: FarmMarketProps) {
  const [tab, setTab] = useState<Category>("farm")
  const seedsFull = seedsOwned >= SEEDS_NEEDED

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[92vw] max-w-md bg-white rounded-2xl shadow-2xl border-2 border-emerald-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-500 text-white">
          <h2 className="font-extrabold text-lg">🏪 Market</h2>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm bg-white/20 rounded-full px-3 py-1 flex items-center gap-1">
              <img src="/coin.svg" alt="" className="w-4 h-4" /> {coins}
            </span>
            <button type="button" onClick={onClose} className="text-white/90 hover:text-white text-xl leading-none cursor-pointer">✕</button>
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          {(["farm", "food"] as Category[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setTab(c)}
              className={`flex-1 py-2 text-sm font-bold uppercase tracking-wide cursor-pointer transition-colors ${
                tab === c ? "text-emerald-600 border-b-2 border-emerald-500" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {c === "farm" ? "🌾 Farm" : "🍞 Food"}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {tab === "farm" && (
            <>
              <ItemCard
                icon="🌾" name={`Seed Pack (${SEED_PACK_SIZE} seeds)`} desc={`You have ${seedsOwned}/${SEEDS_NEEDED} seeds.`}
                cost={SEED_PACK_COST} coins={coins} disabled={seedsFull} doneLabel="✅ Full stock" onBuy={onBuySeedPack}
              />
              {lockedPlantsFor(assignedPlant).map((p) => (
                <LockedPlantCard key={p.id} emoji={p.emoji} name={p.name} />
              ))}
            </>
          )}
          {tab === "food" && (
            <ItemCard
              icon="/bread.svg" name="Fresh Bread" desc="Fully restores your energy. Eat it right away."
              cost={FARM_BREAD_COST} coins={coins} onBuy={onBuyBread}
            />
          )}
        </div>
      </div>
    </div>
  )
}
