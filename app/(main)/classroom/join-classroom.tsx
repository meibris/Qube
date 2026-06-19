"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { joinClassroom } from "@/actions/classroom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
    role: "student" | "other"
}

export const JoinClassroom = ({ role }: Props) => {
    const router = useRouter()
    const [code, setCode] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Format as user types: auto-insert dash after 3 chars
        const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
        if (raw.length <= 3) {
            setCode(raw)
        } else {
            setCode(`${raw.slice(0, 3)}-${raw.slice(3, 6)}`)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const clean = code.replace(/[^A-Z0-9]/g, "")
        if (clean.length !== 6) {
            setError("Please enter a valid 6-character code.")
            return
        }
        setError(null)
        startTransition(async () => {
            const result = await joinClassroom(code, role)
            if (result && "error" in result) {
                setError(result.error)
            }
        })
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 -mt-16">
            <div className="w-full max-w-md text-center">
                <h1 className="text-3xl font-bold text-neutral-700 mb-2">Join a classroom</h1>
                <p className="text-neutral-500 mb-10">
                    Enter the code your teacher gave you.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                    <Input
                        value={code}
                        onChange={handleCodeChange}
                        placeholder="ABC-123"
                        className="text-center text-2xl tracking-widest font-mono h-14 max-w-[220px]"
                        maxLength={7}
                        autoFocus
                    />

                    {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        variant="primary"
                        disabled={isPending || code.replace(/[^A-Z0-9]/g, "").length !== 6}
                        className="w-full max-w-[220px]"
                    >
                        {isPending ? "Joining..." : "Join classroom"}
                    </Button>
                </form>

                <button
                    onClick={() => router.push("/learn")}
                    className="mt-6 text-sm text-neutral-400 hover:text-neutral-500 transition-colors"
                >
                    Continue without a classroom
                </button>
            </div>
        </div>
    )
}
