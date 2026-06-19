"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronDown, ChevronUp } from "lucide-react"
import { saveCharacterData } from "@/actions/character"

const CATEGORIES = [
  { name: "Cats",          images: ["/Cat1.svg",           "/Cat2.svg",           "/Cat3.svg",           "/Cat4.svg"          ] },
  { name: "Dogs",          images: ["/Dog1.svg",           "/Dog2.svg",           "/Dog3.svg",           "/Dog4.svg"          ] },
  { name: "Chickens",      images: ["/Chicken1.svg",       "/Chicken2.svg",       "/Chicken3.svg",       "/Chicken4.svg"      ] },
  { name: "Food",          images: ["/Food1.svg",          "/Food2.svg",          "/Food3.svg",          "/Food4.svg"         ] },
  { name: "Fruits",        images: ["/Fruit1.svg",         "/Fruit2.svg",         "/Fruit3.svg",         "/Fruit4.svg"        ] },
  { name: "Game Items",    images: ["/GameCharacter1.svg", "/GameCharacter2.svg", "/GameCharacter3.svg", "/GameCharacter4.svg"] },
  { name: "Ocean Animals", images: ["/OceanAnimals1.svg",  "/OceanAnimals2.svg",  "/OceanAnimals3.svg",  "/OceanAnimals4.svg" ] },
]

const DEFAULT_IMAGE = CATEGORIES[0].images[0]
const DEFAULT_BG = "#bfdbfe"

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: isAnySelected ? "#ddd6fe" : "#f1f5f9" }}
        >
          <Image src={category.images[0]} alt={category.name} width={30} height={30} className="object-contain" />
        </div>
        <span className="font-semibold text-gray-700 flex-1 text-left">
          {category.name}
          {isAnySelected && <span className="ml-2 text-xs text-green-500 font-normal">✓ selected</span>}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="grid grid-cols-4 gap-2 px-4 pb-4 pt-2 border-t border-gray-100">
          {category.images.map((img) => (
            <button
              key={img}
              type="button"
              onClick={() => { onSelect(img); setOpen(false) }}
              className={`group relative rounded-xl p-2 flex items-center justify-center transition-all ${
                img === selected ? "bg-green-100 ring-2 ring-green-400" : "bg-gray-50 hover:bg-gray-200"
              }`}
            >
              <div className="absolute inset-0 rounded-xl bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
              <Image src={img} alt={img} width={56} height={56} className="object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  initialImage?: string
  initialBgColor?: string
}

export function ProfilePicturePicker({ initialImage, initialBgColor }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedImage, setSelectedImage] = useState(initialImage ?? DEFAULT_IMAGE)
  const [bgColor, setBgColor] = useState(initialBgColor ?? DEFAULT_BG)

  // Sync state when server sends fresh props
  useEffect(() => {
    setSelectedImage(initialImage ?? DEFAULT_IMAGE)
    setBgColor(initialBgColor ?? DEFAULT_BG)
  }, [initialImage, initialBgColor])

  async function handleSave() {
    setSaving(true)
    try {
      const data = { selectedImage, bgColor, type: "profile-picture" }
      await saveCharacterData(JSON.stringify(data))
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      {/* LEFT 40% — live preview */}
      <div className="flex flex-col items-center gap-4 lg:w-2/5 lg:sticky lg:top-8 lg:self-start">
        <div
          className="w-72 h-72 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white overflow-hidden"
          style={{ backgroundColor: bgColor }}
        >
          <Image src={selectedImage} alt="Profile preview" width={270} height={270} className="object-contain" />
        </div>
        <p className="text-sm text-gray-400 italic text-center">Create your profile!</p>
      </div>

      {/* RIGHT 60% — pickers */}
      <div className="flex flex-col gap-4 lg:w-3/5">
        {/* Background color — native color picker */}
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Background Color</p>
        <div className="rounded-2xl border-2 border-gray-100 bg-white shadow-sm p-4 flex items-center gap-4">
          <label
            className="relative cursor-pointer group"
            title="Pick a background color"
          >
            <div
              className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg ring-2 ring-gray-200 group-hover:ring-green-400 transition-all"
              style={{ backgroundColor: bgColor }}
            />
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700">Click to open color picker</span>
            <span className="text-xs font-mono text-gray-400">{bgColor}</span>
          </div>
        </div>

        {/* Category dropdowns */}
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-2">Profile Image</p>
        {CATEGORIES.map((cat) => (
          <CategoryDropdown key={cat.name} category={cat} selected={selectedImage} onSelect={setSelectedImage} />
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-60 text-white font-bold text-lg shadow-lg transition-all"
        >
          {saving ? "Saving..." : "Save Profile Picture"}
        </button>
      </div>
    </div>
  )
}
