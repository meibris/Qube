"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronDown, ChevronUp } from "lucide-react"
import { saveCharacterData } from "@/actions/character"

// ─── Data ─────────────────────────────────────────────────────────────────────

const BG_COLORS = [
  { label: "Sky Blue",   value: "#bfdbfe" },
  { label: "Mint Green", value: "#bbf7d0" },
  { label: "Pink",       value: "#fbcfe8" },
  { label: "Sunshine",   value: "#fef08a" },
  { label: "Lavender",   value: "#ddd6fe" },
  { label: "Peach",      value: "#fed7aa" },
  { label: "White",      value: "#f8fafc" },
  { label: "Slate",      value: "#e2e8f0" },
]

const CATEGORIES = [
  { name: "Cats",            images: ["/Cat1.svg",           "/Cat2.svg",           "/Cat3.svg",           "/Cat4.svg"          ] },
  { name: "Dogs",            images: ["/Dog1.svg",           "/Dog2.svg",           "/Dog3.svg",           "/Dog4.svg"          ] },
  { name: "Chickens",        images: ["/Chicken1.svg",       "/Chicken2.svg",       "/Chicken3.svg",       "/Chicken4.svg"      ] },
  { name: "Food",            images: ["/Food1.svg",          "/Food2.svg",          "/Food3.svg",          "/Food4.svg"         ] },
  { name: "Fruits",          images: ["/Fruit1.svg",         "/Fruit2.svg",         "/Fruit3.svg",         "/Fruit4.svg"        ] },
  { name: "Game Characters", images: ["/GameCharacter1.svg", "/GameCharacter2.svg", "/GameCharacter3.svg", "/GameCharacter4.svg"] },
  { name: "Ocean Animals",   images: ["/OceanAnimals1.svg",  "/OceanAnimals2.svg",  "/OceanAnimals3.svg",  "/OceanAnimals4.svg" ] },
]

// ─── Sub-components ────────────────────────────────────────────────────────────

function ProfileCircle({ image, bgColor }: { image: string; bgColor: string }) {
  return (
    <div
      className="w-52 h-52 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white overflow-hidden shrink-0"
      style={{ backgroundColor: bgColor }}
    >
      {image ? (
        <Image src={image} alt="Profile" width={160} height={160} className="object-contain" />
      ) : (
        <span className="text-gray-400 text-sm">Pick an image</span>
      )}
    </div>
  )
}

function CategoryDropdown({
  category,
  selected,
  onSelect,
}: {
  category: typeof CATEGORIES[number]
  selected: string
  onSelect: (img: string) => void
}) {
  const [open, setOpen] = useState(false)
  const isAnySelected = category.images.includes(selected)

  return (
    <div className="rounded-2xl border-2 border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* Header row — click to open/close */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        {/* Preview of first image */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: isAnySelected ? "#ddd6fe" : "#f1f5f9" }}
        >
          <Image
            src={category.images[0]}
            alt={category.name}
            width={30}
            height={30}
            className="object-contain"
          />
        </div>
        <span className="font-semibold text-gray-700 flex-1 text-left">
          {category.name}
          {isAnySelected && (
            <span className="ml-2 text-xs text-green-500 font-normal">✓ selected</span>
          )}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Image grid — visible when open */}
      {open && (
        <div className="grid grid-cols-4 gap-2 px-4 pb-4 pt-2 border-t border-gray-100">
          {category.images.map((img) => {
            const isSelected = img === selected
            return (
              <button
                key={img}
                type="button"
                onClick={() => { onSelect(img); setOpen(false) }}
                className={`
                  group relative rounded-xl p-2 flex items-center justify-center transition-all
                  ${isSelected
                    ? "bg-green-100 ring-2 ring-green-400"
                    : "bg-gray-50 hover:bg-gray-200"
                  }
                `}
              >
                {/* Darkening overlay on hover */}
                <div className="absolute inset-0 rounded-xl bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                <Image
                  src={img}
                  alt={img}
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CharacterBuilder() {
  const router = useRouter()
  const [saving, setSaving]       = useState(false)
  const [selectedImage, setSelectedImage] = useState(CATEGORIES[0].images[0])
  const [bgColor, setBgColor]     = useState(BG_COLORS[0].value)

  async function handleSave() {
    setSaving(true)
    const data = { selectedImage, bgColor, type: "profile-picture" }
    await saveCharacterData(JSON.stringify(data))
    router.push("/learn")
  }

  return (
    <div
      className="w-full min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)" }}
    >
      {/* Sticky header */}
      <div className="w-full px-6 py-4 border-b bg-white/80 backdrop-blur shadow-sm sticky top-0 z-10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <span className="text-white text-lg font-bold">✦</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Choose Your Profile Picture</h1>
          <p className="text-sm text-gray-500">Pick an image and background color for your avatar!</p>
        </div>
      </div>

      {/* Body — 40/60 split */}
      <div className="flex flex-col lg:flex-row flex-1 max-w-5xl mx-auto w-full p-6 gap-8">

        {/* LEFT — 40% — profile preview, sticky on desktop */}
        <div className="flex flex-col items-center justify-center gap-4 lg:w-2/5 lg:sticky lg:top-24 lg:self-start">
          <ProfileCircle image={selectedImage} bgColor={bgColor} />
          <p className="text-sm text-gray-400 italic text-center">Your avatar updates as you pick!</p>
        </div>

        {/* RIGHT — 60% — dropdowns */}
        <div className="flex flex-col gap-4 lg:w-3/5 pb-8">

          {/* ── Background Color ── */}
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Background Color</p>
          <div className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Background Color</label>
            <div className="grid grid-cols-4 gap-2">
              {BG_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setBgColor(c.value)}
                  className={`
                    group relative rounded-xl h-12 flex items-center justify-center text-xs font-medium transition-all
                    ${bgColor === c.value ? "ring-2 ring-green-400 scale-105" : "hover:scale-105"}
                  `}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {/* Darkening hover overlay */}
                  <div className="absolute inset-0 rounded-xl bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                  {bgColor === c.value && <span className="text-green-700 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Profile Image Categories ── */}
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-2">Profile</p>
          {CATEGORIES.map((cat) => (
            <CategoryDropdown
              key={cat.name}
              category={cat}
              selected={selectedImage}
              onSelect={setSelectedImage}
            />
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg shadow-lg transition-all"
          >
            {saving ? "Saving..." : "Save & Start Learning! 🎉"}
          </button>
        </div>
      </div>
    </div>
  )
}
