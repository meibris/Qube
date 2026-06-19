"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { saveCharacterData } from "@/actions/character"

const STORAGE_KEY = "income_profile_prompt_dismissed"
const DEFAULT_PROFILE = JSON.stringify({
  selectedImage: "/Cat1.svg",
  bgColor: "#bfdbfe",
  type: "profile-picture",
})

interface Props {
  hasProfile: boolean
  isIncomeCourse: boolean
}

export function IncomeProfilePrompt({ hasProfile, isIncomeCourse }: Props) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isIncomeCourse || hasProfile) return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setShow(true)
    }
  }, [isIncomeCourse, hasProfile])

  async function handleUseDefault() {
    setLoading(true)
    try {
      await saveCharacterData(DEFAULT_PROFILE)
      localStorage.setItem(STORAGE_KEY, "1")
      setShow(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  function handleGoToProfile() {
    localStorage.setItem(STORAGE_KEY, "1")
    router.push("/profile#profile-picture")
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col gap-5 items-center text-center">
        <div className="text-5xl">🎨</div>
        <h2 className="text-2xl font-extrabold text-gray-800">Set Up Your Profile!</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Before you dive into the Income unit, why not pick a profile picture and make this adventure your own?
        </p>
        <button
          onClick={handleGoToProfile}
          className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-base shadow-md transition-all"
        >
          Create a profile
        </button>
        <button
          onClick={handleUseDefault}
          disabled={loading}
          className="w-full py-3 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 active:scale-95 disabled:opacity-60 text-gray-600 font-semibold text-sm transition-all"
        >
          {loading ? "Setting up..." : "Use default profile"}
        </button>
      </div>
    </div>
  )
}
