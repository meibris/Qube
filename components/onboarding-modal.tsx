"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { saveCharacterData } from "@/actions/character"
import { joinClassroomInline } from "@/actions/classroom"

// ── Avatar pool ───────────────────────────────────────────────────────────────
const ALL_IMAGES = [
  "/Cat1.svg", "/Cat2.svg", "/Cat3.svg", "/Cat4.svg",
  "/Dog1.svg", "/Dog2.svg", "/Dog3.svg", "/Dog4.svg",
  "/Chicken1.svg", "/Chicken2.svg", "/Chicken3.svg", "/Chicken4.svg",
  "/Food1.svg", "/Food2.svg", "/Food3.svg", "/Food4.svg",
  "/Fruit1.svg", "/Fruit2.svg", "/Fruit3.svg", "/Fruit4.svg",
  "/GameCharacter1.svg", "/GameCharacter2.svg", "/GameCharacter3.svg", "/GameCharacter4.svg",
  "/OceanAnimals1.svg", "/OceanAnimals2.svg", "/OceanAnimals3.svg", "/OceanAnimals4.svg",
]
const BG_COLORS = ["#bfdbfe", "#bbf7d0", "#fde68a", "#fecaca", "#ddd6fe", "#fed7aa", "#cffafe"]

function randomAvatar() {
  return {
    img: ALL_IMAGES[Math.floor(Math.random() * ALL_IMAGES.length)],
    bg: BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)],
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Step = "classroom" | "avatar" | "done"
type ClassroomView = "choose" | "join"

interface Props {
  hasRole: boolean
  hasCharacterData: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────
export function OnboardingModal({ hasRole, hasCharacterData }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<Step>("done") // resolved after mount
  const [classroomView, setClassroomView] = useState<ClassroomView>("choose")
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState("")
  const [loading, setLoading] = useState(false)
  const [avatar] = useState(randomAvatar)

  // Resolve initial step client-side (needs localStorage)
  useEffect(() => {
    const classroomSkipped = localStorage.getItem("qube_classroom_skipped") === "1"
    if (!hasRole && !classroomSkipped) {
      setStep("classroom")
    } else if (!hasCharacterData) {
      setStep("avatar")
    } else {
      setStep("done")
    }
    setMounted(true)
  }, [hasRole, hasCharacterData])

  if (!mounted || step === "done") return null

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const skipClassroom = () => {
    localStorage.setItem("qube_classroom_skipped", "1")
    if (!hasCharacterData) setStep("avatar")
    else setStep("done")
  }

  const goTeacher = () => {
    router.push("/classroom")
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) { setJoinError("Enter your classroom code first."); return }
    setLoading(true)
    setJoinError("")
    const result = await joinClassroomInline(joinCode.trim(), "student")
    setLoading(false)
    if ("error" in result) { setJoinError(result.error); return }
    if (!hasCharacterData) setStep("avatar")
    else setStep("done")
  }

  const useAvatar = async () => {
    setLoading(true)
    await saveCharacterData(JSON.stringify({ selectedImage: avatar.img, bgColor: avatar.bg, type: "profile-picture" }))
    setLoading(false)
    setStep("done")
  }

  const chooseOwn = () => {
    router.push("/profile")
  }

  const skipAvatar = async () => {
    // Assign the random avatar so they always have one
    await saveCharacterData(JSON.stringify({ selectedImage: avatar.img, bgColor: avatar.bg, type: "profile-picture" }))
    setStep("done")
  }

  // ── Classroom step ────────────────────────────────────────────────────────────
  if (step === "classroom") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">

          {classroomView === "choose" && (
            <>
              <div className="text-center">
                <div className="text-5xl mb-3">👋</div>
                <h2 className="text-2xl font-extrabold text-slate-700">Welcome to Qube!</h2>
                <p className="text-slate-500 mt-2 text-sm">Are you part of a classroom?</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={goTeacher}
                  className="w-full py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-base border-b-4 border-sky-600 active:border-b-0 transition-all flex items-center gap-3 justify-center"
                >
                  <span className="text-xl">👩‍🏫</span> I&apos;m a Teacher
                </button>

                <button
                  onClick={() => setClassroomView("join")}
                  className="w-full py-3 px-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base border-b-4 border-green-600 active:border-b-0 transition-all flex items-center gap-3 justify-center"
                >
                  <span className="text-xl">🎒</span> Join with a Code
                </button>

                <button
                  onClick={skipClassroom}
                  className="w-full py-3 px-4 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-400 font-semibold text-sm transition-colors"
                >
                  Do it later →
                </button>
              </div>
            </>
          )}

          {classroomView === "join" && (
            <>
              <div>
                <button
                  onClick={() => { setClassroomView("choose"); setJoinError("") }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold mb-4 flex items-center gap-1"
                >
                  ← Back
                </button>
                <div className="text-center">
                  <div className="text-4xl mb-3">🎒</div>
                  <h2 className="text-xl font-extrabold text-slate-700">Join a Classroom</h2>
                  <p className="text-slate-500 mt-1 text-sm">Ask your teacher for the classroom code.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="ABC-123"
                  maxLength={7}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-slate-200 text-center text-xl font-bold tracking-widest text-slate-700 focus:outline-none focus:border-sky-400"
                />
                {joinError && <p className="text-red-500 text-sm text-center">{joinError}</p>}

                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold text-base border-b-4 border-sky-600 active:border-b-0 transition-all"
                >
                  {loading ? "Joining…" : "Join!"}
                </button>

                <button
                  onClick={skipClassroom}
                  className="w-full py-2 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-400 font-semibold text-sm transition-colors"
                >
                  Do it later →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Avatar step ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 flex flex-col gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-700">Pick your avatar! 🎨</h2>
          <p className="text-slate-500 mt-2 text-sm">We picked one for you — keep it or choose your own.</p>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: avatar.bg }}
          >
            <Image src={avatar.img} alt="Your avatar" width={80} height={80} className="object-contain" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={useAvatar}
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-base border-b-4 border-green-600 active:border-b-0 transition-all"
          >
            {loading ? "Saving…" : "✓ Use This One!"}
          </button>

          <button
            onClick={chooseOwn}
            className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-base border-b-4 border-sky-600 active:border-b-0 transition-all"
          >
            🎨 Choose My Own
          </button>

          <button
            onClick={skipAvatar}
            className="w-full py-2 rounded-2xl bg-transparent hover:bg-slate-100 text-slate-400 font-semibold text-sm transition-colors"
          >
            Do it later →
          </button>
        </div>
      </div>
    </div>
  )
}
