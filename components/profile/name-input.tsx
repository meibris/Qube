"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveUserName } from "@/actions/character"

interface Props {
  initialName: string
  locked: boolean
}

export function NameInput({ initialName, locked }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await saveUserName(name)
      router.refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (locked) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Display Name</label>
        <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3">
          <span className="text-sm text-gray-400 italic">Complete the first lesson to set your display name!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Display Name</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Enter your display name..."
          className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-green-400 transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-sm transition-all active:scale-95"
        >
          {saved ? "Saved!" : saving ? "..." : "Save"}
        </button>
      </div>
    </div>
  )
}
