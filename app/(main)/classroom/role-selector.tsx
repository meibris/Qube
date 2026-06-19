"use client"

import { GraduationCap, BookOpen, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

type Role = "teacher" | "student" | "other"

type Props = {
    onSelect: (role: Role) => void
}

const roles: { value: Role; label: string; icon: React.ReactNode; description: string }[] = [
    {
        value: "teacher",
        label: "Teacher",
        icon: <GraduationCap className="h-10 w-10" />,
        description: "Create and manage a classroom",
    },
    {
        value: "student",
        label: "Student",
        icon: <BookOpen className="h-10 w-10" />,
        description: "Join your teacher's classroom",
    },
    {
        value: "other",
        label: "Other",
        icon: <Users className="h-10 w-10" />,
        description: "Parent or guardian",
    },
]

export const RoleSelector = ({ onSelect }: Props) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 -mt-16">
            <h1 className="text-3xl font-bold text-neutral-700 mb-2">Are you a...</h1>
            <p className="text-neutral-500 mb-10">Select your role to get started</p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
                {roles.map((role) => (
                    <button
                        key={role.value}
                        onClick={() => onSelect(role.value)}
                        className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-neutral-200 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer group"
                    >
                        <div className="text-neutral-400 group-hover:text-green-500 transition-colors">
                            {role.icon}
                        </div>
                        <span className="text-xl font-bold text-neutral-700">{role.label}</span>
                        <span className="text-sm text-neutral-500 text-center">{role.description}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
