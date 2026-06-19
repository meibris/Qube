"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { createClassroom } from "@/actions/classroom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"

type SchoolResult = { name: string; city: string; state: string }

const EMOJI_OPTIONS = [
    "📚", "🔬", "🧮", "🎓", "🌍", "💡", "🏫", "🧪", "📐", "🖊️",
    "🌱", "🦋", "🎨", "🔭", "📊", "💰", "🏦", "📈", "🎯", "⭐",
]

type Props = {
    onCreated: (code: string) => void
}

export const CreateClassroom = ({ onCreated }: Props) => {
    const [name, setName] = useState("")
    const [emoji, setEmoji] = useState("📚")
    const [school, setSchool] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [schoolLoading, setSchoolLoading] = useState(false)
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Debounced school search
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (school.trim().length < 2) {
            setSchoolResults([])
            setShowDropdown(false)
            return
        }
        setSchoolLoading(true)
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/schools?q=${encodeURIComponent(school.trim())}`)
                const data: SchoolResult[] = await res.json()
                setSchoolResults(data)
                setShowDropdown(data.length > 0)
            } catch {
                setSchoolResults([])
            } finally {
                setSchoolLoading(false)
            }
        }, 300)
    }, [school])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const selectSchool = (s: SchoolResult) => {
        setSchool(s.name + (s.city ? `, ${s.city}` : "") + (s.state ? `, ${s.state}` : ""))
        setShowDropdown(false)
        setSchoolResults([])
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !school.trim()) {
            setError("Please fill in all fields.")
            return
        }
        setError(null)
        startTransition(async () => {
            const result = await createClassroom(name.trim(), emoji, school.trim())
            if ("error" in result) {
                setError(result.error)
            } else {
                onCreated(result.code)
            }
        })
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 -mt-16">
            <div className="w-full max-w-lg">
                <h1 className="text-3xl font-bold text-neutral-700 mb-2">Create a classroom</h1>
                <p className="text-neutral-500 mb-8">
                    Set up your classroom and share the code with your students.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-semibold text-neutral-600 mb-1 block">
                            Classroom name
                        </label>
                        <Input
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            placeholder="e.g. Period 3 Finance"
                            maxLength={60}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-neutral-600 mb-2 block">
                            Classroom icon
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map((e) => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => setEmoji(e)}
                                    className={`text-2xl w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                                        emoji === e
                                            ? "border-green-500 bg-green-50"
                                            : "border-neutral-200 hover:border-neutral-400"
                                    }`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <label className="text-sm font-semibold text-neutral-600 mb-1 block">
                            School
                        </label>
                        <Input
                            value={school}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchool(e.target.value)}
                            onFocus={() => schoolResults.length > 0 && setShowDropdown(true)}
                            placeholder="Search your school..."
                            maxLength={120}
                            autoComplete="off"
                        />
                        {schoolLoading && (
                            <p className="text-xs text-neutral-400 mt-1">Searching...</p>
                        )}
                        {showDropdown && schoolResults.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden">
                                {schoolResults.map((s, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onMouseDown={() => selectSchool(s)}
                                        className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 transition-colors"
                                    >
                                        <p className="font-semibold text-sm text-neutral-800">{s.name}</p>
                                        {(s.city || s.state) && (
                                            <p className="text-xs text-neutral-400">{[s.city, s.state].filter(Boolean).join(", ")}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        variant="primary"
                        disabled={isPending}
                        className="mt-2"
                    >
                        {isPending ? "Creating..." : "Create classroom"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
