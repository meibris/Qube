"use client"

import { useState, useTransition } from "react"
import { School } from "lucide-react"
import { joinClassroom } from "@/actions/classroom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Props = {
    role: "student" | "other"
}

export const ClassroomJoinCard = ({ role }: Props) => {
    const [code, setCode] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            setError("Enter a valid 6-character code.")
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
        <div className="rounded-2xl p-4 flex flex-col gap-3 bg-green-50 col-span-2">
            <div className="flex items-center gap-2">
                <School className="w-6 h-6 text-green-500" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Classroom</p>
            </div>
            <p className="text-sm text-gray-500">Enter your teacher&apos;s class code to join.</p>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="ABC-123"
                    maxLength={7}
                    className="text-center font-mono tracking-widest w-32 h-10"
                />
                <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isPending || code.replace(/[^A-Z0-9]/g, "").length !== 6}
                >
                    {isPending ? "Joining..." : "Join"}
                </Button>
            </form>
            {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
    )
}
