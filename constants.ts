export const POINTS_TO_REFILL   = 10
export const POINTS_TO_FREEZE   = 50   // cost of one streak freeze in shop
export const MAX_STREAK_FREEZES = 3

export const quests = [
  {
    title: "Gain 50 XP",
    value: 50,
    type: "xp" as const,
    icon: "/points.svg",
    emoji: null as string | null,
  },
  {
    title: "Collect 70 Berries",
    value: 70,
    type: "berries" as const,
    icon: "/Berry.png",
    emoji: null as string | null,
  },
  {
    title: "Collect 30 Coins",
    value: 30,
    type: "coins" as const,
    icon: null as string | null,
    emoji: "🪙",
  },
]